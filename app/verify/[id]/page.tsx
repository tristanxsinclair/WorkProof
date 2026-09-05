import type { Metadata } from 'next';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import VerificationResponse from './response';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Confirm a work experience | WorkProof', robots: { index: false, follow: false }, referrer: 'no-referrer' };

async function ProtectedRequest({ id }: { id: string }) {
  const user = await requireChatGPTUser(`/verify/${id}`);
  return <VerificationResponse id={id} email={user.email} />;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProtectedRequest id={id} />;
}
