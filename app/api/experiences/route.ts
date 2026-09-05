import { getDb } from '@/db';
import { ownerRequests } from '@/db/verification';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canSave, groundingError, normalizeEvidence, type Experience } from '@/lib/evidence';
import { experienceSchema } from '@/lib/record-schema';
import { factualKinds } from '@/lib/verification';
import { privateJson, readJson, RequestError, requestFailure } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in to view your evidence.', 401);
    const rows = await getDb().prepare('SELECT record FROM experiences WHERE owner = ? ORDER BY created_at DESC')
      .bind(user.id).all<{ record: string }>();
    const requests = await ownerRequests(user.id);
    const records = rows.results.map(row => {
      const record = normalizeEvidence(JSON.parse(row.record) as Experience);
      return { ...record, verifications: requests.filter(v => v.experienceId === record.id) };
    });
    return privateJson({ records });
  } catch (error) { return requestFailure(error, 'Your evidence could not be loaded. Please try again.'); }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in before saving.', 401);
    const parsed = experienceSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new RequestError('Please check the record fields, references and date.', 400);
    const record = normalizeEvidence(parsed.data as Experience);
    if (!canSave(record)) throw new RequestError('Review every retained statement, including your action and context, before saving.', 400);
    const error = groundingError(record);
    if (error) throw new RequestError(error, 400);
    if (new Set(record.support?.map(s => s.id)).size !== record.support?.length || record.support?.some(s =>
      !record.claims.some(c => c.id === s.claimId && factualKinds.includes(c.kind)))) {
      throw new RequestError('Supporting references must belong to a factual statement in this record.', 400);
    }
    const db = getDb();
    const existing = await db.prepare('SELECT owner, created_at FROM experiences WHERE id = ?')
      .bind(record.id).first<{ owner: string; created_at: string }>();
    if (existing && existing.owner !== user.id) throw new RequestError('Record unavailable.', 403);
    record.createdAt = existing?.created_at ?? new Date().toISOString();
    const result = await db.prepare('INSERT INTO experiences (id, owner, record, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET record = excluded.record WHERE experiences.owner = excluded.owner')
      .bind(record.id, user.id, JSON.stringify(record), record.createdAt).run();
    if (!result.meta.changes) throw new RequestError('Record unavailable.', 403);
    return privateJson({ record });
  } catch (error) { return requestFailure(error, 'Could not save. Your review is still here; please try again.'); }
}
