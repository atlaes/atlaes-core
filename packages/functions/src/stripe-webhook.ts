import type Stripe from 'stripe';
import { PaymentService } from './services/payment';
import { logger } from './utils/logger';

interface EventBridgeStripeEvent {
  version: string;
  id: string;
  source: string;
  'detail-type': string;
  detail: Stripe.Event;
}

export const handler = async (event: EventBridgeStripeEvent) => {
  logger.info('Stripe EventBridge event received', {
    detailType: event['detail-type'],
    stripeEventId: event.detail?.id,
  });
  // No signature verification needed — EventBridge guarantees source authenticity
  // PaymentService.handleWebhookEvent is idempotent (checks claim.paymentStatus === 'paid')
  await PaymentService.handleWebhookEvent(event.detail);
  return { statusCode: 200 };
};
