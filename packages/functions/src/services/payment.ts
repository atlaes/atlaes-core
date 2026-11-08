import Stripe from 'stripe';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../utils/db';
import { claimsTable } from '../drizzle/schema/claims';
import { auditLogs } from '../drizzle/schema/shared';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const DEPOSIT_AMOUNT_CENTS = 19900; // €199.00
const CURRENCY = 'eur';

/**
 * claims.payment_status while a delayed payment method (SEPA Direct Debit,
 * bank transfer, ...) is on its way: Checkout is complete but Stripe has not
 * confirmed the money yet. 'checkout.session.async_payment_succeeded' then
 * marks it 'paid', '..._failed' marks it 'failed'.
 */
export const PAYMENT_PROCESSING = 'processing';

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}
export const PAYMENT_PROCESSING_MESSAGE =
  'Your payment is being processed by your bank. This can take a few working days; you can continue once it is confirmed.';

/** Payments are switched off: no Stripe key on this stage. */
export class PaymentConfigError extends Error {
  constructor() {
    super(
      'Payments are not configured: STRIPE_SECRET_KEY is unset. Set the ' +
        'STRIPE_SECRET_KEY GitHub secret (deploy workflow) or add it to .env locally.'
    );
    this.name = 'PaymentConfigError';
  }
}

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new PaymentConfigError();
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export class PaymentService {
  /**
   * Create a Stripe Checkout Session for the €199 refundable deposit.
   *
   * One Checkout per claim at a time: Stripe keeps a session open for 24
   * hours, so a second click or a second tab gets the session that is
   * already open instead of another one that could be paid as well. A
   * session that completed before verify-session or the webhook recorded
   * it is recorded here and refused like any paid claim.
   */
  static async createCheckoutSession({
    claimId,
    userId,
    userEmail,
    successUrl,
    cancelUrl,
  }: {
    claimId: string;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; sessionId: string; reused: boolean }> {
    const stripe = getStripe();

    // Verify claim exists and belongs to user
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
      .limit(1);

    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.paymentStatus === 'paid') {
      throw new Error('Payment already completed for this claim');
    }
    if (claim.paymentStatus === PAYMENT_PROCESSING) {
      throw new Error(PAYMENT_PROCESSING_MESSAGE);
    }

    // After a failed delayed payment Stripe keeps that session at
    // complete/unpaid; it must not block a new attempt.
    const failedPaymentIntent =
      claim.paymentStatus === 'failed' ? claim.stripePaymentId : null;
    const existing = await this.findExistingSession(
      stripe,
      claimId,
      userEmail,
      failedPaymentIntent
    );
    if (existing?.status === 'complete' && existing.payment_status === 'paid') {
      await this.recordPayment(claimId, userId, existing, 'payment_completed');
      logger.info(
        `Payment recorded from existing session: ${existing.id} for claim: ${claimId}`
      );
      throw new Error('Payment already completed for this claim');
    }
    // Completed with a delayed method: a second Checkout would charge twice.
    if (
      existing?.status === 'complete' &&
      existing.payment_status === 'unpaid'
    ) {
      await this.markProcessing(
        claimId,
        userId,
        existing,
        'payment_processing'
      );
      throw new Error(PAYMENT_PROCESSING_MESSAGE);
    }
    if (existing?.status === 'open' && existing.url) {
      logger.info(
        `Checkout session reused: ${existing.id} for claim: ${claimId}`
      );
      return { url: existing.url, sessionId: existing.id, reused: true };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail,
      client_reference_id: claimId,
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: 'Company Pension Deposit',
              description:
                'Deposit for Company Pension claim processing and review. Credited toward the service fee.',
            },
            unit_amount: DEPOSIT_AMOUNT_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: {
        claimId,
        userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error('Failed to create Stripe Checkout session');
    }

    logger.info(
      `Checkout session created: ${session.id} for claim: ${claimId}`
    );

    return { url: session.url, sessionId: session.id, reused: false };
  }

  /**
   * The Checkout Session for this claim that is paid or still open, if
   * any. Stripe cannot filter by client_reference_id, so the customer's
   * sessions are listed by e-mail and matched here; paid wins over open.
   * An unpaid session whose delayed payment already failed is skipped.
   */
  private static async findExistingSession(
    stripe: Stripe,
    claimId: string,
    userEmail: string,
    failedPaymentIntent: string | null = null
  ): Promise<Stripe.Checkout.Session | null> {
    for (const status of ['complete', 'open'] as const) {
      const { data } = await stripe.checkout.sessions.list({
        customer_details: { email: userEmail },
        status,
        limit: 20,
      });
      const match = data.find(
        (s) =>
          s.client_reference_id === claimId &&
          !(
            failedPaymentIntent &&
            s.payment_status !== 'paid' &&
            paymentIntentId(s) === failedPaymentIntent
          )
      );
      if (match) return match;
    }
    return null;
  }

  /** Marks the claim paid from a paid session and writes the audit row. */
  private static async recordPayment(
    claimId: string,
    userId: string,
    session: Stripe.Checkout.Session,
    action: string
  ): Promise<void> {
    await db
      .update(claimsTable)
      .set({
        paymentStatus: 'paid',
        stripePaymentId: session.payment_intent as string,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claimsTable.id, claimId));

    await db.insert(auditLogs).values({
      userId,
      action,
      resource: 'claim',
      resourceId: claimId,
      details: {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        amount: DEPOSIT_AMOUNT_CENTS,
        currency: CURRENCY,
      },
    });
  }

  /**
   * Checkout completed with a delayed payment method: the claim waits for
   * Stripe's async result. Never downgrades a paid claim.
   */
  private static async markProcessing(
    claimId: string,
    userId: string,
    session: Stripe.Checkout.Session,
    action: string
  ): Promise<void> {
    const updated = await db
      .update(claimsTable)
      .set({
        paymentStatus: PAYMENT_PROCESSING,
        stripePaymentId: (session.payment_intent as string) ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(claimsTable.id, claimId),
          sql`coalesce(${claimsTable.paymentStatus}, 'pending') not in ('paid', ${PAYMENT_PROCESSING})`,
          // The webhook for this session's failure may arrive before (or a
          // reload of the success URL after) checkout.session.completed:
          // the payment that failed stays failed.
          sql`not (coalesce(${claimsTable.paymentStatus}, 'pending') = 'failed' and coalesce(${claimsTable.stripePaymentId}, '') = ${paymentIntentId(session) ?? ''})`
        )
      )
      .returning({ id: claimsTable.id });
    if (!updated.length) return;
    await db.insert(auditLogs).values({
      userId,
      action,
      resource: 'claim',
      resourceId: claimId,
      details: {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        amount: DEPOSIT_AMOUNT_CENTS,
        currency: CURRENCY,
      },
    });
  }

  /** The delayed payment failed: the client can pay again. */
  private static async markFailed(
    claimId: string,
    userId: string,
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const updated = await db
      .update(claimsTable)
      .set({
        paymentStatus: 'failed',
        // Which payment failed: markProcessing and findExistingSession
        // skip it, so the client can start a new Checkout.
        stripePaymentId: paymentIntentId(session),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(claimsTable.id, claimId),
          sql`coalesce(${claimsTable.paymentStatus}, 'pending') <> 'paid'`
        )
      )
      .returning({ id: claimsTable.id });
    if (!updated.length) return;
    await db.insert(auditLogs).values({
      userId,
      action: 'payment_failed_async',
      resource: 'claim',
      resourceId: claimId,
      details: { sessionId: session.id, paymentIntent: session.payment_intent },
    });
  }

  /**
   * Verify a completed Checkout Session and update claim payment status.
   */
  static async verifySession({
    sessionId,
    userId,
  }: {
    sessionId: string;
    userId: string;
  }): Promise<{ success: boolean; claimId: string; paymentStatus: string }> {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.client_reference_id) {
      throw new Error('Session has no associated claim');
    }

    const claimId = session.client_reference_id;

    // Verify the claim belongs to this user
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId)))
      .limit(1);

    if (!claim) {
      throw new Error('Claim not found or does not belong to user');
    }

    // Already paid — idempotent
    if (claim.paymentStatus === 'paid') {
      return { success: true, claimId, paymentStatus: 'paid' };
    }

    if (
      claim.paymentStatus === 'failed' &&
      session.payment_status !== 'paid' &&
      claim.stripePaymentId === paymentIntentId(session)
    ) {
      return { success: false, claimId, paymentStatus: 'failed' };
    }
    if (session.status === 'complete' && session.payment_status === 'unpaid') {
      await this.markProcessing(claimId, userId, session, 'payment_processing');
      return { success: false, claimId, paymentStatus: PAYMENT_PROCESSING };
    }
    if (session.payment_status !== 'paid') {
      return { success: false, claimId, paymentStatus: session.payment_status };
    }

    await this.recordPayment(claimId, userId, session, 'payment_completed');

    logger.info(
      `Payment verified for claim: ${claimId}, session: ${sessionId}`
    );

    return { success: true, claimId, paymentStatus: 'paid' };
  }

  /**
   * Handle Stripe webhook events (idempotent backup for payment verification).
   */
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (!HANDLED_EVENTS.has(event.type)) {
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const claimId = session.client_reference_id;

    if (!claimId) {
      logger.warn('Webhook: session has no client_reference_id');
      return;
    }

    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);

    if (!claim) {
      logger.warn(`Webhook: claim not found: ${claimId}`);
      return;
    }

    // Idempotent: a paid claim never changes here.
    if (claim.paymentStatus === 'paid') {
      logger.info(`Webhook: claim ${claimId} already paid, skipping`);
      return;
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await this.markFailed(claimId, claim.userId, session);
      logger.warn(`Webhook: delayed payment failed for claim: ${claimId}`);
      return;
    }

    if (session.payment_status === 'paid') {
      await this.recordPayment(
        claimId,
        claim.userId,
        session,
        event.type === 'checkout.session.async_payment_succeeded'
          ? 'payment_completed_async'
          : 'payment_completed_webhook'
      );
      logger.info(`Webhook: payment recorded for claim: ${claimId}`);
      return;
    }

    // checkout.session.completed with a delayed method: money not there yet.
    if (
      event.type === 'checkout.session.completed' &&
      session.payment_status === 'unpaid'
    ) {
      await this.markProcessing(
        claimId,
        claim.userId,
        session,
        'payment_processing_webhook'
      );
      logger.info(`Webhook: delayed payment pending for claim: ${claimId}`);
      return;
    }

    logger.warn(`Webhook: session not paid, status: ${session.payment_status}`);
  }
}

/**
 * Stripe events this service acts on. The EventBridge rule
 * (resources/events/index.ts) and the Stripe event destination must send
 * all three.
 */
export const HANDLED_EVENTS: ReadonlySet<string> = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]);
