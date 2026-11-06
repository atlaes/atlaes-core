// Daily cron for the client-update engine (SST `sst.aws.Cron`, see
// resources/services/index.ts). Drafts the scheduled client update ≥ 1
// working day before it is due, opens the senior review at + 6 months,
// keeps the office action current and mails ops the warnings.
// It also runs the law-firm overdue check (pack downloaded, no submission
// date after 7 days → one ops e-mail per case); this function already has
// the ops address and the admin URL that check needs.
import { ClientUpdatesService } from './services/client-updates';
import { LawFirmService } from './services/law-firm';
import { logger, toErrorMeta } from './utils/logger';

async function runOverdueCheck(): Promise<number | null> {
  try {
    return await LawFirmService.warnOverdueSubmissions();
  } catch (error) {
    logger.error('Law-firm overdue check failed', toErrorMeta(error));
    return null;
  }
}

export const handler = async (_event: unknown) => {
  const overdueWarningsSent = await runOverdueCheck();
  try {
    const result = await ClientUpdatesService.runDaily();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result,
        warnings: result.warnings.length,
        overdueWarningsSent,
      }),
    };
  } catch (error) {
    logger.error('Client updates cron failed', toErrorMeta(error));
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Client updates cron failed',
        overdueWarningsSent,
      }),
    };
  }
};
