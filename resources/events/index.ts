import { vpc } from '../network';
import { postgres } from '../database';

const STRIPE_EVENT_SOURCE =
  'aws.partner/stripe.com/ed_test_61UJ1wWnKXkg5su2316TbDu8SjBCjcQWuI5rJGWrQ5FI';

// Lambda function — sst.aws.Function gives us esbuild bundling + SST link
const stripeWebhookFn = new sst.aws.Function('StripeWebhookHandler', {
  handler: 'packages/functions/src/stripe-webhook.handler',
  runtime: 'nodejs20.x',
  timeout: '30 seconds',
  memory: '256 MB',
  vpc,
  link: [postgres],
  environment: { NODE_ENV: 'production' },
});

// EventBridge rule on the Stripe partner event bus
const rule = new aws.cloudwatch.EventRule('StripeWebhookRule', {
  name: `atlaes-${$app.stage}-stripe-webhook`,
  eventBusName: STRIPE_EVENT_SOURCE,
  eventPattern: JSON.stringify({
    'detail-type': ['checkout.session.completed'],
  }),
});

new aws.lambda.Permission('StripeWebhookPermission', {
  action: 'lambda:InvokeFunction',
  function: stripeWebhookFn.arn,
  principal: 'events.amazonaws.com',
  sourceArn: rule.arn,
});

new aws.cloudwatch.EventTarget('StripeWebhookTarget', {
  rule: rule.name,
  eventBusName: STRIPE_EVENT_SOURCE,
  arn: stripeWebhookFn.arn,
});

export { stripeWebhookFn };
