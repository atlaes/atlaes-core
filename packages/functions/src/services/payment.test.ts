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
  // Rows the conditional update matched (markProcessing / markFailed).
  updateReturning: [{ id: 'x' }] as unknown[],
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
        return {
          where: () =>
            Object.assign(Promise.resolve(undefined), {
              returning: async () => mocks.updateReturning,
            }),
        };
      },
    }),
    insert: () => ({ values: mocks.insertValues }),
  },
}));

import {
  PAYMENT_PROCESSING_MESSAGE,
  PaymentConfigError,
  PaymentService,
} from './payment';

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

describe('delayed payment methods (SEPA Direct Debit, ...)', () => {
  const session = (payment_status: string) => ({
    id: 'cs_sepa',
    client_reference_id: claimId,
    status: 'complete',
    payment_status,
    payment_intent: 'pi_sepa',
  });
  const event = (type: string, payment_status: string) =>
    ({ type, data: { object: session(payment_status) } }) as any;

  beforeEach(() => {
    mocks.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mocks.claimRows.length = 0;
    mocks.claimRows.push({ id: claimId, userId, paymentStatus: 'pending' });
    mocks.sessionsList.mockReset();
    mocks.sessionsCreate.mockReset();
    mocks.updateSet.mockReset();
    mocks.insertValues.mockReset();
    mocks.insertValues.mockResolvedValue(undefined);
    mocks.updateReturning = [{ id: claimId }];
  });

  it('marks the claim processing when Checkout completes unpaid', async () => {
    await PaymentService.handleWebhookEvent(
      event('checkout.session.completed', 'unpaid')
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'processing' })
    );
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payment_processing_webhook' })
    );
  });

  it('records the payment when the delayed payment succeeds', async () => {
    mocks.claimRows[0] = { id: claimId, userId, paymentStatus: 'processing' };
    await PaymentService.handleWebhookEvent(
      event('checkout.session.async_payment_succeeded', 'paid')
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'paid' })
    );
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payment_completed_async' })
    );
  });

  it('marks the claim failed when the delayed payment fails', async () => {
    mocks.claimRows[0] = { id: claimId, userId, paymentStatus: 'processing' };
    await PaymentService.handleWebhookEvent(
      event('checkout.session.async_payment_failed', 'unpaid')
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'failed',
        stripePaymentId: 'pi_sepa',
      })
    );
  });

  it('lets the client pay again after the delayed payment failed', async () => {
    // Stripe keeps the failed session at complete/unpaid.
    mocks.claimRows[0] = {
      id: claimId,
      userId,
      paymentStatus: 'failed',
      stripePaymentId: 'pi_sepa',
    };
    listBy({ complete: [session('unpaid')] });
    mocks.sessionsCreate.mockResolvedValue({
      id: 'cs_retry',
      url: 'https://checkout.stripe.com/retry',
    });

    const result = await PaymentService.createCheckoutSession(checkout);

    expect(result).toEqual({
      url: 'https://checkout.stripe.com/retry',
      sessionId: 'cs_retry',
      reused: false,
    });
    expect(mocks.updateSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'processing' })
    );
  });

  it('still refuses a second Checkout when a newer delayed payment is pending', async () => {
    mocks.claimRows[0] = {
      id: claimId,
      userId,
      paymentStatus: 'failed',
      stripePaymentId: 'pi_old',
    };
    listBy({ complete: [session('unpaid')] });
    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow(PAYMENT_PROCESSING_MESSAGE);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('never touches a paid claim', async () => {
    mocks.claimRows[0] = { id: claimId, userId, paymentStatus: 'paid' };
    await PaymentService.handleWebhookEvent(
      event('checkout.session.async_payment_failed', 'unpaid')
    );
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('refuses a second Checkout while a payment is processing', async () => {
    mocks.claimRows[0] = { id: claimId, userId, paymentStatus: 'processing' };
    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow(PAYMENT_PROCESSING_MESSAGE);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses a second Checkout when Stripe has a completed unpaid session', async () => {
    listBy({ complete: [session('unpaid')] });
    await expect(
      PaymentService.createCheckoutSession(checkout)
    ).rejects.toThrow(PAYMENT_PROCESSING_MESSAGE);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'processing' })
    );
  });
});
