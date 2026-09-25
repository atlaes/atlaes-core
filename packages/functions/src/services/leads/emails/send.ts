import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Resource } from 'sst';
import { env } from '../../../utils/env';
import { logger, toErrorMeta } from '../../../utils/logger';
import { leadsConfig } from '../config';

const sesClient = new SESClient({ region: env.SES_REGION });

/**
 * Same availability probe as services/email.ts, plus the `Resource` check:
 * the Fargate backend gets `SST_RESOURCE_AtlaesEmail`, the reminder cron
 * (an sst.aws.Function) only gets the encrypted link bundle that
 * `Resource` reads.
 */
function isSesAvailable(): boolean {
  if (process.env.SST_RESOURCE_AtlaesEmail) return true;
  try {
    return 'AtlaesEmail' in Resource;
  } catch {
    return false;
  }
}

export interface LeadMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends from "<LEADS_SENDER_NAME> <LEADS_FROM_EMAIL>" with Reply-To set to
 * the team mailbox. Logs instead of sending when SES is not linked (local
 * dev). Returns false on failure; callers decide whether that matters.
 */
export async function sendLeadMail(
  mail: LeadMail,
  logLabel: string
): Promise<boolean> {
  if (!isSesAvailable()) {
    logger.info(`[Email] Would send ${logLabel} to: ${mail.to}`, {
      subject: mail.subject,
    });
    return true;
  }
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: `${leadsConfig.senderName} <${leadsConfig.fromEmail}>`,
        ReplyToAddresses: [leadsConfig.replyTo],
        Destination: { ToAddresses: [mail.to] },
        Message: {
          Subject: { Data: mail.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: mail.text, Charset: 'UTF-8' },
            ...(mail.html
              ? { Html: { Data: mail.html, Charset: 'UTF-8' } }
              : {}),
          },
        },
      })
    );
    logger.info(`${logLabel} sent to: ${mail.to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send ${logLabel}:`, toErrorMeta(error));
    return false;
  }
}
