// Daily waiting-period reminder for guide leads (sst.aws.Cron in
// resources/services/index.ts). Replaces checkV0900Reminders() /
// checkGuideReminders() from the Apps Script.
import { processDueReminders } from './services/leads';
import { logger, toErrorMeta } from './utils/logger';

export const handler = async (_event: unknown) => {
  const startedAt = new Date();
  try {
    const result = await processDueReminders(startedAt);
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        ranAt: startedAt.toISOString(),
        ...result,
      }),
    };
  } catch (error) {
    logger.error('Lead reminder cron failed', toErrorMeta(error));
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, ranAt: startedAt.toISOString() }),
    };
  }
};
