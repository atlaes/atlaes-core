// Daily cron for the escrow payout e-mails (owner spec 30 Oct 2026; SST
// `sst.aws.Cron`, see resources/services/index.ts). Sends the due
// E1–E5 e-mails and reminders and opens the payout tasks; every case
// action also runs the engine at once, so the cron only catches timers.
import { PayoutEmailService } from './services/payout-emails';
import { logger, toErrorMeta } from './utils/logger';

export const handler = async (_event: unknown) => {
  try {
    const result = await PayoutEmailService.runDaily();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    logger.error('Payout e-mails cron failed', toErrorMeta(error));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payout e-mails cron failed' }),
    };
  }
};
