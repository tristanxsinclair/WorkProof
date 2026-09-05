import { z } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { privateJson, readJson, RequestError, requestFailure } from '@/lib/http';

export const dynamic = 'force-dynamic';
const deletion = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('record'), recordId: z.string().uuid(), confirmation: z.literal('DELETE') }).strict(),
  z.object({ scope: z.literal('all'), confirmation: z.literal('DELETE') }).strict(),
]);

// No account identity is accepted from the client. Batch statements are atomic;
// references are removed before the records they depend on.
export async function DELETE(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in before deleting your data.', 401);
    const parsed = deletion.safeParse(await readJson(request, 2000));
    if (!parsed.success) throw new RequestError('Choose the deletion scope and type DELETE to confirm.', 400);
    const input = parsed.data;
    const db = getDb();
    if (input.scope === 'record') {
      const owned = await db.prepare('SELECT id FROM experiences WHERE id = ? AND owner = ?').bind(input.recordId, user.id).first();
      if (!owned) throw new RequestError('Record unavailable.', 404);
      await db.batch([
        db.prepare('DELETE FROM verification_requests WHERE experience_id = ? AND owner_id = ?').bind(input.recordId, user.id),
        db.prepare('DELETE FROM experiences WHERE id = ? AND owner = ?').bind(input.recordId, user.id),
      ]);
    } else {
      await db.batch([
        db.prepare('DELETE FROM verification_requests WHERE owner_id = ?').bind(user.id),
        // Removing a verifier's contribution must invalidate its confirmation.
        // Preserve the other worker's claim, but remove the recipient identity
        // and response. Their evidence returns to Reported/Supported.
        db.prepare("UPDATE verification_requests SET recipient_email = '', response = NULL, status = 'withdrawn' WHERE recipient_email = ? OR json_extract(response, '$.verifierId') = ?").bind(user.email.toLowerCase(), user.id),
        db.prepare('DELETE FROM experiences WHERE owner = ?').bind(user.id),
      ]);
    }
    return privateJson({ deleted: true, scope: input.scope });
  } catch (error) { return requestFailure(error, 'Deletion did not complete. Please try again.'); }
}
