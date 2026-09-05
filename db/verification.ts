import { getDb } from '@/db';
import type { VerificationRequest } from '@/lib/verification';

export type VerificationRow = {
  id: string; experience_id: string; owner_id: string; worker_name: string; recipient_email: string;
  version: string; snapshot: string; status: VerificationRequest['status']; created_at: string;
  expires_at: string; response: string | null;
};

export function publicRequest(row: VerificationRow): VerificationRequest {
  return {
    id: row.id, experienceId: row.experience_id, workerName: row.worker_name, recipientEmail: row.recipient_email,
    version: row.version, snapshot: JSON.parse(row.snapshot),
    status: row.status === 'pending' && Date.parse(row.expires_at) <= Date.now() ? 'expired' : row.status,
    createdAt: row.created_at, expiresAt: row.expires_at, response: row.response ? JSON.parse(row.response) : null,
  };
}

export function getRequest(id: string) {
  return getDb().prepare('SELECT * FROM verification_requests WHERE id = ?').bind(id).first<VerificationRow>();
}

export async function ownerRequests(ownerId: string) {
  const rows = await getDb().prepare('SELECT * FROM verification_requests WHERE owner_id = ? ORDER BY created_at DESC')
    .bind(ownerId).all<VerificationRow>();
  return rows.results.map(publicRequest);
}
