import { z } from 'zod';

const kind = z.enum(['context', 'situation', 'action', 'outcome', 'metrics', 'skill', 'limitation']);
const claim = z.object({
  id: z.string().min(1).max(100), kind, text: z.string().min(1).max(10000), quote: z.string().max(10000),
  source: z.enum(['raw', 'context', 'clarification']),
  state: z.enum(['USER VERIFIED', 'DERIVED FROM USER INPUT', 'MISSING EVIDENCE']), rejected: z.boolean(),
});
const safeUrl = z.string().max(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
});
const support = z.object({
  id: z.string().uuid(), claimId: z.string().min(1).max(100), claimText: z.string().min(1).max(10000),
  claimKind: kind, quote: z.string().min(1).max(10000), description: z.string().trim().min(3).max(600), url: safeUrl,
});

export const experienceSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().min(1).max(140),
  context: z.enum(['Retail sales', 'Hospitality', 'University', 'Volunteering', 'Project', 'Other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d),
  raw: z.string().trim().min(1).max(10000), claims: z.array(claim).min(1).max(500),
  clarifications: z.array(z.string().max(10000)).max(200), demo: z.literal(false),
  createdAt: z.string().datetime(), support: z.array(support).max(50).default([]),
});
