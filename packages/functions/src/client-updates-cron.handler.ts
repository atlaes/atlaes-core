// Daily cron for the client-update engine (SST `sst.aws.Cron`, see
// resources/services/index.ts). Drafts the scheduled client update ≥ 1
// working day before it is due, opens the senior review at + 6 months,
// keeps the office action current and mails ops the warnings.
import { ClientUpdatesService } from './services/client-updates';
import { logger, toErrorMeta } from './utils/logger';

export const handler = async (_event: unknown) => {
  try {
    const result = await ClientUpdatesService.runDaily();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result,
        warnings: result.warnings.length,
      }),
    };
  } catch (error) {
    logger.error('Client updates cron failed', toErrorMeta(error));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Client updates cron failed' }),
    };
  }
};
