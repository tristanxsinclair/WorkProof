import WorkProof from '../workproof';
import { requireChatGPTUser } from '../chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await requireChatGPTUser('/career');
  return <WorkProof route="career" user={user.displayName} accountId={user.id} />;
}
