import { cluster, vpc } from '../network';
import { postgres } from '../database';
import { bucket } from '../storage';
import { email } from '../email';

// Migration runner token. Gates POST /api/migrations/run, which CI/CD
// invokes after each staging deploy. Set per-stage via:
//   AWS_PROFILE=atlaes npx sst secret set AdminMigrationToken <value> --stage <stage>
const adminMigrationToken = new sst.Secret('AdminMigrationToken');
const mistralApiKey = new sst.Secret('MistralApiKey');

// Lettershop (onlinebrief24.de) REST API credentials for claim mailing.
// Generated in the Kundencenter under Einstellungen > API Zugang, then set
// per-stage:
//   AWS_PROFILE=atlaes npx sst secret set LettershopApiKey <value> --stage <stage>
//   AWS_PROFILE=atlaes npx sst secret set LettershopApiSecret <value> --stage <stage>
const lettershopApiKey = new sst.Secret('LettershopApiKey');
const lettershopApiSecret = new sst.Secret('LettershopApiSecret');

// Retained so the secret resource (and its SSM value) survives the move off
// SFTP. Unused by the backend — drop once the API path has run in staging.
const lettershopSftpPassword = new sst.Secret('LettershopSftpPassword');

export const backend = new sst.aws.Service('AtlaesBackend', {
  cluster,
  image: {
    context: 'packages/functions',
    dockerfile: 'Dockerfile',
  },
  link: [
    postgres,
    bucket,
    email,
    adminMigrationToken,
    mistralApiKey,
    lettershopApiKey,
    lettershopApiSecret,
    lettershopSftpPassword,
  ],
  environment: {
    FRONTEND_URL:
      $app.stage === 'production'
        ? 'https://vbl.atlaes.de'
        : 'https://staging.vbl.atlaes.de',
    // Admin app origin; magic links for admin and law-firm users open here.
    ADMIN_URL:
      $app.stage === 'production'
        ? 'https://admin.atlaes.de'
        : 'https://staging.admin.atlaes.de',
    // Ops mailbox for law-firm portal activity (uploads, case events).
    // Unset = notices are logged only.
    GPR_FRONTEND_URL: process.env.GPR_FRONTEND_URL ?? '',
    OPS_NOTIFICATION_EMAIL: process.env.OPS_NOTIFICATION_EMAIL ?? '',
    JWT_SECRET: 'a-proper-32-char-minimum-secret-for-staging-env',
    NODE_ENV: 'production',
    // Both companypension.de and atlaes.de are verified SES identities in
    // the staging account; the brand address is the sender.
    SES_FROM_EMAIL: 'noreply@companypension.de',
    STRIPE_SECRET_KEY:
      $app.stage === 'production'
        ? ''
        : 'sk_test_51SRpwnD86goZexmM9XSBC97ERit2aUg4XOg0TGNvag9Zhzugx7NyChKTU0AubwFyrvIHtveGkd6AnjyytKpVlQWB00s9zr78UR',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    ADMIN_MIGRATION_TOKEN: adminMigrationToken.value,
    MISTRAL_API_KEY: mistralApiKey.value,
    MISTRAL_OCR_MODEL: process.env.MISTRAL_OCR_MODEL ?? 'mistral-ocr-latest',
    MISTRAL_EXTRACTION_MODEL:
      process.env.MISTRAL_EXTRACTION_MODEL ?? 'mistral-large-latest',
    // Lettershop claim mailing. Staging stays in 'test' mode: orders are
    // parked in the vendor's shopping cart, where they can be reviewed or
    // released by hand and are auto-deleted after 7 days — never printed,
    // never billed. Flip to 'live' only when real sends are intended.
    LETTERSHOP_API_KEY: lettershopApiKey.value,
    LETTERSHOP_API_SECRET: lettershopApiSecret.value,
    LETTERSHOP_MODE: 'test',
    // Lead capture (POST /api/leads): guide PDFs as S3 keys or https URLs,
    // team notice mailbox. Unset = page link / log only.
    LEADS_V0900_GUIDE_URL: process.env.LEADS_V0900_GUIDE_URL ?? '',
    LEADS_WEGZUG_GUIDE_URL: process.env.LEADS_WEGZUG_GUIDE_URL ?? '',
    LEADS_NOTIFY_EMAIL: process.env.LEADS_NOTIFY_EMAIL ?? '',
  },
  loadBalancer: {
    domain:
      $app.stage === 'production' ? 'api.atlaes.de' : 'staging.api.atlaes.de',
    ports: [
      { listen: '80/http', forward: '3001/http' },
      { listen: '443/https', forward: '3001/http' },
    ],
  },
});

// Daily waiting-period reminder for guide leads (gpr.leads with reminder
// opt-in): one e-mail on the 1st of month +23 after the last contribution
// month, once per lead. 06:00 UTC = 07:00/08:00 Berlin.
export const leadsReminderCron = new sst.aws.Cron('LeadsReminderCron', {
  schedule: 'cron(0 6 * * ? *)',
  function: {
    handler: 'packages/functions/src/leads-cron.handler.handler',
    runtime: 'nodejs20.x',
    timeout: '5 minutes',
    memory: '512 MB',
    vpc,
    link: [postgres, email],
    environment: {
      NODE_ENV: 'production',
      SES_FROM_EMAIL: 'noreply@companypension.de',
      LEADS_NOTIFY_EMAIL: process.env.LEADS_NOTIFY_EMAIL ?? '',
    },
  },
});

// Daily client-update engine run (Rules for Karl): drafts the scheduled
// client update ≥ 1 working day before the promised date, opens the
// senior review at + 6 months, keeps the office action current and mails
// ops the warnings (update overdue, office action overdue, posting date
// unconfirmed, funds before decision). 06:30 UTC, after the leads cron.
export const clientUpdatesCron = new sst.aws.Cron('ClientUpdatesCron', {
  schedule: 'cron(30 6 * * ? *)',
  function: {
    handler: 'packages/functions/src/client-updates-cron.handler.handler',
    runtime: 'nodejs20.x',
    timeout: '5 minutes',
    memory: '512 MB',
    vpc,
    link: [postgres, bucket, email],
    environment: {
      NODE_ENV: 'production',
      SES_FROM_EMAIL: 'noreply@companypension.de',
      OPS_NOTIFICATION_EMAIL: process.env.OPS_NOTIFICATION_EMAIL ?? '',
      GPR_FRONTEND_URL: process.env.GPR_FRONTEND_URL ?? '',
      ADMIN_URL:
        $app.stage === 'production'
          ? 'https://admin.atlaes.de'
          : 'https://staging.admin.atlaes.de',
    },
  },
});
