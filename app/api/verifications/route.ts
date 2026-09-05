import { z } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { getRequest, publicRequest } from '@/db/verification';
import { groundingError, normalizeEvidence, type Experience } from '@/lib/evidence';
import { factualKinds, verificationBasis } from '@/lib/verification';
import { privateJson, readJson, RequestError, requestFailure } from '@/lib/http';

export const dynamic = 'force-dynamic';
const schema = z.object({
  id: z.string().uuid(), experienceId: z.string().uuid(), claimId: z.string().min(1).max(100),
  recipientEmail: z.string().trim().email().max(254).transform(s => s.toLowerCase()),
  expectedSnapshot: z.string().max(200000), consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in before requesting verification.', 401);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new RequestError('Choose a claim, enter the verifier email and approve exactly what will be shared.', 400);
    const input = parsed.data;
    if (input.recipientEmail === user.email.toLowerCase()) throw new RequestError('Ask someone else who can confirm this fact. Self-review remains Reported.', 400);
    const db = getDb();
    const row = await db.prepare('SELECT record FROM experiences WHERE id = ? AND owner = ?')
      .bind(input.experienceId, user.id).first<{ record: string }>();
    if (!row) throw new RequestError('Record unavailable.', 404);
    const record = normalizeEvidence(JSON.parse(row.record) as Experience);
    const claim = record.claims.find(c => c.id === input.claimId && c.state === 'USER VERIFIED' && !c.rejected);
    if (!claim || !factualKinds.includes(claim.kind) || record.demo || groundingError(record)) {
      throw new RequestError('Only reviewed, source-linked facts can be submitted. Capabilities are interpretations, not endorsements.', 400);
    }
    const snapshot = verificationBasis(record, claim);
    const snapshotJson = JSON.stringify(snapshot);
    if (input.expectedSnapshot !== snapshotJson) throw new RequestError('This record changed. Reopen it and review what will be shared.', 409);
    const existing = await getRequest(input.id);
    if (existing) {
      if (existing.owner_id !== user.id || existing.experience_id !== record.id || existing.recipient_email !== input.recipientEmail || existing.snapshot !== snapshotJson) {
        throw new RequestError('This request has already been used. Reopen the record to start another.', 409);
      }
      return privateJson({ request: publicRequest(existing) });
    }
    const recent = await db.prepare('SELECT COUNT(*) AS count FROM verification_requests WHERE owner_id = ? AND created_at > ?')
      .bind(user.id, new Date(Date.now() - 86400000).toISOString()).first<{ count: number }>();
    if ((recent?.count ?? 0) >= 30) throw new RequestError('You have reached the daily request limit. Please try again tomorrow.', 429);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshotJson));
    const version = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 14 * 86400000).toISOString();
    await db.prepare('INSERT INTO verification_requests (id, experience_id, owner_id, worker_name, recipient_email, version, snapshot, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(input.id, record.id, user.id, user.displayName, input.recipientEmail, version, snapshotJson, 'pending', now, expires).run();
    const saved = await getRequest(input.id);
    if (!saved || saved.owner_id !== user.id || saved.experience_id !== record.id || saved.snapshot !== snapshotJson || saved.recipient_email !== input.recipientEmail) {
      throw new RequestError('This request changed. Reopen the record and try again.', 409);
    }
    return privateJson({ request: publicRequest(saved) }, 201);
  } catch (error) { return requestFailure(error, 'Could not create the verification request. Please try again.'); }
}
