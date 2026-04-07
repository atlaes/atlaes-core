import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import { db } from '../utils/db';
import { claimsTable } from '../drizzle/schema/claims';
import { auditLogs } from '../drizzle/schema/shared';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const DEPOSIT_AMOUNT_CENTS = 19900; // €199.00
const CURRENCY = 'eur';

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export class PaymentService {
  /**
   * Create a Stripe Checkout Session for the €199 refundable deposit.
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
  }): Promise<{ url: string; sessionId: string }> {
    const stripe = getStripe();

    // Verify claim exists and belongs to user
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(
        and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
      )
      .limit(1);

    if (!claim) {
      throw new Error('Claim not found');
    }

    if (claim.paymentStatus === 'paid') {
      throw new Error('Payment already completed for this claim');
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

    logger.info(`Checkout session created: ${session.id} for claim: ${claimId}`);

    return { url: session.url, sessionId: session.id };
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
      .where(
        and(eq(claimsTable.id, claimId), eq(claimsTable.userId, userId))
      )
      .limit(1);

    if (!claim) {
      throw new Error('Claim not found or does not belong to user');
    }

    // Already paid — idempotent
    if (claim.paymentStatus === 'paid') {
      return { success: true, claimId, paymentStatus: 'paid' };
    }

    if (session.payment_status !== 'paid') {
      return { success: false, claimId, paymentStatus: session.payment_status };
    }

    // Update claim with payment info
    await db
      .update(claimsTable)
      .set({
        paymentStatus: 'paid',
        stripePaymentId: session.payment_intent as string,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claimsTable.id, claimId));

    // Audit log
    await db.insert(auditLogs).values({
      userId,
      action: 'payment_completed',
      resource: 'claim',
      resourceId: claimId,
      details: {
        sessionId,
        paymentIntent: session.payment_intent,
        amount: DEPOSIT_AMOUNT_CENTS,
        currency: CURRENCY,
      },
    });

    logger.info(`Payment verified for claim: ${claimId}, session: ${sessionId}`);

    return { success: true, claimId, paymentStatus: 'paid' };
  }

  /**
   * Handle Stripe webhook events (idempotent backup for payment verification).
   */
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const claimId = session.client_reference_id;

    if (!claimId) {
      logger.warn('Webhook: session has no client_reference_id');
      return;
    }

    // Idempotent — skip if already paid
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);

    if (!claim) {
      logger.warn(`Webhook: claim not found: ${claimId}`);
      return;
    }

    if (claim.paymentStatus === 'paid') {
      logger.info(`Webhook: claim ${claimId} already paid, skipping`);
      return;
    }

    if (session.payment_status !== 'paid') {
      logger.warn(`Webhook: session not paid, status: ${session.payment_status}`);
      return;
    }

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
      userId: claim.userId,
      action: 'payment_completed_webhook',
      resource: 'claim',
      resourceId: claimId,
      details: {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        amount: DEPOSIT_AMOUNT_CENTS,
        currency: CURRENCY,
      },
    });

    logger.info(`Webhook: payment recorded for claim: ${claimId}`);
  }
}
