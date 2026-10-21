import apiClient from './api';

export interface VblReminderPayload {
  email: string;
  // First day of the month the refund can be started, YYYY-MM-DD.
  eligibleOn: string;
  source: 'calculator' | 'get-started';
  pensionProvider?: string;
}

export async function setVblReminder(
  payload: VblReminderPayload
): Promise<{ reminderDueOn: string }> {
  const res = await apiClient.post('/vbl/reminders', payload);
  if (!res.data?.success) {
    throw new Error(res.data?.error ?? 'Failed to set reminder');
  }
  return { reminderDueOn: res.data.reminderDueOn };
}

// Month index (year * 12 + month) to the first day of that month.
export const monthIndexToIsoDate = (index: number) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`;
