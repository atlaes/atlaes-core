import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pure test: Stripe and the database are mocked.
//   pnpm vitest run src/services/payment.test.ts

const mocks = vi.hoisted(() => ({
  env: { STRIPE_SECRET_KEY: 'sk_test_unit' as string | undefined },
  sessionsList: vi.fn(),
  sessionsCreate: vi.fn(),
  claimRows: [] as unknown[],
  updateSet: vi.fn(),
  insertValues: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = {
      sessions: { list: mocks.sessionsList, create: mocks.sessionsCreate },
    };
  },
}));
vi.mock('../utils/env', () => ({ env: mocks.env }));
vi.mock('../utils/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {} },
}));
vi.mock('../utils/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => mocks.claimRows }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => {
        mocks.updateSet(values);
        return { where: async () => undefined };
      },
    }),
    insert: () => ({ values: mocks.insertValues }),
  },
}));

import { PaymentConfigError, PaymentService } from './payment';

const claimId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const checkout = {
  claimId,
  userId,
  userEmail: 'test-pay@example.com',
  successUrl: 'https://app.example/ok',
  cancelUrl: 'https://app.example/cancel',
};

function listBy(byStatus: Record<string, unknown[]>) {
  mocks.sessionsList.mockImplementation(async (params: { status: string }) => ({
    data: byStatus[params.status] ?? [],
  }));
}

describe('PaymentService.createCheckoutSession', () => {
  beforeEach(() => {
    mocks.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mocks.claimRows.length = 0;
    mocks.claimRows.push({ id: claimId, userId, paymentStatus: 'pending' });
    mocks.sessionsList.mockReset();
    mocks.sessionsCreate.mockReset();
    mocks.updateSet.mockReset();
    mocks.insertValues.mockReset();
    mocks.insertValues.mockResolvedValue(undefined);
  });

  it('reuses the Checkout session that is already open for the claim', async () => {
    listBy({
      open: [
        {
          id: 'cs_other',
          client_reference_id: 'some-other-claim',
          status: 'open',
          url: 'https://checkout.stripe.com/other',
        },
        {
          id: 'cs_open',
          client_reference_id: claimId,
          status: 'open',
          url: 'https://checkout.stripe.com/open',
        },
      ],
    });

    const result = await PaymentService.createCheckoutSession(checkout);

    expect(result).toEqual({
      url: 'https://checkout.stripe.com/open',
      sessionId: 'cs_open',
      reused: true,
    });
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a session when none is open', async () => {
    listBy({});
    mocks.sessionsCreate.mockResolvedValue({
      id: 'cs_new',
      url: 'https://checkout.stripe.com/new',
    });

    const result = await PaymentService.createCheckoutSession(checkout);

    expect(result).toEqual({
      url: 'https://checkout.stripe.com/new',
      sessionId: 'cs_new',
      reused: false,
    });
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: claimId,
        customer_email: checkout.userEmail,
      })
    );
  });

  it('records a session that was paid but not yet verified, and refuses a second payment', async () => {
    listBy({
      complete: [
        {
          id: 'cs_paid',
          client_reference_id: claimId,
          status: 'complete',
          payment_status: 'paid',
          payment_intent: 'pi_123',
        },
      ],
      open: [
        {
          id: 'cs_open',
          client_reference_id: claimId,
          status: 'open',
          url: 'https://checkout.stripe.com/open',
        },
      ],
    });

    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow('Payment already completed for this claim');

    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'paid',
        stripePaymentId: 'pi_123',
      })
    );
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment_completed',
        resourceId: claimId,
      })
    );
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses a claim that is already paid without calling Stripe', async () => {
    mocks.claimRows.length = 0;
    mocks.claimRows.push({ id: claimId, userId, paymentStatus: 'paid' });

    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow('Payment already completed for this claim');
    expect(mocks.sessionsList).not.toHaveBeenCalled();
  });

  it('gives a clear configuration error when STRIPE_SECRET_KEY is unset', async () => {
    mocks.env.STRIPE_SECRET_KEY = undefined;

    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toBeInstanceOf(PaymentConfigError);
    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow('STRIPE_SECRET_KEY is unset');
  });
});
