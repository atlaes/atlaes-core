/**
 * V0901 answers that ops may change per case (owner answer 2, 20 Oct
 * 2026: the fixed answers to 5.1, 6.1, 6.3 and 8.1 are fine for now, but
 * admin must always be able to change them, e.g. for a survivor case).
 *
 * Each question is a ja/nein button pair on the form (the field's two
 * on-values are "ja" and "nein"), so an override is a boolean. Overrides
 * are stored per claim (claims.v0901_answers, migration 0025) and merged
 * over V0901_ANNOTATED_DEFAULTS when the pack is generated. Follow-up
 * detail fields for a "ja" answer (which country, which benefit) stay
 * empty for the lawyer to complete by hand.
 */

import { z } from 'zod';
import { V0901_ANNOTATED_DEFAULTS, type V0901Defaults } from './v0901-form';

export const V0901_EDITABLE_KEYS = [
  'insuranceRecordIssued',
  'insuranceRecordCorrect',
  'foreignContributions',
  'currentlyInsuredAbroad',
  'germanBenefitsReceived',
] as const;

export type V0901EditableKey = (typeof V0901_EDITABLE_KEYS)[number];

export type V0901AnswerOverrides = Partial<Record<V0901EditableKey, boolean>>;

export interface V0901Question {
  key: V0901EditableKey;
  /** Question number on the form. */
  number: string;
  /** AcroForm button the answer ticks. */
  field: string;
  /** Question text as printed on the form (German). */
  textDe: string;
  label: string;
}

export const V0901_QUESTIONS: readonly V0901Question[] = [
  {
    key: 'insuranceRecordIssued',
    number: '5.1',
    field: 'AW_VV_1',
    textDe: 'Wurde bereits ein deutscher Versicherungsverlauf erteilt?',
    label: 'German insurance record already issued',
  },
  {
    key: 'insuranceRecordCorrect',
    number: '5.1',
    field: 'AW_VV_2',
    textDe: 'Ist er vollständig und richtig?',
    label: 'Insurance record complete and correct',
  },
  {
    key: 'foreignContributions',
    number: '6.1',
    field: 'AW_BEITR_AUSL_VT',
    textDe:
      'Haben Sie Beiträge zu einem Versicherungsträger in einem Staat der EU, der EWR, in der Schweiz, im Vereinigten Königreich oder in einem Abkommensstaat gezahlt?',
    label:
      'Contributions paid in the EU/EEA, Switzerland, UK or a treaty state',
  },
  {
    key: 'currentlyInsuredAbroad',
    number: '6.3',
    field: 'AW_AUSLAND_VP_1',
    textDe: 'Sind Sie aktuell im Ausland rentenversicherungspflichtig?',
    label: 'Currently compulsorily insured abroad',
  },
  {
    key: 'germanBenefitsReceived',
    number: '8.1',
    field: 'AW_SACH_GELD',
    textDe:
      'Haben Sie in Deutschland eine Leistung bereits erhalten oder beantragt?',
    label:
      'German benefit (e.g. pension, rehabilitation) received or applied for',
  },
];

/** Body of PUT /admin/claims/:id/v0901-answers: null = back to default. */
export const v0901AnswersSchema = z
  .object(
    Object.fromEntries(
      V0901_EDITABLE_KEYS.map((k) => [k, z.boolean().nullable().optional()])
    ) as Record<V0901EditableKey, z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>
  )
  .strict();

export type V0901AnswersInput = z.infer<typeof v0901AnswersSchema>;

/**
 * Applies an update to the stored overrides: true/false sets, null
 * removes (back to the default), an absent key stays as it was. An
 * override equal to the default is dropped, so the stored object only
 * holds real deviations.
 */
export function applyV0901Answers(
  current: V0901AnswerOverrides | null | undefined,
  input: V0901AnswersInput
): V0901AnswerOverrides | null {
  const next: V0901AnswerOverrides = { ...(current ?? {}) };
  for (const key of V0901_EDITABLE_KEYS) {
    const v = input[key];
    if (v === undefined) continue;
    if (v === null || v === V0901_ANNOTATED_DEFAULTS[key]) delete next[key];
    else next[key] = v;
  }
  return Object.keys(next).length ? next : null;
}

/** Only the editable keys with boolean values; anything else is ignored. */
export function sanitizeV0901Overrides(
  raw: unknown
): Partial<V0901Defaults> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<V0901Defaults> = {};
  for (const key of V0901_EDITABLE_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export interface V0901AnswerView extends V0901Question {
  defaultValue: boolean;
  override: boolean | null;
  effective: boolean;
}

export function v0901AnswerViews(
  overrides: V0901AnswerOverrides | null | undefined
): V0901AnswerView[] {
  return V0901_QUESTIONS.map((q) => {
    const o = overrides?.[q.key];
    const override = typeof o === 'boolean' ? o : null;
    const defaultValue = V0901_ANNOTATED_DEFAULTS[q.key];
    return {
      ...q,
      defaultValue,
      override,
      effective: override ?? defaultValue,
    };
  });
}
