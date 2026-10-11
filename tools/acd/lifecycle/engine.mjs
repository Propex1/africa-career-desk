import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { publicModules } from './public-data.mjs';
import { reader, bounded, sha } from './http.mjs';
import { checkJob, decision, savedDeadlineEvidence } from './sources.mjs';
export const DATA='src/data/job-lifecycle.json';
export const REPOSITORY='Propex1/africa-career-desk';
export const REPOSITORY_ID=1290232097;
export const ORIGIN='https://www.africacareerdesk.com';
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
export const today=()=>new Date().toISOString().slice(0,10);
const key=e=>JSON.stringify([e.jobId,e.kind,e.value||'']);
export function removalLimit(value=process.env.ACD_LIFECYCLE_MAX_REMOVALS||'3') {
  if(!/^(?:[1-9]|10)$/.test(String(value)))throw new Error('Removal limit must be an integer from 1 to 10');
  return Number(value);
}
export function deactivations(records,events,live,date) {
  const ids=new Set();
  for(const e of events)if(['closed','paused'].includes(e.kind)||(e.kind==='deadline'&&e.value<date))ids.add(e.jobId);
  for(const current of live.jobs){
    const job=records.find(j=>j.id===current.id),extension=[...events].reverse().find(e=>e.jobId===current.id&&e.kind==='deadline');
    if(job?.publicationStatus==='removed'&&!(job.lifecycleReason==='deadline_passed'&&extension?.value>=date))ids.add(current.id);
  }
  return [...ids].sort();
}
export function makePlan({records,state,assessments,base,mode,live,at=new Date().toISOString(),maxRemovals=removalLimit()}) {
  const date=at.slice(0,10),events=[],blocks=[];
  for(const row of assessments){
    const job=records.find(x=>x.id===row.id);if(!job)throw new Error('Unknown assessed job');
    const result=decision(job,row.assessment,date);
    if(result.blocked)blocks.push({id:job.id,reason:result.reason});
    for(const e of result.events)if(key([...state.events].reverse().find(old=>old.jobId===e.jobId&&old.kind===e.kind)||{})!==key(e))events.push(e);
  }
  const removals=deactivations(records,events,live,date),changed=new Set([...events.map(e=>e.jobId),...removals]);
  if(removals.length>removalLimit(maxRemovals))blocks.push({reason:'Proposed removals exceed the configured initial limit of '+maxRemovals+'; review the complete proposal.'});
  if(changed.size>5)blocks.push({reason:'More than five affected jobs; batch requires investigation before automatic changes.'});
  if(assessments.some(r=>r.assessment.observations?.some(o=>o.error==='Scan budget reached')))blocks.push({reason:'Incomplete scan: execution budget reached.'});
  return {schemaVersion:1,base,mode,at,date,stateHash:sha(JSON.stringify(state)),recordHash:sha(JSON.stringify(records)),live,
    assessments,events,blocks,removals,maxRemovals,counts:assessments.reduce((a,r)=>(a[r.assessment.classification]=(a[r.assessment.classification]||0)+1,a),{})};
}
export function validatePlan(plan,{records,state,base,now=Date.now()}) {
  if(plan?.schemaVersion!==1||plan.base!==base||!/^[a-f0-9]{40}$/.test(base)||plan.date!==today()||
     now-Date.parse(plan.at)>3600000||Date.parse(plan.at)>now+60000||!Number.isFinite(Date.parse(plan.at))||
     plan.stateHash!==sha(JSON.stringify(state))||plan.recordHash!==sha(JSON.stringify(records))||
     !['deadlines','availability'].includes(plan.mode)||plan.maxRemovals!==removalLimit())throw new Error('Stale or incompatible lifecycle plan; no write allowed.');
  const ids=plan.assessments.map(r=>r.id);if(new Set(ids).size!==ids.length)throw new Error('Duplicate assessment');
  const rebuilt=makePlan({records,state,assessments:plan.assessments,base,mode:plan.mode,live:plan.live,at:plan.at,maxRemovals:plan.maxRemovals});
  if(JSON.stringify(rebuilt.events)!==JSON.stringify(plan.events)||JSON.stringify(rebuilt.blocks)!==JSON.stringify(plan.blocks)||JSON.stringify(rebuilt.removals)!==JSON.stringify(plan.removals)||plan.blocks.length)throw new Error('Blocked or altered lifecycle plan');
  const expected=selectJobs(records,plan.live,plan.mode,plan.date).map(j=>j.id).sort();
  if(JSON.stringify([...ids].sort())!==JSON.stringify(expected))throw new Error('Incomplete coverage in lifecycle plan');
  return {...state,events:[...state.events,...plan.events]};
}
export function selectJobs(records,live,mode,date) {
  const liveIds=new Set(live.jobs.map(j=>j.id));
  if([...liveIds].some(id=>!records.some(j=>j.id===id&&j.boardSection==='Jobs')))throw new Error('Production contains jobs absent from this baseline');
  const unique=records.filter(j=>j.boardSection==='Jobs'&&(j.publicationStatus==='live'||(liveIds.has(j.id)&&j.lifecycleReason==='deadline_passed')));
  if(mode==='availability')return unique;
  const horizon=new Date(Date.parse(date+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  return unique.filter(j=>savedDeadlineEvidence(j)&&j.deadlineDate<=horizon);
}
export async function getLive(fetchImpl=fetch) {
  const r=await fetchImpl(ORIGIN+'/freshness.json?lifecycle='+Date.now(),{redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!r.ok)throw new Error('Production freshness endpoint unavailable; deploy the approved implementation before activation.');
  const body=await r.json();
  if(body.schemaVersion!==2||!Array.isArray(body.jobs)||!Array.isArray(body.removed)||body.activeJobCount!==body.jobs.length||!body.jobs.length||
    body.fingerprint!==sha(JSON.stringify({jobs:body.jobs,removed:body.removed})))throw new Error('Invalid production freshness evidence');
  return body;
}
export async function scan({mode,base,live,read=reader(),root=process.cwd()}) {
  if(!['deadlines','availability'].includes(mode))throw new Error('Invalid mode');
  const {records}=publicModules(root),state=json(DATA),date=today();
  const priority=new Set(json('tools/acd/lifecycle/priority.json'));
  const jobs=selectJobs(records,live,mode,date).sort((a,b)=>Number(priority.has(b.id))-Number(priority.has(a.id))||a.id.localeCompare(b.id));
  if(jobs.length>500)throw new Error('Workload exceeds reviewed limit');
  const assessments=await bounded(jobs,async job=>{
    let assessment=await checkJob(job,read,date);
    if(savedDeadlineEvidence(job)&&job.deadlineDate<date&&!assessment.deadline&&!assessment.blockExpiry&&assessment.classification==='UNCERTAIN / SOURCE INACCESSIBLE')assessment={...assessment,classification:'VERIFIED EXPIRED',reason:'Previously verified official deadline has passed; no verified extension was found. Inaccessibility is not closure evidence.'};
    return {id:job.id,employer:job.company,title:job.title,assessment};
  });
  return makePlan({records,state,assessments,base,mode,live});
}
