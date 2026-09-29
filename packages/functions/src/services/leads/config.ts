import { env } from '../../utils/env';

export const LEAD_TYPES = [
  'v0900-guide',
  'wegzug-guide',
  'claim-lead',
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export type GuideKey = 'v0900' | 'wegzug';

export function guideKeyForType(type: LeadType): GuideKey | null {
  if (type === 'v0900-guide') return 'v0900';
  if (type === 'wegzug-guide') return 'wegzug';
  return null;
}

/** Constants carried over from gpr-lead-endpoint-v7.3.gs. */
export const leadsConfig = {
  senderName: env.LEADS_SENDER_NAME,
  replyTo: env.LEADS_REPLY_TO,
  fromEmail: env.LEADS_FROM_EMAIL || env.SES_FROM_EMAIL,
  notifyEmail: env.LEADS_NOTIFY_EMAIL,
  siteUrl: env.LEADS_SITE_URL.replace(/\/$/, ''),
  signaturePhotoUrl: env.LEADS_SIGNATURE_PHOTO_URL,
  calendlyUrl:
    'https://calendly.com/germanypensionrefund/pension-refund-options',
  reviewsUrl:
    'https://www.google.com/maps/place/Germany+Pension+Refund/@52.5037306,13.4811771,15z/data=!4m8!3m7!1s0x47a84f83a5c92825:0xde01f5de07a91663!8m2!3d52.5037079!4d13.481142!9m1!1b1!16s%2Fg%2F11fsv_bl2n?hl=en',
  guides: {
    v0900: {
      location: env.LEADS_V0900_GUIDE_URL,
      pageUrl: `${env.LEADS_SITE_URL.replace(/\/$/, '')}/v0900-formular`,
      defaultWidget: 'V0900-CAPTURE',
    },
    wegzug: {
      location: env.LEADS_WEGZUG_GUIDE_URL,
      pageUrl: `${env.LEADS_SITE_URL.replace(/\/$/, '')}/rentenbeitragserstattung`,
      defaultWidget: 'WEGZUG-CAPTURE',
    },
  } satisfies Record<
    GuideKey,
    { location: string | undefined; pageUrl: string; defaultWidget: string }
  >,
};
