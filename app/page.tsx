import WorkProof from './workproof';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/');return <WorkProof route="capture" user={user.displayName} accountId={user.id}/>;}
