import { describe, expect, it } from 'vitest';
import {
  checkBeforeSend,
  eventReplacesScheduledDraft,
  renderTemplate,
  selectContactTemplate,
  selectScheduledTemplate,
  selectSeniorReviewTemplate,
  templateVariables,
} from './templates';
import { CLIENT_UPDATE_TEMPLATES } from '../../drizzle/schema/client-updates';
import { NOTHING_NEEDED_SENTENCE, TEMPLATES } from './emails/templates';

const ACCOUNT = 'https://www.germanypensionrefund.com/account';

describe('selectScheduledTemplate', () => {
  const submissionDate = '2026-09-16';
  it('M1 → M2 → M3 onward by updates already sent', () => {
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2026-10-13',
        scheduledUpdatesSent: 0,
      })
    ).toBe('M1');
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2026-11-10',
        scheduledUpdatesSent: 1,
      })
    ).toBe('M2');
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2026-12-08',
        scheduledUpdatesSent: 2,
      })
    ).toBe('M3_ONWARD');
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2027-02-01',
        scheduledUpdatesSent: 5,
      })
    ).toBe('M3_ONWARD');
  });
  it('M6 onward from + 6 months whatever was sent before', () => {
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2027-03-16',
        scheduledUpdatesSent: 0,
      })
    ).toBe('M6_ONWARD');
    expect(
      selectScheduledTemplate({
        submissionDate,
        today: '2027-04-30',
        scheduledUpdatesSent: 7,
      })
    ).toBe('M6_ONWARD');
  });
});

describe('selectContactTemplate (Triggers → template)', () => {
  const warranted = { updateWarranted: true } as const;
  it('status enquiry by phone → M3A, written → M3B', () => {
    expect(
      selectContactTemplate({
        type: 'status_enquiry',
        channel: 'phone',
        ...warranted,
      })
    ).toBe('M3A');
    expect(
      selectContactTemplate({
        type: 'status_enquiry',
        channel: 'written',
        ...warranted,
      })
    ).toBe('M3B');
    expect(
      selectContactTemplate({
        type: 'status_enquiry',
        channel: 'portal',
        ...warranted,
      })
    ).toBe('M3B');
  });
  it('office reply → M4, written reminder → M5, complaint → M6A, transfer → E1', () => {
    expect(
      selectContactTemplate({
        type: 'office_reply',
        channel: 'written',
        ...warranted,
      })
    ).toBe('M4');
    expect(
      selectContactTemplate({
        type: 'written_reminder',
        channel: 'written',
        ...warranted,
      })
    ).toBe('M5');
    expect(
      selectContactTemplate({
        type: 'complaint',
        channel: 'written',
        ...warranted,
      })
    ).toBe('M6A');
    expect(
      selectContactTemplate({
        type: 'transfer',
        channel: 'written',
        ...warranted,
      })
    ).toBe('E1');
  });
  it('info request → E2A (customer) / E2B (file) / Oldenburg originals', () => {
    expect(
      selectContactTemplate({
        type: 'info_request',
        channel: 'written',
        infoRequestSource: 'customer',
        ...warranted,
      })
    ).toBe('E2A');
    expect(
      selectContactTemplate({
        type: 'info_request',
        channel: 'written',
        infoRequestSource: null,
        ...warranted,
      })
    ).toBe('E2A');
    expect(
      selectContactTemplate({
        type: 'info_request',
        channel: 'written',
        infoRequestSource: 'file',
        ...warranted,
      })
    ).toBe('E2B');
    expect(
      selectContactTemplate({
        type: 'info_request',
        channel: 'written',
        infoRequestSource: 'originals_oldenburg',
        ...warranted,
      })
    ).toBe('OB_ORIGINALS');
  });
  it('documents forwarded → E3; E3 keeps the existing promised date', () => {
    expect(
      selectContactTemplate({
        type: 'documents_forwarded',
        channel: 'written',
        ...warranted,
      })
    ).toBe('E3');
    expect(eventReplacesScheduledDraft('E3')).toBe(false);
    expect(eventReplacesScheduledDraft('M4')).toBe(true);
  });
  it('unsuccessful attempt → no e-mail; not warranted → no e-mail', () => {
    expect(
      selectContactTemplate({
        type: 'unsuccessful_attempt',
        channel: 'phone',
        ...warranted,
      })
    ).toBeNull();
    expect(
      selectContactTemplate({
        type: 'office_reply',
        channel: 'written',
        updateWarranted: false,
      })
    ).toBeNull();
  });
  it('senior review without complaint → M6B', () => {
    expect(selectSeniorReviewTemplate({ complaintFiled: false })).toBe('M6B');
    expect(selectSeniorReviewTemplate({ complaintFiled: true })).toBe('M6A');
  });
});

describe('renderTemplate', () => {
  const base = {
    firstName: 'Priya',
    pensionOffice: 'Deutsche Rentenversicherung Bund',
    submissionDate: '16 September 2026',
    caseManagerSignature: 'Trixie\nClient Account Manager',
  };

  it('renders M0 verbatim with the button and no unresolved placeholders', () => {
    const r = renderTemplate({
      template: 'M0',
      variables: { ...base, date: '14 October 2026' },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
    });
    expect(r.subject).toBe('Your refund application is on its way');
    expect(r.body).toContain(
      'Your application is on its way. Our German partner law firm sent it to Deutsche Rentenversicherung Bund on 16 September 2026.'
    );
    expect(r.body).toContain(
      "I'll send your first update by 14 October 2026, then at least every four weeks"
    );
    expect(r.body).toContain(`View your application: ${ACCOUNT}`);
    expect(
      r.body.endsWith('Best regards,\nTrixie\nClient Account Manager')
    ).toBe(true);
    expect(r.unresolved).toEqual([]);
  });

  it('lists unresolved placeholders and shows them as bracketed labels', () => {
    const r = renderTemplate({
      template: 'M1',
      variables: { firstName: 'Priya' },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
    });
    expect(r.unresolved.sort()).toEqual(
      ['caseManagerSignature', 'date', 'pensionOffice', 'submissionDate'].sort()
    );
    expect(r.body).toContain('[pension office]');
    expect(r.body).toContain('[case manager signature]');
  });

  it('M4 inserts the chosen status paragraph and the customer-action alternative', () => {
    const noTask = renderTemplate({
      template: 'M4',
      variables: {
        ...base,
        date: '2 December 2026',
        nextAction: 'follow up with the office',
        actionDate: '16 December 2026',
        customerUpdateDate: '30 December 2026',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
      statusParagraph: 'application_complete',
    });
    expect(noTask.body).toContain(
      'Application complete. The pension office confirmed on 2 December 2026 that it has everything it needs'
    );
    expect(noTask.body).toContain(
      `We'll follow up with the office by 16 December 2026. ${NOTHING_NEEDED_SENTENCE}`
    );
    expect(noTask.unresolved).toEqual([]);

    const withTask = renderTemplate({
      template: 'M4',
      variables: {
        ...base,
        item: 'your last three payslips',
        reason: 'confirm the contribution periods',
        nextAction: 'send the response',
        actionDate: '16 December 2026',
        customerUpdateDate: '30 December 2026',
        customerActionDate: '9 December 2026',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: true,
      statusParagraph: 'additional_information',
    });
    expect(withTask.body).toContain(
      'Additional information. The pension office has asked for your last three payslips so it can confirm the contribution periods. We need your help with this part; the details are below.'
    );
    expect(withTask.body).toContain(
      'Please upload your last three payslips to your account by 9 December 2026.'
    );
    expect(withTask.body).not.toContain(NOTHING_NEEDED_SENTENCE);
  });

  it('M5 and M6A fall back to the documented no-reply sentences', () => {
    const m5 = renderTemplate({
      template: 'M5',
      variables: {
        ...base,
        requestedReplyDate: '2 March 2027',
        sentDate: '16 February 2027',
        reviewerName: 'Johannes Kühn',
        reviewerRole: 'managing director',
        customerUpdateDate: '2 March 2027',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
    });
    expect(m5.body).toContain("We're waiting for their response.");
    expect(m5.body).toContain(
      'Johannes Kühn, our managing director, will review the case'
    );
    const m6a = renderTemplate({
      template: 'M6A',
      variables: {
        ...base,
        date: '17 March 2027',
        actionDate: '31 March 2027',
        customerUpdateDate: '31 March 2027',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
    });
    expect(m6a.body).toContain(
      "You've been waiting six months, and I'd like to give you a clear update"
    );
    expect(m6a.body).toContain(
      "We're waiting for management's response and will follow up by 31 March 2027."
    );
    expect(m6a.unresolved).toEqual([]);
  });

  it('M3 onward chooses the middle paragraph by the last contact kind', () => {
    const confirmed = renderTemplate({
      template: 'M3_ONWARD',
      variables: {
        ...base,
        date: '20 November 2026',
        status: 'the application is complete and waiting for a decision',
        actionDate: '16 December 2026',
        customerUpdateDate: '18 December 2026',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
      lastContactKind: 'confirmed',
    });
    expect(confirmed.body).toContain(
      'At our last contact on 20 November 2026, the office confirmed the application is complete and waiting for a decision.'
    );
    const asked = renderTemplate({
      template: 'M3_ONWARD',
      variables: {
        ...base,
        date: '20 November 2026',
        question: 'when a decision is expected',
        actionDate: '16 December 2026',
        customerUpdateDate: '18 December 2026',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: false,
      lastContactKind: 'asked',
    });
    expect(asked.body).toContain(
      'We asked the office when a decision is expected on 20 November 2026 and are still waiting for a clear answer.'
    );
  });

  it('E2A uses the platform upload wording and the upload button', () => {
    const r = renderTemplate({
      template: 'E2A',
      variables: {
        ...base,
        documentOrDetail: 'your certified passport copy',
        plainEnglishReason: 'confirm your identity',
        date: '9 December 2026',
        requestedItems:
          'A certified copy of the photo page of your current passport.',
        customerUpdateDate: '18 December 2026',
      },
      accountUrl: ACCOUNT,
      customerTaskOpen: true,
    });
    expect(r.subject).toBe(
      'Your refund application — we need your certified passport copy'
    );
    expect(r.body).toContain(
      'Please upload your certified passport copy to your account by 9 December 2026.'
    );
    expect(r.body).toContain(`Upload requested documents: ${ACCOUNT}`);
    expect(r.body).not.toContain('reply to this email by');
  });

  it('Oldenburg-Bremen originals: Block B only when included', () => {
    const vars = {
      ...base,
      date: '14 October 2026',
      officeDeadline: '14 October 2026',
      customerUpdateDate: '21 October 2026',
    };
    const without = renderTemplate({
      template: 'OB_ORIGINALS',
      variables: vars,
      accountUrl: ACCOUNT,
      customerTaskOpen: true,
    });
    expect(without.body).toContain(
      'Deutsche Rentenversicherung Oldenburg-Bremen\n   Hauptverwaltung\n   26112 Oldenburg\n   Germany'
    );
    expect(without.body).not.toContain('general information sheet');
    expect(without.unresolved).toEqual([]);
    const withB = renderTemplate({
      template: 'OB_ORIGINALS',
      variables: vars,
      accountUrl: ACCOUNT,
      customerTaskOpen: true,
      includeBlockB: true,
    });
    expect(withB.body).toContain(
      'The office also enclosed a general information sheet'
    );
    expect(withB.body).toContain(
      'please check with Services Australia (Centrelink International Services)'
    );
    expect(withB.body).toContain('unless it hears from you by 14 October 2026');
    expect(withB.unresolved).toEqual([]);
  });

  it('every template has a subject, a greeting and the button before the sign-off', () => {
    for (const key of CLIENT_UPDATE_TEMPLATES) {
      const t = TEMPLATES[key];
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.paragraphs[0]).toBe('Hi {{firstName}},');
      expect(t.paragraphs[t.paragraphs.length - 1]).toBe('{{button}}');
      expect(templateVariables(key)).toContain('firstName');
    }
  });
});

describe('checkBeforeSend', () => {
  it('blocks unresolved placeholders', () => {
    expect(
      checkBeforeSend({
        subject: 'x',
        body: 'Hi [first name],',
        customerTaskOpen: false,
      }).ok
    ).toBe(false);
    expect(
      checkBeforeSend({
        subject: 'x',
        body: 'Hi {{firstName}},',
        customerTaskOpen: false,
      }).ok
    ).toBe(false);
    expect(
      checkBeforeSend({
        subject: 'x',
        body: 'Hi Priya,',
        customerTaskOpen: false,
      }).ok
    ).toBe(true);
  });
  it('blocks "nothing needed" while a customer task is open', () => {
    const body = `Hi Priya,\n\n${NOTHING_NEEDED_SENTENCE}`;
    expect(
      checkBeforeSend({ subject: 'x', body, customerTaskOpen: false }).ok
    ).toBe(true);
    const r = checkBeforeSend({ subject: 'x', body, customerTaskOpen: true });
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain('customer task is open');
  });
  it('blocks a contact stated without a log entry', () => {
    const r = checkBeforeSend({
      subject: 'x',
      body: 'We spoke to the office on 20 November 2026.',
      customerTaskOpen: false,
      statedContactDates: ['2026-11-20'],
      loggedContactDates: ['2026-11-19'],
    });
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain('2026-11-20');
  });
});
