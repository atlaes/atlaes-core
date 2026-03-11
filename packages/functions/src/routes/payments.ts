import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth';
import { PaymentService } from '../services/payment';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const payments = new Hono();

// ============================================================
// Schemas
// ============================================================

const createCheckoutSchema = z.object({
  claimId: z.string().uuid(),
});

const verifySessionSchema = z.object({
  sessionId: z.string().min(1),
});

// ============================================================
// Create Checkout Session
// ============================================================

payments.post(
  '/create-checkout-session',
  authMiddleware,
  zValidator('json', createCheckoutSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { claimId } = c.req.valid('json');

      const frontendUrl = env.FRONTEND_URL;
      const successUrl = `${frontendUrl}/get-started?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/get-started?payment=cancelled`;

      const result = await PaymentService.createCheckoutSession({
        claimId,
        userId: user.id,
        userEmail: user.email,
        successUrl,
        cancelUrl,
      });

      return c.json({
        success: true,
        url: result.url,
        sessionId: result.sessionId,
      });
    } catch (error) {
      logger.error('Create checkout session error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create checkout session';
      const status = message.includes('already completed') ? 400 : 500;
      return c.json({ success: false, error: message }, status);
    }
  }
);

// ============================================================
// Verify Session (called by frontend after redirect)
// ============================================================

payments.post(
  '/verify-session',
  authMiddleware,
  zValidator('json', verifySessionSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { sessionId } = c.req.valid('json');

      const result = await PaymentService.verifySession({
        sessionId,
        userId: user.id,
      });

      return c.json({
        success: result.success,
        claimId: result.claimId,
        paymentStatus: result.paymentStatus,
      });
    } catch (error) {
      logger.error('Verify session error:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to verify session',
        },
        500
      );
    }
  }
);

// ============================================================
// Stripe Webhook (no auth — Stripe signature verification)
// ============================================================

payments.post('/webhook', async (c) => {
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      logger.warn('Stripe webhook received but keys not configured');
      return c.json({ received: true }, 200);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    await PaymentService.handleWebhookEvent(event);

    return c.json({ received: true }, 200);
  } catch (error) {
    logger.error('Webhook error:', error);
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return c.json({ error: 'Invalid signature' }, 400);
    }
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default payments;
