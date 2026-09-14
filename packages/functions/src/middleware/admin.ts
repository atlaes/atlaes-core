import { requireRole } from './roles';

// Kept as a named export for existing routes; new routes use requireRole.
export const adminMiddleware = requireRole('admin');
