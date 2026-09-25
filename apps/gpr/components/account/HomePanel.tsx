'use client';

import type { AccountCase, AccountOpenTask } from '@/lib/account-api';
import { t } from '@/content/tokens';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import { formatLongDate } from './format';
import { Card, LinkButton, StageChip, TextLink } from './primitives';
import { Stepper } from './Stepper';

export const HOME_COPY = {
  submittedHeading: 'Your application has been submitted',
  preparingHeading: 'We are preparing your application',
  intro: (office: string, date: string) =>
    `Your application was sent to ${office} on ${date}. We'll handle the correspondence and follow-up, and keep you informed as we wait for their decision.`,
  nextUpdate: {
    heading: 'Your next update',
    text: (date: string) =>
      `You'll hear from us by ${date}, even if we're still waiting for news.`,
  },
  anythingToDo: {
    heading: 'Anything for you to do',
    nothing: "Nothing at the moment. We'll let you know if that changes.",
  },
  whatNext: {
    heading: 'What we are doing next',
    text: (action: string, date: string) => `${action} by ${date}.`,
  },
  latest: { heading: 'The latest on your application', all: 'See all updates' },
  howLong: {
    heading: 'How long does it take',
    escrow:
      "That's the account at our partner law firm where your refund arrives before being transferred to you. These are past results among completed refunds; your own processing time may differ.",
    link: 'See our processing times',
    href: '/german-pension-refund-processing-time',
    approved:
      "Once your refund is approved, we'll guide you through reviewing the decision and authorising your payout. The transfer from the law firm's account to yours is a separate step.",
  },
  howWeKeepYouUpdated: {
    heading: 'How we keep you updated',
    text: "You'll hear from us at least every four weeks — even if we're still waiting for news — and sooner when there's a development you need to know about. If we're still waiting after three months, we'll contact the office to check where things stand. After six months without a decision, we review the next steps and send an update at least every two weeks.",
  },
  receivedALetter: {
    heading: 'Received a letter directly',
    text: "Please upload it here as soon as you can. We'll check what it means and take care of the next steps with you.",
    button: 'Upload a letter',
  },
  questions: {
    heading: 'Questions along the way',
    text: "You're welcome to reply to any of our emails. We'll help you make sense of anything that comes up.",
  },
  buttons: {
    uploadDocuments: 'Upload requested documents',
    uploadLetter: 'Upload a letter',
  },
} as const;

export function taskButton(task: AccountOpenTask) {
  if (task.button === 'upload_documents') {
    return {
      href: '/account/tasks/' + encodeURIComponent(task.id),
      label: HOME_COPY.buttons.uploadDocuments,
    };
  }
  if (task.button === 'upload_letter') {
    return {
      href: '/account/letters/new',
      label: HOME_COPY.buttons.uploadLetter,
    };
  }
  return null;
}

function TaskCard({ task }: { task: AccountOpenTask | null }) {
  // Never "nothing" alongside an open task.
  if (!task) {
    return (
      <Card title={HOME_COPY.anythingToDo.heading}>
        <p>{HOME_COPY.anythingToDo.nothing}</p>
      </Card>
    );
  }
  const button = taskButton(task);
  return (
    <Card title={HOME_COPY.anythingToDo.heading} className="border-brand-navy">
      <p className="text-brand-ink">{task.text}</p>
      {task.dueDate ? (
        <p className="mt-1 text-sm font-semibold text-brand-navy">
          Due by {formatLongDate(task.dueDate)}
        </p>
      ) : null}
      {button ? (
        <div className="mt-4">
          <LinkButton href={button.href}>{button.label}</LinkButton>
        </div>
      ) : null}
    </Card>
  );
}

const LATEST_LIMIT = 3;

export function HomePanel({ data }: { data: AccountCase }) {
  const preparing = data.stage === 'preparing';
  const office = data.pensionOffice || 'the pension office';
  const latest = data.latest.slice(0, LATEST_LIMIT);

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <StageChip stage={data.stage} />
        <h1 className="mt-3 text-[26px] font-bold leading-tight text-brand-ink sm:text-[32px]">
          {preparing ? HOME_COPY.preparingHeading : HOME_COPY.submittedHeading}
        </h1>
        {!preparing && data.submissionDate ? (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-brand-body">
            {HOME_COPY.intro(office, formatLongDate(data.submissionDate))}
          </p>
        ) : null}
      </header>

      <div className="mb-6 rounded-card border border-brand-stroke/60 bg-white p-5 sm:mb-8 sm:p-6">
        <Stepper steps={data.stepper} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="space-y-4">
          {data.nextClientUpdateDue ? (
            <Card title={HOME_COPY.nextUpdate.heading}>
              <p className="text-lg font-bold text-brand-ink">
                By {formatLongDate(data.nextClientUpdateDue)}
              </p>
              <p className="mt-1">
                {HOME_COPY.nextUpdate.text(
                  formatLongDate(data.nextClientUpdateDue)
                )}
              </p>
            </Card>
          ) : null}

          <TaskCard task={data.openCustomerTask} />

          {data.nextOfficeAction ? (
            <Card title={HOME_COPY.whatNext.heading}>
              <p>
                {HOME_COPY.whatNext.text(
                  data.nextOfficeAction.label,
                  formatLongDate(data.nextOfficeAction.dueDate)
                )}
              </p>
            </Card>
          ) : null}

          {latest.length ? (
            <Card title={HOME_COPY.latest.heading}>
              <ul className="divide-y divide-brand-stroke/50">
                {latest.map((entry, i) => (
                  <li key={entry.date + i} className="py-2.5 first:pt-0">
                    <span className="mr-2 font-semibold text-brand-ink">
                      {formatLongDate(entry.date)}
                    </span>
                    <span className="text-brand-muted" aria-hidden>
                      ·{' '}
                    </span>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <TextLink href="/account/updates">
                  {HOME_COPY.latest.all} →
                </TextLink>
              </p>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card title={HOME_COPY.howLong.heading} as="h3">
            <p>
              {t('TM-01.sentence')} {HOME_COPY.howLong.escrow}{' '}
              <SmartLink
                href={HOME_COPY.howLong.href}
                className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                darkClassName="font-semibold text-brand-navy"
              >
                {HOME_COPY.howLong.link}
              </SmartLink>
            </p>
            <p className="mt-3">{HOME_COPY.howLong.approved}</p>
          </Card>

          <Card title={HOME_COPY.howWeKeepYouUpdated.heading} as="h3">
            <p>{HOME_COPY.howWeKeepYouUpdated.text}</p>
          </Card>

          <Card title={HOME_COPY.receivedALetter.heading} as="h3">
            <p>{HOME_COPY.receivedALetter.text}</p>
            <div className="mt-4">
              <LinkButton href="/account/letters/new" variant="secondary">
                {HOME_COPY.receivedALetter.button}
              </LinkButton>
            </div>
          </Card>

          <Card title={HOME_COPY.questions.heading} as="h3">
            <p>{HOME_COPY.questions.text}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
