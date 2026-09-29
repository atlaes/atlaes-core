/**
 * Client update e-mails, copied verbatim from
 * "Client update texts — final version, 16 September 2026"
 * (GPR_Client_Update_Texts_FINAL_2026-09-16.md) and the DRV
 * Oldenburg-Bremen originals mail (GPR_Email_Originals_OldenburgBremen_
 * 2026-09-16.md). Bracketed fields are template variables (`{{name}}`);
 * bracketed editorial choices are variables the admin fills or that the
 * engine resolves from the case (see `templates.ts`). `[Button: …]` lines
 * are CTA links into the client account.
 *
 * Copy is law: never reword. Platform rule applied ("Using these emails
 * with the new platform"): the button before the sign-off, and
 * "Please upload [document] to your account by [date]." in place of
 * instructions to e-mail documents.
 */

import type { ClientUpdateTemplate } from '../../../drizzle/schema/client-updates';

export const BUTTON_VIEW = 'View your application';
export const BUTTON_UPLOAD = 'Upload requested documents';
export const BUTTON_UPLOAD_LETTER = 'Upload a letter';

/** Paragraph placeholder for the CTA button (rendered as a link). */
export const BUTTON_TOKEN = '{{button}}';

export interface EmailTemplate {
  key: ClientUpdateTemplate;
  title: string;
  /** Team note from the source (italic line under the heading). */
  note: string;
  subject: string;
  /** Body paragraphs; the closing "Best regards" is appended by the renderer. */
  paragraphs: string[];
  button: string;
}

const CLOSING = 'Best regards,\n{{caseManagerSignature}}';

export const T1: EmailTemplate = {
  key: 'T1',
  title: 'Documents ready for submission',
  note: 'Send when the completed case is handed to Vividius. The update date also covers any delay before posting.',
  subject: 'Your application paperwork is ready',
  paragraphs: [
    'Hi {{firstName}},',
    "That's your application paperwork complete for now. Thank you for getting everything to us.",
    "We've passed your application to our German partner law firm for its final review, signature and submission to {{pensionOffice}}.",
    "I'll let you know as soon as it has been sent. Either way, you'll hear from me by {{date}}.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** M0 on the new platform (shorter; the account panel carries the rest). */
export const M0: EmailTemplate = {
  key: 'M0',
  title: 'Application submitted on the new platform',
  note: 'Use this shorter M0 with the account panel on the next page. Send after the posting date is confirmed.',
  subject: 'Your refund application is on its way',
  paragraphs: [
    'Hi {{firstName}},',
    'Your application is on its way. Our German partner law firm sent it to {{pensionOffice}} on {{submissionDate}}.',
    "We'll handle the correspondence and follow-up from here, and explain anything you need to know in plain English.",
    "Your account brings the details together: the latest on your application, what happens next and when you'll hear from us. I'll send your first update by {{date}}, then at least every four weeks — even if we're still waiting for news. If there's a development you need to know about, you'll hear sooner.",
    'If a letter from the pension office reaches you directly, please upload it to your account as soon as you can so we can check it and handle any deadline. Otherwise, you can leave the German paperwork with us.',
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** The full-length M0 for the e-mail-only platform, kept for reference. */
export const M0_LONG: EmailTemplate = {
  key: 'M0',
  title: 'Application submitted',
  note: 'Send after the posting date is confirmed. Link "See our processing times" to the methodology page.',
  subject: 'Your refund application is on its way',
  paragraphs: [
    'Hi {{firstName}},',
    'Your application is on its way. Our German partner law firm sent it to {{pensionOffice}} on {{submissionDate}}.',
    "We'll handle the correspondence and follow-up from here, and explain anything you need to know in plain English.",
    "To give you a sense of timing, more than three quarters of our 300 most recent completed refunds reached the client escrow account within three months. That's the account at our partner law firm where your refund arrives before being transferred to you. These are past results among completed refunds; your own processing time may differ. {{processingTimesLink}}",
    "I'll send your first update by {{date}}, then at least every four weeks — even if we're still waiting for news. If there's a development you need to know about, you'll hear sooner. If we're still waiting for a decision after three months, we'll contact the office to check where things stand.",
    'If a letter from the pension office reaches you directly, please send us a copy as soon as you can so we can check it and handle any deadline. Otherwise, you can leave the German paperwork with us.',
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M1: EmailTemplate = {
  key: 'M1',
  title: 'First scheduled update',
  note: 'Use when there is no decision, no information request and no outstanding customer task.',
  subject: 'Your refund application — a quick check-in',
  paragraphs: [
    'Hi {{firstName}},',
    "Just checking in, as promised. We're still waiting to hear from {{pensionOffice}} about the application sent on {{submissionDate}}. So far, we haven't received a decision or a request for anything more.",
    "There's nothing you need to do today. We're keeping track of the correspondence and the next follow-up, so you can leave the chasing to us.",
    "I'll be back in touch by {{date}}, or sooner if there's news. And if a question comes to mind before then, you're always welcome to reply.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M2: EmailTemplate = {
  key: 'M2',
  title: 'Second scheduled update',
  note: 'Use when the decision is still pending and the first direct status enquiry is planned.',
  subject: 'Your refund application — what happens next',
  paragraphs: [
    'Hi {{firstName}},',
    "A quick update from me: we're still waiting for {{pensionOffice}} to decide your application. They haven't asked us for any further information, and there's nothing you need to send us at the moment.",
    "Our next step is already planned. If the decision hasn't arrived by {{followUpDate}}, we'll contact the office to find out where your application stands and whether anything needs attention.",
    "I'll update you by {{customerUpdateDate}}, even if we're still waiting for their reply. You can leave that follow-up with us.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M3A: EmailTemplate = {
  key: 'M3A',
  title: 'After a successful call',
  note: 'Send promptly after Christian or Anna reaches the office. "We" is the team; the account manager need not have made the call.',
  subject: "Your refund application — we've spoken to the pension office",
  paragraphs: [
    'Hi {{firstName}},',
    'We spoke to {{pensionOffice}} on {{contactDate}}, and I wanted to bring you up to date.',
    '{{explanation}}',
    "We'll {{nextAction}} by {{actionDate}}. {{customerActionSentence}}",
    "I'll be in touch again by {{customerUpdateDate}}, or sooner if there's a development.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M3B: EmailTemplate = {
  key: 'M3B',
  title: 'Written enquiry sent',
  note: 'Use only after the enquiry has actually been sent. If a reply has already arrived, use M4.',
  subject: "Your refund application — we've asked for an update",
  paragraphs: [
    'Hi {{firstName}},',
    "We've asked {{pensionOffice}} for an update on your application. Our enquiry, sent on {{date}}, asks whether anything is still outstanding and when they expect to make a decision.",
    "We're waiting for their reply. If it hasn't arrived by {{followUpDate}}, we'll follow up again.",
    "There's nothing you need to do for this step. I'll let you know what we hear, with your next update from me by {{customerUpdateDate}}.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M4: EmailTemplate = {
  key: 'M4',
  title: 'Follow-up result',
  note: 'Use after a reply or completed follow-up. Insert one matching paragraph from the options below.',
  subject: 'Your refund application — the latest from us',
  paragraphs: [
    'Hi {{firstName}},',
    "Here's the latest on your application and what happens next.",
    '{{statusParagraph}}',
    "We'll {{nextAction}} by {{actionDate}}. {{customerActionSentence}}",
    "Your next update from me will arrive by {{customerUpdateDate}}, or sooner if there's news.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/**
 * Status paragraphs for M4. Insert one. Only include a confirmed queue
 * position, reason or estimate. Use E2 for a request that needs fuller
 * instructions.
 */
export const M4_STATUS_PARAGRAPH_TEXT = {
  application_complete:
    "Application complete. The pension office confirmed on {{date}} that it has everything it needs and your application is waiting for a decision. It hasn't given us a decision date yet.",
  estimated_decision_date:
    "Estimated decision date. The pension office told us on {{date}} that it expects to make a decision around {{estimatedDate}}. That gives us a date to follow up on: if the decision hasn't arrived, we'll contact the office again by {{followUpDate}}.",
  additional_information:
    'Additional information. The pension office has asked for {{item}} so it can {{reason}}. {{additionalInformationSentence}}',
  estimate_has_passed:
    "Estimate has passed. The decision hasn't arrived within the timeframe the office gave us. We followed up on {{date}} to ask what is holding it up and when we can now expect an answer.",
  no_substantive_reply:
    "No substantive reply. We still haven't received a clear answer to our enquiries on {{dates}}. On {{date}}, we followed up in writing and asked the office to respond by {{requestedReplyDate}}.",
} as const;

/** The two halves of the M4 "additional information" alternative. */
export const ADDITIONAL_INFORMATION_FROM_FILE =
  "We've already provided this from your file.";
export const ADDITIONAL_INFORMATION_NEEDS_CUSTOMER =
  'We need your help with this part; the details are below.';

export const M5: EmailTemplate = {
  key: 'M5',
  title: 'Written reminder sent',
  note: 'Send after the reminder is sent, usually around month five. The requested reply date is not a guaranteed decision date. Name the reviewer with their role.',
  subject: 'Your refund application — our next follow-up',
  paragraphs: [
    'Hi {{firstName}},',
    "Five months is a long time to wait. We've followed up with {{pensionOffice}} in writing and asked for a decision or a clear explanation of the delay by {{requestedReplyDate}}. The reminder was sent on {{sentDate}}.",
    '{{replySummary}}',
    "If we still have no decision or useful explanation by then, {{reviewerName}}, our {{reviewerRole}}, will review the case for escalation to the office's management. I'll let you know the outcome of that review and what we're doing next.",
    "There's nothing you need to do at the moment. I'll update you again by {{customerUpdateDate}}, or sooner if we hear back.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** M5 middle paragraph when no reply has been received. */
export const M5_NO_REPLY = "We're waiting for their response.";

export const M6A: EmailTemplate = {
  key: 'M6A',
  title: 'Complaint submitted to management',
  note: 'Use only after the case review and complaint. If no complaint has been filed, use M6B. State the actual wait if it is not six months.',
  subject: "Your refund application — we've escalated the delay",
  paragraphs: [
    'Hi {{firstName}},',
    "You've been waiting {{waitLength}}, and I'd like to give you a clear update on the steps we're taking.",
    "On {{date}}, we raised the delay with the management of {{pensionOffice}} through a formal complaint. We've asked them to review your application, explain what is holding it up and arrange a decision without further delay.",
    '{{responseSummary}}',
    "We'll continue handling the follow-up while we wait for the decision.",
    "From now on, you'll hear from me at least every two weeks, with your next update by {{customerUpdateDate}}. If there's a development before then, I'll let you know sooner.",
    "There's nothing you need to do today. If you have any questions about the next steps, just reply and I'll help.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** M6A middle paragraph when management has not responded yet. */
export const M6A_NO_RESPONSE =
  "We're waiting for management's response and will follow up by {{actionDate}}.";

export const M6B: EmailTemplate = {
  key: 'M6B',
  title: 'Six months without a complaint',
  note: 'Use after a senior review when a different next step is appropriate. Describe the actual outcome. Name the reviewer with their role.',
  subject: 'Your refund application — our plan from here',
  paragraphs: [
    'Hi {{firstName}},',
    "You've been waiting six months, so {{reviewerName}}, our {{reviewerRole}}, has reviewed your application and the follow-up so far. Here's where things stand.",
    '{{reviewOutcome}}',
    "We're continuing to follow up, and you'll now hear from me at least every two weeks while we wait for the decision.",
    "There's nothing you need to do at the moment. Your next update will arrive by {{date}}, or sooner if there's a development.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const M3_ONWARD: EmailTemplate = {
  key: 'M3_ONWARD',
  title: 'Scheduled update without new information',
  note: 'Use on a promised date. Choose one middle paragraph. Earlier news must already have been shared promptly.',
  subject: 'Your refund application — checking in as promised',
  paragraphs: [
    'Hi {{firstName}},',
    "I'm checking in as promised. We're still waiting for the pension office's decision, and there hasn't been any further news since my last update.",
    '{{lastContactParagraph}}',
    "Our next follow-up is scheduled for {{actionDate}}. It's on our calendar, so you can leave that with us.",
    "There's nothing you need to do today. I'll be back in touch by {{customerUpdateDate}}, or sooner if there's news.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** The two M3-onward middle paragraphs. */
export const M3_ONWARD_CONFIRMED =
  'At our last contact on {{date}}, the office confirmed {{status}}.';
export const M3_ONWARD_ASKED =
  'We asked the office {{question}} on {{date}} and are still waiting for a clear answer.';

export const M6_ONWARD: EmailTemplate = {
  key: 'M6_ONWARD',
  title: 'Fortnightly update',
  note: 'Use for every undecided case after six months, whether or not a complaint has been filed.',
  subject: 'Your refund application — your latest update',
  paragraphs: [
    'Hi {{firstName}},',
    "I'm back with your regular update. We're still waiting for the decision, and here's where things stand.",
    '{{latestDevelopment}}',
    "We'll {{specificNextAction}} by {{actionDate}}. {{customerActionSentence}}",
    "You'll hear from me again by {{customerUpdateDate}}, even if we're still waiting for their reply. Please feel free to get in touch before then if you have a question.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** M6-onward middle paragraph when nothing new has arrived. */
export const M6_ONWARD_NO_NEWS =
  "We haven't received a further response since my last message.";

export const E1: EmailTemplate = {
  key: 'E1',
  title: 'Application transferred to another office',
  note: 'Send once the transfer is confirmed. Adjust the next step if receipt at the new office is already confirmed. Nothing restarts: the submission date and every planned date stay as they are.',
  subject: 'Your refund application — a change of pension office',
  paragraphs: [
    'Hi {{firstName}},',
    'Your application has been passed from {{oldOffice}} to {{newOffice}}, which is responsible for {{plainEnglishReason}}.',
    "This is a transfer of your existing application, so you don't need to apply again: your submission date stays the same, and so does our follow-up plan. It can add some processing time while the file moves between offices.",
    "We'll check by {{actionDate}} that the new office has received it and find out what happens next. There's nothing you need to do for the transfer.",
    "I'll update you again by {{customerUpdateDate}}, or sooner if there's news.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const E2A: EmailTemplate = {
  key: 'E2A',
  title: 'Information needed from the customer',
  note: 'Use for a routine information request. Explain the actual reason and list the precise documents or details. Adapt individually for a substantive eligibility concern.',
  subject: 'Your refund application — we need {{documentOrDetail}}',
  paragraphs: [
    'Hi {{firstName}},',
    "The pension office needs {{documentOrDetail}} so it can {{plainEnglishReason}}. We'll put the response together; we just need your help with this part.",
    // Platform rule: "Replace instructions to email documents with:
    // Please upload [document] to your account by [date]."
    'Please upload {{documentOrDetail}} to your account by {{date}}.\n{{requestedItems}}',
    "If you're unsure which document to use, or don't have it available, let me know. We'll help you work out the next step.",
    "Once we've sent the response to the office, I'll confirm it with you. Either way, you'll hear from me by {{customerUpdateDate}}.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_UPLOAD,
};

export const E2B: EmailTemplate = {
  key: 'E2B',
  title: 'Information request handled from the existing file',
  note: 'Use when the team can answer without customer input. Replace the action sentence if the response has already been sent.',
  subject: "Your refund application — we're handling the next step",
  paragraphs: [
    'Hi {{firstName}},',
    "The pension office has asked for {{documentOrDetail}} so it can {{reason}}. We already have what's needed in your file, so we can take care of this one.",
    "We'll send the response by {{actionDate}}. There's nothing you need to find or upload.",
    "I'll update you again by {{customerUpdateDate}}, or sooner if there's a development.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

export const E3: EmailTemplate = {
  key: 'E3',
  title: 'Requested documents sent to the office',
  note: 'Send after forwarding is confirmed. Preserve the existing promised update date unless this message gives a substantive case update and explicitly sets a new date.',
  subject: "Your refund application — we've sent your documents",
  paragraphs: [
    'Hi {{firstName}},',
    'Thank you for sending {{documents}}. We forwarded them to {{pensionOffice}} on {{date}}.',
    "Your part of this step is done, and we'll take care of the follow-up with the office. If anything else is needed, I'll explain exactly what and why.",
    "Your next update from me is due by {{customerUpdateDate}}, or sooner if there's news.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/**
 * DRV Oldenburg-Bremen originals (16 Sep 2026). Block B is included only
 * when the office enclosed its "Allgemeine Hinweise" sheet
 * (`{{blockB}}` resolves to OB_BLOCK_B or to nothing).
 */
export const OB_ORIGINALS: EmailTemplate = {
  key: 'OB_ORIGINALS',
  title: 'Originals for DRV Oldenburg-Bremen',
  note: "Managed clients whose claim is handled by DRV Oldenburg-Bremen and who are asked for the hand-signed original power of attorney and payment declaration. Both [date] fields in step 3 and Block B = the deadline in the office's letter (four weeks from its date).",
  subject: 'Your refund application — two originals needed by post',
  paragraphs: [
    'Hi {{firstName}},',
    "Deutsche Rentenversicherung Oldenburg-Bremen, the office handling your refund application, has asked us for the original power of attorney and payment declaration, signed by hand. A scan or a digitally signed version isn't enough for this office — it's a known requirement there, not a problem with your application.",
    "Here's what to do:",
    "1. Print the attached power of attorney and payment declaration. (If you still have the originals you signed by hand earlier, you can send those instead of printing new ones.)\n2. Write today's date in the date field at the bottom of each document and sign next to it by hand.\n3. Post the originals directly to the pension office — not to us — by {{date}}:\n\n   Deutsche Rentenversicherung Oldenburg-Bremen\n   Hauptverwaltung\n   26112 Oldenburg\n   Germany",
    'Please use a tracked service and send me the tracking number, so we know when the envelope arrives and can follow up with the office.',
    '{{blockB}}',
    "Once the tracking shows the envelope has been delivered, we'll check with the office that everything is in order and let you know. Your next update from me will arrive by {{customerUpdateDate}} in any case.",
    "If anything is unclear, just reply to this email and I'll help.",
    BUTTON_TOKEN,
  ],
  button: BUTTON_VIEW,
};

/** Block B, joined with blank lines; empty when the office sent no sheet. */
export const OB_BLOCK_B: string[] = [
  "The office also enclosed a general information sheet it sends before finalising a refund, because a refund can't be reversed later. It's general wording, not a comment on your case. Here it is in our translation:",
  '"General information on the consequences of a refund of contributions\n\nPlease note that a refund of contributions may have consequences for your residence permit in the Federal Republic of Germany. We therefore recommend that you seek advice on this from the immigration authority responsible for you.\n\nIn addition, claiming a refund of contributions may mean that the qualifying period required for a pension entitlement in your current country of residence is no longer met, and that a possible pension entitlement therefore lapses. If applicable, please contact the pension insurance institution there."',
  'What this means in practice:',
  "1. German residence permit. Pension contributions are checked when a permanent residence permit (Niederlassungserlaubnis) is applied for, not afterwards. So this only matters if you might apply for a permanent German residence permit in the future and would need those months for it. If you still hold a German residence permit and want to be certain what the refund means for it, the immigration authority (Ausländerbehörde) of your last place of residence in Germany can tell you — we can't advise on immigration law.",
  "2. Pension in your country of residence. Once your contributions are refunded, your German insurance months are gone from your German record for good. Under a social security agreement, such months can sometimes count towards a pension in the country where you live. If you think you might need your German months for {{residencePensionName}}, please check with {{residencePensionAuthority}} before the office's deadline — we can't advise on {{residencePensionAdjective}} pension entitlements.",
  "The office will continue with your refund unless it hears from you by {{officeDeadline}}. If you want to go ahead, there's nothing more you need to do about this sheet — but to save the office waiting for that date, we've attached a short confirmation that you've read the information and wish to proceed. Please sign it and put it in the envelope with the two originals. If you'd like to check either point first, tell me before {{date}} and we'll ask the office for more time.",
];

/** Block B point 2 defaults (written for a client in Australia). */
export const OB_BLOCK_B_AUSTRALIA = {
  residencePensionName: 'an Australian Age Pension',
  residencePensionAuthority:
    'Services Australia (Centrelink International Services)',
  residencePensionAdjective: 'Australian',
} as const;

export const TEMPLATES: Record<ClientUpdateTemplate, EmailTemplate> = {
  T1,
  M0,
  M1,
  M2,
  M3A,
  M3B,
  M3_ONWARD,
  M4,
  M5,
  M6A,
  M6B,
  M6_ONWARD,
  E1,
  E2A,
  E2B,
  E3,
  OB_ORIGINALS,
};

export { CLOSING };

// ---------------------------------------------------------------------------
// Sentences the engine resolves from the case
// ---------------------------------------------------------------------------

/** Removed whenever a customer task is open (Rules: "no 'nothing needed'"). */
export const NOTHING_NEEDED_SENTENCE =
  "There's nothing you need to do at the moment.";

/** Platform wording for an open customer task (M4 / M3A / M6-onward slot). */
export const CUSTOMER_ACTION_SENTENCE =
  'Please upload {{item}} to your account by {{customerActionDate}}.';

/** Sentences that must not appear while a customer task is open. */
export const NOTHING_NEEDED_VARIANTS = [
  "There's nothing you need to do at the moment.",
  "There's nothing you need to do today.",
  "there's nothing you need to send us at the moment.",
  "There's nothing you need to find or upload.",
];

// ---------------------------------------------------------------------------
// Client account copy (Submitted stage panel)
// ---------------------------------------------------------------------------

export const ACCOUNT_COPY = {
  heading: 'Your application has been submitted',
  intro:
    "Your application was sent to {{pensionOffice}} on {{submissionDate}}. We'll handle the correspondence and follow-up, and keep you informed as we wait for their decision.",
  nextUpdate: {
    heading: 'Your next update',
    text: "You'll hear from us by {{date}}, even if we're still waiting for news.",
  },
  anythingToDo: {
    heading: 'Anything for you to do',
    nothing: "Nothing at the moment. We'll let you know if that changes.",
  },
  whatWeAreDoingNext: {
    heading: 'What we are doing next',
    text: '{{specificNextAction}} by {{date}}.',
  },
  latest: {
    heading: 'The latest on your application',
    text: '{{date}} · {{summary}}',
  },
  howLong: {
    heading: 'How long does it take',
    paragraphs: [
      "More than three quarters of our 300 most recent completed refunds reached the client escrow account within three months. That's the account at our partner law firm where your refund arrives before being transferred to you. These are past results among completed refunds; your own processing time may differ.",
      "Once your refund is approved, we'll guide you through reviewing the decision and authorising your payout. The transfer from the law firm's account to yours is a separate step.",
    ],
    linkLabel: 'See our processing times',
    linkUrl:
      'https://www.germanypensionrefund.com/german-pension-refund-processing-time',
  },
  howWeKeepYouUpdated: {
    heading: 'How we keep you updated',
    text: "You'll hear from us at least every four weeks — even if we're still waiting for news — and sooner when there's a development you need to know about. If we're still waiting after three months, we'll contact the office to check where things stand. After six months without a decision, we review the next steps and send an update at least every two weeks.",
  },
  receivedALetter: {
    heading: 'Received a letter directly',
    text: "Please upload it here as soon as you can. We'll check what it means and take care of the next steps with you.",
    button: BUTTON_UPLOAD_LETTER,
  },
  questions: {
    heading: 'Questions along the way',
    text: "You're welcome to reply to any of our emails. We'll help you make sense of anything that comes up.",
  },
} as const;

/** Optional explanations (used once when relevant / in an account help section). */
export const OPTIONAL_EXPLANATIONS = {
  interest:
    'For longer delays, statutory interest of 4% a year may be payable on your refund. It depends on the legal conditions and cannot start before six calendar months have passed after the complete application reached a German pension insurance institution. Reaching six months on our update schedule does not by itself confirm that interest is due.',
  courtAction:
    'If the pension office has not decided an application after six months without sufficient reason, an action at the social court may be available to seek a decision. It is a case-specific option. Any court proceedings would be discussed with you first, including their scope and any costs.',
} as const;
