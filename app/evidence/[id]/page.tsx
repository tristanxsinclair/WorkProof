import WorkProof from '../../workproof';
import { requireChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
async function ProtectedRecord({id}:{id:string}){const user=await requireChatGPTUser('/evidence/'+id);return <WorkProof route="detail" recordId={id} user={user.displayName} accountId={user.id}/>;}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProtectedRecord id={id}/>;}
