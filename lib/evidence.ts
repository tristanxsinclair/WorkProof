import type { SupportReference, VerificationRequest } from './verification';

export type Kind = 'context' | 'situation' | 'action' | 'outcome' | 'metrics' | 'skill' | 'limitation';
export type State = 'USER VERIFIED' | 'DERIVED FROM USER INPUT' | 'MISSING EVIDENCE';
export type Claim = {id:string;kind:Kind;text:string;quote:string;source:'raw'|'context'|'clarification';state:State;rejected:boolean};
// The legacy state name records worker review, never external verification.
export type Experience = {id:string;title:string;context:string;date:string;raw:string;claims:Claim[];clarifications:string[];demo:boolean;createdAt:string;support?:SupportReference[];verifications?:VerificationRequest[]};
export const contexts = ['Retail sales','Hospitality','University','Volunteering','Project','Other'];
export const labels:Record<Kind,string> = {context:'Context',situation:'Situation / problem',action:'Your action',outcome:'Outcome',metrics:'Quantitative evidence',skill:'Skill demonstrated',limitation:'Evidence limitation'};
export const missing = (kind:Kind) => kind === 'outcome' ? 'Outcome not established' : 'Not provided';
// Unknown results and counts are context for a claim, never an achievement.
export function isEvidenceLimitation(text:string){
 const s=text.replace(/[’‘]/g,"'");
 return /\b(?:I|we)\s+(?:(?:do|did)\s+not|don't|didn't)\s+(?:know|see|observe|witness|confirm|verify)\b/i.test(s)
  || /\b(?:I|we)\s+(?:cannot|can't|couldn't|could not)\s+(?:confirm|verify|tell|say|establish)\b/i.test(s)
  || /\b(?:I|we)\s+(?:(?:am|was|are|were)\s+(?:not sure|unsure|uncertain)|(?:am|was|are|were)n't sure)\s+(?:if|whether|how|what)\b/i.test(s)
  || /\b(?:outcome|result|purchase|sale|count|number|amount)\s+(?:is|was|remains)\s+(?:unknown|unconfirmed|uncertain|not confirmed|not known)\b/i.test(s)
  || /\b(?:might|may|could|would|probably|possibly|perhaps|apparently|hopefully)\b/i.test(s)
  || /\b(?:I|we)\s+(?:want|wanted|hope|hoped|plan|planned|intend|intended|aim|aimed|will|think|believe|assume)\b/i.test(s)
  || /\b(?:if I|if we|not yet|haven't|have not|hasn't|has not)\b/i.test(s);
}
function evidenceUnits(sentence:string):string[]{
 for(const match of sentence.matchAll(/,?\s+(?:but|so|and|although)\s+/gi)){
  const tail=sentence.slice(match.index!+match[0].length).trim();
  const head=sentence.slice(0,match.index).trim();
  if(isEvidenceLimitation(tail)&&!isEvidenceLimitation(head)&&/\bI\s+(?:asked|helped|explained|checked|compared|organised|organized|resolved|served|reviewed)\b/i.test(head))return [head,tail];
 }
 return [sentence];
}
function sourceUnits(raw:string){return raw.trim().split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean).flatMap(evidenceUnits);}
// Existing saved records and temporary drafts retain their wording, source IDs,
// and verification decisions; only the incorrectly assigned category changes.
export function normalizeEvidence(record:Experience):Experience {
 let changed=false;
 const claims=record.claims.map(c=>{
  if(['action','outcome','metrics','situation'].includes(c.kind)&&c.state!=='MISSING EVIDENCE'&&isEvidenceLimitation(c.text)){
   changed=true;return {...c,kind:'limitation' as Kind};
  }
  if(c.kind==='metrics'&&c.state!=='MISSING EVIDENCE'&&!hasQuantitativeEvidence(c.text)){
   changed=true;return {...c,kind:'situation' as Kind};
  }
  return c;
 });
 return changed?{...record,claims}:record;
}
const actionVerbs = 'asked|helped|assisted|checked|organised|organized|explained|compared|sorted|prepared|served|reviewed|fixed|resolved|presented|coordinated|supported|showed|recommended|listened|clarified|communicated|scheduled|allocated|tracked|trained|taught|demonstrated|guided|identified|rearranged|updated|restocked|contacted|arranged|learned|learnt|completed|submitted|finished|combined|worked with|double.checked|proofread|troubleshot|took|handled|offered|led|managed|addressed|answered|processed|diagnosed|investigated|researched|tested|designed|built|created|wrote|implemented|negotiated|packed|cleaned|opened|closed|collaborated';
const salesVerbs = 'sold|advised|suggested|greeted|matched|delivered|followed up';
const workerVerb = new RegExp(`\\b(?:I|we|my team and I)\\s+(?:(?:personally|then|also|carefully)\\s+)?(?:${actionVerbs}|${salesVerbs})\\b`, 'i');
const bareVerb = new RegExp(`^(?:${actionVerbs}|${salesVerbs})\\b`, 'i');
const negation = /\b(?:not|never|didn't|did not|couldn't|failed to|wasn't|weren't)\b/i;

export function isWorkerAction(text:string) {
 return !isEvidenceLimitation(text) && (workerVerb.test(text) || bareVerb.test(text));
}

// Apply capability rules to the worker's own clause, not another actor's words.
function workerClause(text:string) {
 const match = text.match(workerVerb);
 return match ? text.slice(match.index).split(/\s+(?:while|but|and)\s+(?:my colleague|my manager|they|he|she)\b/i)[0] : bareVerb.test(text) ? text : '';
}

const skillRules:[string,RegExp][] = [
 ['Communication',/\b(explained|asked|listened|presented|clarified|communicated)\b/i],
 ['Customer service',/\b(helped|assisted|served|supported)\b.*\b(customer|guest|visitor)/i],
 ['Teamwork',/\b(worked with|coordinated with|our group|my team|team members|group members)\b/i],
 ['Organisation',/\b(organised|organized|scheduled|sorted|checklist|allocated|tracked)\b/i],
 ['Problem solving',/\b(resolved|fixed|troubleshoot|troubleshot|alternative|compared)\b/i],
 ['Attention to detail',/\b(checked|reviewed|proofread|double.checked|verified)\b/i],
 ['Needs discovery',/\basked\b.*\b(budget|room|lighting|viewing|requirements|needs|usage|floor types)\b/i],
 ['Consultative selling',/\b(recommended|showed)\b.*\b(suited|suitable|because|requirements|needs|explained why)\b/i],
 ['Product knowledge',/\b(explained|compared)\b.*\b(product|model|technical|features|differences|specifications)\b/i],
 ['Recommendation justification',/\b(recommended|showed)\b.*\b(explained why|because|suited|suitable)\b/i],
 ['Training',/\b(trained|taught|guided|demonstrated)\b.*\b(employee|colleague|starter|process|procedure)\b/i],
 ['Initiative',/\b(identified|noticed)\b.*\b(fixed|resolved|rearranged|updated|restocked)\b/i],
];

export function suggestedCapabilities(quote:string):string[] {
 const clause=workerClause(quote);
 if(!clause || isEvidenceLimitation(clause) || negation.test(clause))return [];
 return skillRules.filter(([,pattern])=>pattern.test(clause)).map(([label])=>label);
}

export function hasQuantitativeEvidence(text:string) {
 // Product specifications and dates describe context, not a count or result.
 const scoped = text.replace(/\b\d+(?:[.,]\d+)?\s*(?:[- ]?inches?|[- ]?inch|cm|mm|hz|khz|ghz|gb|tb|watts?|litres?|liters?|kg|k|p)\b/gi, '')
  .replace(/\b\d+(?:[.,]\d+)?["\u201d]/g, '').replace(/\b\d{4}-\d{2}-\d{2}\b/g, '').replace(/\bin (?:19|20)\d{2}\b/gi, '');
 return !isEvidenceLimitation(text) && /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|hundred)\b/i.test(scoped);
}

export function groundingError(r:Experience):string|null {
 const ids = r.claims.map(c=>c.id);
 if(new Set(ids).size!==ids.length)return 'Each statement needs a unique identifier.';
 for(const c of r.claims.filter(c=>!c.rejected&&c.state!=='MISSING EVIDENCE')) {
  const sourceMatches=c.source==='raw'?(sourceUnits(r.raw).includes(c.quote)||r.raw.trim()===c.quote):c.source==='context'?c.quote===r.context:r.clarifications.includes(c.quote);
  if(!c.quote||!sourceMatches)return 'Each statement needs a matching source.';
  if(c.kind==='skill') {
   if(!suggestedCapabilities(c.quote).includes(c.text)||!r.claims.some(a=>a.kind==='action'&&!a.rejected&&a.state==='USER VERIFIED'&&a.quote===c.quote))return 'This capability needs a retained, reviewed action. Correct its source or reject it.';
  } else if(c.text!==c.quote)return 'Factual statements must match their source. Add a correction in your own words first.';
  if(c.kind==='context'&&c.text!==r.context)return 'The context must match the selected context.';
  if(c.kind==='action'&&!isWorkerAction(c.text))return 'An action must describe something you actually did, not an intention or another person\'s work.';
  if(c.kind==='metrics'&&!hasQuantitativeEvidence(c.text))return 'Product specifications and uncertain numbers are not quantitative evidence.';
 }
 return null;
}
export function extract(raw:string, context:string, date:string, demo=false):Experience {
 const id=crypto.randomUUID(); let n=0;
 const claims:Claim[]=[];
 const add=(kind:Kind,text:string,quote=text,source:Claim['source']='raw')=>claims.push({id:`${id}-${n++}`,kind,text,quote,source,state:'DERIVED FROM USER INPUT',rejected:false});
 add('context',context,context,'context');
 const sentences=sourceUnits(raw);
 for(const s of sentences){
  if(isEvidenceLimitation(s)){add('limitation',s);continue;}
  const outcome=/\b(result was|as a result|ended up|chose|purchased|bought|sold|selected|closed a sale|completed on time|submitted on time|finished on time|thanked|confirmed|feedback was|reduced|increased|resolved|was able to|were able to|we finished|we submitted|they found)\b/i.test(s);
  const action=isWorkerAction(s);
  if(action) add('action',s);
  if(outcome) add('outcome',s);
  if(!action&&!outcome) add('situation',s);
  // Preserve the full sentence: a number without its scope is not evidence.
  if(hasQuantitativeEvidence(s)) add('metrics',s);
 }
 for(const [skill] of skillRules){const source=sentences.find(s=>suggestedCapabilities(s).includes(skill));if(source)add('skill',skill,source);}
 for(const kind of ['situation','action','outcome','metrics','skill'] as Kind[])if(!claims.some(c=>c.kind===kind))claims.push({id:`${id}-${n++}`,kind,text:missing(kind),quote:'',source:'raw',state:'MISSING EVIDENCE',rejected:false});
 return {id,title:'Untitled experience',raw:raw.trim(),context,date,claims,clarifications:[],demo,createdAt:new Date().toISOString()};
}
export const active = (r:Experience) => r.claims.filter(c=>!c.rejected);
export const reviewed = (r:Experience,kind?:Kind)=>active(r).filter(c=>c.state==='USER VERIFIED'&&(!kind||c.kind===kind));
export const verified = reviewed;
export const pending = (r:Experience)=>active(r).filter(c=>c.state==='DERIVED FROM USER INPUT');
export function gaps(r:Experience){return (['context','situation','action','outcome','metrics','skill'] as Kind[]).filter(k=>!active(r).some(c=>c.kind===k&&c.state!=='MISSING EVIDENCE'));}
export function strength(r:Experience){r=normalizeEvidence(r);const has=(k:Kind)=>verified(r,k).length>0;return has('action')&&has('outcome')&&(has('metrics')||has('situation'))?'Detailed':has('action')?'Developing':'Starting point';}
export function canSave(r:Experience){r=normalizeEvidence(r);return pending(r).length===0&&verified(r,'action').length>0&&verified(r,'context').length>0;}
export function resumePhrase(text:string){return text.replace(/^I\s+/i,'').replace(/^my team and I\s+/i,'Contributed within a team: ').replace(/^we\s+/i,'Contributed within a team: ').replace(/^./,c=>c.toUpperCase());}
export function translations(r:Experience){
 r=normalizeEvidence(r);
 const get=(kind:Kind)=>verified(r,kind).filter(c=>c.kind==='skill'||c.text===c.quote);const action=get('action').filter(c=>isWorkerAction(c.text)); const outcome=get('outcome');
 const used=[...action,...outcome.filter(o=>!action.some(a=>a.text===o.text))].filter(c=>c.text===c.quote);
 const skills=get('skill').filter(c=>suggestedCapabilities(c.quote).includes(c.text)&&action.some(a=>a.quote===c.quote));const limitations=get('limitation');
 return {bullet:used.length?used.map(c=>resumePhrase(c.text)).join(' '):'Review your action to create a resume bullet.',ids:used.map(c=>c.id),limitations,star:[{label:'Situation',claims:get('situation')},{label:'Task',claims:[],fallback:'Your specific responsibility or goal is not separately established. Add it when you practise your answer.'},{label:'Action',claims:action},{label:'Result',claims:outcome}],skills,questions:[...(action.length?[{text:'Tell me about a time you took action at work, in study or on a project.',ids:action.map(c=>c.id)}]:[]),...skills.map(c=>({text:`Tell me about a time you demonstrated ${c.text.toLowerCase()}.`,ids:[c.id]})),...(outcome.length?[{text:'What changed as a result of your contribution?',ids:outcome.map(c=>c.id)}]:[])]};
}
export function followups(r:Experience):{kind:Kind;question:string}[]{const g=gaps(r);return [
 ...(g.includes('action')?[{kind:'action' as Kind,question:'What did you personally do?'}]:[]),
 ...(g.includes('outcome')?[{kind:'outcome' as Kind,question:'What changed because of your action, if anything?'}]:[]),
 ...(g.includes('metrics')&&!active(r).some(c=>c.kind==='limitation'&&/how many|number|count|value|amount/i.test(c.text))?[{kind:'metrics' as Kind,question:'How many people, items or transactions were involved? Only add a number you can support.'}]:[]),
 ...(g.includes('situation')?[{kind:'situation' as Kind,question:'What specific problem or situation were you responding to?'}]:[]),
 ].slice(0,3);}
const examples=[
 {id:'demo-retail',title:'Matching a television to a bright room',context:'Retail sales',date:'2026-08-28',raw:'Customer wanted the cheapest 65-inch TV. I asked about the room, viewing distance, lighting and what they normally watched. Their room was really bright so I showed them another model that was better suited to it and explained why. They bought that TV and added delivery.'},
 {id:'demo-hospitality',title:'Keeping a busy handover organised',context:'Hospitality',date:'2026-08-25',raw:'The café was busy during the lunch shift. I worked with a colleague to sort takeaway orders. I checked order numbers before handing over eight orders. We finished the handover with no orders left on the counter.'},
 {id:'demo-university',title:'Getting a group presentation ready',context:'University',date:'2026-08-21',raw:'Our group had four members and a presentation due on Friday. I organised a checklist and asked group members for their slides. I checked the references and combined the slides. We submitted on time.'},
 {id:'demo-volunteering',title:'Helping visitors find their way',context:'Volunteering',date:'2026-08-16',raw:'Some visitors were unsure where to go at a community event. I helped visitors find the registration desk and explained where the activities were. I do not know how many people I helped.'}
];
export function demoRecords():Experience[]{return examples.map(e=>{const r=extract(e.raw,e.context,e.date,true);return {...r,id:e.id,title:e.title,claims:r.claims.map((c,i)=>({...c,id:`${e.id}-${i}`,state:c.state==='MISSING EVIDENCE'?c.state:'USER VERIFIED'}))};});}
