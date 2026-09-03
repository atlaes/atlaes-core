import { eq, gt, and } from 'drizzle-orm';
import { db } from '../utils/db';
import {
  pendingCalculatorSessions,
  type VBLPendingCalculatorSession,
  type NewVBLPendingCalculatorSession,
} from '../drizzle/schema/vbl';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// The token column is a Postgres uuid. Comparing it against a non-UUID string
// makes Postgres throw "invalid input syntax for type uuid" before any row
// lookup happens, so reject malformed tokens up front and treat them as
// "not found".
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionToken(token: string): boolean {
  return UUID_REGEX.test(token);
}

export type CreateInput = Omit<
  NewVBLPendingCalculatorSession,
  'id' | 'token' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'email'
>;

export const VBLPendingCalculatorSessionsService = {
  async create(input: CreateInput): Promise<VBLPendingCalculatorSession> {
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    const [row] = await db
      .insert(pendingCalculatorSessions)
      .values({ ...input, expiresAt })
      .returning();
    return row;
  },

  async getByToken(token: string): Promise<VBLPendingCalculatorSession | null> {
    if (!isValidSessionToken(token)) return null;
    const [row] = await db
      .select()
      .from(pendingCalculatorSessions)
      .where(
        and(eq(pendingCalculatorSessions.token, token), gt(pendingCalculatorSessions.expiresAt, new Date()))
      )
      .limit(1);
    return row ?? null;
  },

  async linkEmail(token: string, email: string): Promise<VBLPendingCalculatorSession | null> {
    if (!isValidSessionToken(token)) return null;
    const [row] = await db
      .update(pendingCalculatorSessions)
      .set({ email, updatedAt: new Date() })
      .where(eq(pendingCalculatorSessions.token, token))
      .returning();
    return row ?? null;
  },
};
