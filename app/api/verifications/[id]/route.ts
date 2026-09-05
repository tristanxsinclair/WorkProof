import { z } from 'zod';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { getRequest, publicRequest } from '@/db/verification';
import { checkOrigin, privateJson, readJson, RequestError, requestFailure } from '@/lib/http';
import type { VerificationResponse } from '@/lib/verification';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const responseSchema = z.object({
  decision: z.enum(['confirmed', 'corrected', 'cannot_verify']),
  relationship: z.enum(['Manager', 'Colleague', 'Tutor', 'Other']).optional(),
  basis: z.enum(['Direct observation', 'Checked supporting material']).optional(),
  correction: z.string().trim().max(2000).default(''), attest: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.decision !== 'cannot_verify' && (!value.relationship || !value.basis)) {
    ctx.addIssue({ code: 'custom', message: 'State your relationship and how you know.' });
  }
  if (value.decision === 'corrected' && value.correction.length < 5) {
    ctx.addIssue({ code: 'custom', message: 'Provide the corrected wording.' });
  }
});

export async function GET(_request: Request, context: Context) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in to view this request.', 401);
    const { id } = await context.params;
    const row = await getRequest(id);
    if (!row || (row.owner_id !== user.id && row.recipient_email !== user.email.toLowerCase())) {
      throw new RequestError('Request unavailable for this account.', 404);
    }
    const role = row.owner_id === user.id ? 'owner' : 'verifier';
    const request = publicRequest(row);
    if (role === 'verifier' && ['expired', 'withdrawn'].includes(request.status)) {
      return privateJson({ unavailable: request.status, role });
    }
    return privateJson({ request, role });
  } catch (error) { return requestFailure(error, 'Could not load the verification request.'); }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in before responding.', 401);
    const { id } = await context.params;
    const row = await getRequest(id);
    if (!row || row.recipient_email !== user.email.toLowerCase()) throw new RequestError('Request unavailable for this account.', 404);
    if (row.owner_id === user.id) throw new RequestError('You cannot externally verify your own claim.', 403);
    const parsed = responseSchema.safeParse(await readJson(request, 10000));
    if (!parsed.success) throw new RequestError('State what you can confirm, how you know, and any correction.', 400);
    const input = parsed.data;
    if (input.decision === 'corrected' && input.correction === publicRequest(row).snapshot.claim.text) {
      throw new RequestError('Enter the corrected wording, or choose Confirm if no correction is needed.', 400);
    }
    const response: VerificationResponse = {
      verifierId: user.id, verifierName: user.displayName, verifierEmail: user.email,
      relationship: input.relationship ?? '', basis: input.basis ?? '',
      correction: input.decision === 'corrected' ? input.correction : '', respondedAt: new Date().toISOString(),
    };
    if (row.status !== 'pending') {
      const previous = row.response ? JSON.parse(row.response) as VerificationResponse : null;
      if (row.status === input.decision && previous?.verifierId === user.id && previous.correction === response.correction
        && previous.relationship === response.relationship && previous.basis === response.basis) {
        return privateJson({ request: publicRequest(row) });
      }
      throw new RequestError('This request is already closed. Your response has not replaced an earlier decision.', 409);
    }
    if (Date.parse(row.expires_at) <= Date.now()) throw new RequestError('This request has expired. Ask the worker for a new request.', 410);
    const result = await getDb().prepare("UPDATE verification_requests SET status = ?, response = ? WHERE id = ? AND status = 'pending' AND expires_at > ?")
      .bind(input.decision, JSON.stringify(response), id, response.respondedAt).run();
    if (!result.meta.changes) throw new RequestError('This request was closed while you were responding.', 409);
    return privateJson({ request: publicRequest((await getRequest(id))!) });
  } catch (error) { return requestFailure(error, 'Could not save your response. Please try again.'); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new RequestError('Sign in before withdrawing a request.', 401);
    checkOrigin(request);
    const { id } = await context.params;
    const row = await getRequest(id);
    if (!row || row.owner_id !== user.id) throw new RequestError('Request unavailable for this account.', 404);
    await getDb().prepare("UPDATE verification_requests SET status = 'withdrawn' WHERE id = ? AND owner_id = ?")
      .bind(id, user.id).run();
    return privateJson({ request: publicRequest((await getRequest(id))!) });
  } catch (error) { return requestFailure(error, 'Could not withdraw this request. Please try again.'); }
}
