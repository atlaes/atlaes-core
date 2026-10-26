'use client';

import type { AccountCase, AccountOpenTask } from '@/lib/account-api';
import { t } from '@/content/tokens';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import { formatLongDate, formatShortDate } from './format';
import {
  Card,
  Column,
  LinkButton,
  PageTitle,
  StageChip,
  TextLink,
} from './primitives';
import { Stepper } from './Stepper';
import { PayoutTaskBanners } from './payout/PayoutTaskBanners';

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
    <Card title={HOME_COPY.anythingToDo.heading}>
      {task.dueDate ? (
        <span className="acc-chip acc-chip-warn acc-chip-due">
          Due by {formatShortDate(task.dueDate)}
        </span>
      ) : null}
      <p>{task.text}</p>
      {button ? (
        <div className="acc-actions">
          <LinkButton href={button.href}>{button.label}</LinkButton>
        </div>
      ) : null}
    </Card>
  );
}

/** Figma "Task banner": amber strip above the header while a task is open. */
function TaskBanner({ task }: { task: AccountOpenTask }) {
  const button = taskButton(task);
  return (
    <div className="acc-banner" role="status">
      <div className="acc-banner-text">
        {task.dueDate ? (
          <p className="acc-banner-title">
            Due by {formatLongDate(task.dueDate)}
          </p>
        ) : null}
        <p className="acc-banner-body">{task.text}</p>
      </div>
      {button ? (
        <LinkButton href={button.href} size="sm">
          {button.label}
        </LinkButton>
      ) : null}
    </div>
  );
}

const LATEST_LIMIT = 3;

export function HomePanel({ data }: { data: AccountCase }) {
  const preparing = data.stage === 'preparing';
  const office = data.pensionOffice || 'the pension office';
  const latest = data.latest.slice(0, LATEST_LIMIT);
  const task = data.openCustomerTask;

  return (
    <Column>
      {task ? <TaskBanner task={task} /> : null}
      <PayoutTaskBanners />

      <PageTitle
        chip={<StageChip stage={data.stage} />}
        lead={
          !preparing && data.submissionDate
            ? HOME_COPY.intro(office, formatLongDate(data.submissionDate))
            : undefined
        }
      >
        {preparing ? HOME_COPY.preparingHeading : HOME_COPY.submittedHeading}
      </PageTitle>

      <Stepper steps={data.stepper} />

      <div className="acc-grid">
        <div className="acc-stack">
          {data.nextClientUpdateDue ? (
            <Card title={HOME_COPY.nextUpdate.heading}>
              <p className="acc-card-big">
                By {formatLongDate(data.nextClientUpdateDue)}
              </p>
              <p className="acc-card-muted">
                {HOME_COPY.nextUpdate.text(
                  formatLongDate(data.nextClientUpdateDue)
                )}
              </p>
            </Card>
          ) : null}

          <TaskCard task={task} />

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
            <Card title={HOME_COPY.latest.heading} className="acc-card-latest">
              <ul className="acc-entries">
                {latest.map((entry, i) => (
                  <li key={entry.date + i} className="acc-entry">
                    <span className="acc-entry-date">
                      {formatShortDate(entry.date)}
                    </span>
                    <span className="acc-entry-text">{entry.text}</span>
                  </li>
                ))}
              </ul>
              <p>
                <TextLink href="/account/updates" className="acc-link-sm">
                  {HOME_COPY.latest.all} →
                </TextLink>
              </p>
            </Card>
          ) : null}
        </div>

        <aside className="acc-stack">
          <Card title={HOME_COPY.howLong.heading} as="h3" tone="tint" size="sm">
            <p>
              {t('TM-01.sentence')} {HOME_COPY.howLong.escrow}
            </p>
            <p>
              <SmartLink
                href={HOME_COPY.howLong.href}
                className="acc-link"
                darkClassName="acc-link"
              >
                {HOME_COPY.howLong.link}
              </SmartLink>
            </p>
            <p>{HOME_COPY.howLong.approved}</p>
          </Card>

          <Card title={HOME_COPY.howWeKeepYouUpdated.heading} as="h3" size="sm">
            <p>{HOME_COPY.howWeKeepYouUpdated.text}</p>
          </Card>

          <Card title={HOME_COPY.receivedALetter.heading} as="h3" size="sm">
            <p>{HOME_COPY.receivedALetter.text}</p>
            <LinkButton href="/account/letters/new">
              {HOME_COPY.receivedALetter.button}
            </LinkButton>
          </Card>

          <Card title={HOME_COPY.questions.heading} as="h3" size="sm">
            <p>{HOME_COPY.questions.text}</p>
          </Card>
        </aside>
      </div>
    </Column>
  );
}
