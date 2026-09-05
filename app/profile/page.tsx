import WorkProof from '../workproof';
import { requireChatGPTUser } from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/profile');return <WorkProof route="profile" user={user.displayName} accountId={user.id}/>;}
