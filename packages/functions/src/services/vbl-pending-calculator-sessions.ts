import { eq, gt, and } from 'drizzle-orm';
import { db } from '../utils/db';
import {
  pendingCalculatorSessions,
  type VBLPendingCalculatorSession,
  type NewVBLPendingCalculatorSession,
} from '../drizzle/schema/vbl';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    const [row] = await db
      .update(pendingCalculatorSessions)
      .set({ email, updatedAt: new Date() })
      .where(eq(pendingCalculatorSessions.token, token))
      .returning();
    return row ?? null;
  },
};
