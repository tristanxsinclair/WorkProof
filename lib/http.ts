export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) {
    throw new RequestError('Invalid request origin.', 403);
  }
}

export async function readJson(request: Request, maxBytes = 1000000): Promise<unknown> {
  checkOrigin(request);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new RequestError('Send JSON data.', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('A request body is required.', 400);
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestError('This request is too large.', 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text); } catch { throw new RequestError('The request contains invalid JSON.', 400); }
}

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' } });
}

export function requestFailure(error: unknown, fallback: string) {
  return privateJson({ error: error instanceof RequestError ? error.message : fallback }, error instanceof RequestError ? error.status : 500);
}
