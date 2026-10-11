import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectPage,inspectApi,checkJob,decision,sameJobUrl } from './sources.mjs';
import { sha,textOnly,reader,publicAddress,allowedUrl } from './http.mjs';
import { makePlan,validatePlan,selectJobs,removalLimit,REPOSITORY,REPOSITORY_ID,today } from './engine.mjs';
import { publicModules } from './public-data.mjs';
import { guard,githubClient,writeLock,LOCK_CONTEXT } from './github.mjs';
import { lifecycleOverrides } from '../../../src/lib/job-lifecycle.ts';
const date=today(),at=date+'T10:00:00Z',base='a'.repeat(40),hash='a'.repeat(64);
const job={id:'ACD-test',title:'Investment Associate',company:'Example',slug:'example',boardSection:'Jobs',publicationStatus:'live',applyUrl:'https://example.applytojob.com/apply/1234567890/Investment-Associate'};
const page=(body,url=job.applyUrl,http=200)=>({url,finalUrl:url,http,body,text:textOnly(body),hash:sha(body),checkedAt:new Date().toISOString()});
const closed=page('<title>Position unavailable</title>Sorry, this position is no longer available.');
const paused=page('<title>Position on hold</title>Hiring for this position has been put on hold at this time.');
const open=page('<title>Investment Associate</title><form><input name="email">Submit application</form>');
for(const [name,p,kind] of [['confirmed closure',closed,'closed'],['hiring on hold',paused,'paused']])test(name+' requires two job-specific authoritative responses',async()=>{
  const a=await checkJob(job,async()=>p,date);assert.equal(a.classification,'VERIFIED CLOSED');assert.equal(a.kind,kind);
  assert.equal(decision(job,a,date).events[0].kind,kind);assert.equal(decision(job,{...a,confirmation:undefined},date).events.length,0);
});
for(const code of [403,404,429,500])test('temporary HTTP '+code+' never closes a vacancy',async()=>{
  const a=await checkJob(job,async()=>page(closed.body,job.applyUrl,code),date);assert.match(a.classification,/UNCERTAIN/);assert.equal(decision(job,a,date).events.length,0);
});
test('generic redirects and unrelated requisition IDs remain uncertain',async()=>{
  assert.equal(sameJobUrl('https://example.com/job?jobID=1','https://example.com/job?jobID=2'),false);
  assert.equal(sameJobUrl(job.applyUrl,'https://example.applytojob.com/apply'),false);
  const a=await checkJob(job,async()=>({...closed,finalUrl:'https://example.applytojob.com/'}),date);assert.match(a.classification,/UNCERTAIN/);
});
test('HTTP 200 inventory, login pages and false closure footer with an active form do not close',()=>{
  for(const p of [page('HTTP 200 Careers'),page('Please log in'),page(open.body+closed.body)])assert.notEqual(inspectPage(job,p).classification,'VERIFIED CLOSED');
  assert.match(inspectPage(job,page('Listed in ATS inventory')).classification,/UNCERTAIN/);
});
test('a failed confirmation request blocks closure',async()=>{
  let n=0;const a=await checkJob(job,async()=>++n===1?closed:page('',job.applyUrl,403),date);assert.match(a.classification,/UNCERTAIN/);assert.equal(decision(job,a,date).events.length,0);
});
test('unrecognized or wrong-title Workday responses cannot authorize closure or deadline changes',()=>{
  const j={...job,applyUrl:'https://example.wd3.myworkdayjobs.com/jobs/job/City/Associate_R123'};
  for(const info of [{title:'Different job',jobReqId:'R123',posted:true,canApply:true},{title:job.title,jobReqId:'R999',endDate:'2020-01-01'}])assert.equal(inspectApi(j,page(JSON.stringify({jobPostingInfo:info}),j.applyUrl)),null);
  const a=inspectApi(j,page(JSON.stringify({jobPostingInfo:{title:job.title,jobReqId:'R123',posted:false,canApply:false}}),j.applyUrl));assert.match(a.classification,/UNCERTAIN/);
});
test('labelled deadline is confirmed twice and extended deadlines supersede old dates',async()=>{
  const j={...job,applyUrl:'https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS2601-1',deadlineDate:'2026-01-01'};
  const p=page('<title>Investment Associate</title>Closing Date 2099/10/16',j.applyUrl);
  const a=await checkJob(j,async()=>p,date);assert.equal(a.deadline.date,'2099-10-16');assert.equal(decision(j,a,date).events[0].value,'2099-10-16');
  const expired=await checkJob(j,async()=>page(p.body.replace('2099/10/16','2020/01/01'),j.applyUrl),date);assert.equal(expired.classification,'VERIFIED EXPIRED');
  assert.equal(decision(j,expired,date).events[0].kind,'deadline');
});
test('an unconfirmed deadline cannot authorize expiry',async()=>{
  const j={...job,applyUrl:'https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS2601-1'};let n=0;
  const a=await checkJob(j,async()=>++n===1?page('<title>Investment Associate</title>Closing Date 2020/01/01',j.applyUrl):page('',j.applyUrl,403),date);
  assert.equal(decision(j,a,date).blocked,true);
});
test('saved authoritative expiry survives inaccessible sources; unverified dates do not',()=>{
  const uncertain={classification:'UNCERTAIN / SOURCE INACCESSIBLE',observations:[]};
  const j={...job,deadlineDate:'2020-01-01',verifiedDeadline:{deadlineDate:'2020-01-01',verifiedAt:'2020-01-01',authority:'employer',sourceUrl:job.applyUrl,statement:'Applications close 1 January 2020'}};
  assert.equal(decision(j,uncertain,date).events[0].kind,'deadline');
  assert.equal(decision(j,uncertain,date).events[0].authority,'employer');
  assert.equal(decision({...j,verifiedDeadline:undefined},uncertain,date).events.length,0);
  assert.equal(decision(j,{classification:'VERIFIED OPEN'},date).blocked,true);
});
test('same-ID Apply correction requires an independently confirmed live form',async()=>{
  const a=await checkJob(job,async url=>({...open,url,finalUrl:job.applyUrl.replace('Investment-Associate','Investment-Associate-New')}),date);
  assert.equal(a.classification,'INCORRECT APPLY LINK');assert.equal(decision(job,a,date).events[0].kind,'apply');
  assert.equal(decision(job,{...a,confirmation:undefined},date).events.length,0);
});
test('SSRF and credential-bearing sources are rejected, including redirect targets',async()=>{
  for(const u of ['http://example.com','https://user:pass@example.com','https://127.0.0.1','https://company.linkedin.com/a'])assert.throws(()=>allowedUrl(u));
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','192.168.1.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false);
  let calls=0;const read=reader({delay:async()=>{},resolve:async()=>[{address:'127.0.0.1'}],fetchImpl:async()=>{calls++;}});
  assert.ok((await read('https://example.com')).error);assert.equal(calls,0);
});
test('GET retries are bounded; source failure remains uncertain',async()=>{
  let calls=0;const read=reader({delay:async()=>{},resolve:async()=>[{address:'93.184.216.34'}],fetchImpl:async()=>{calls++;return new Response('unavailable',{status:503});}});
  const r=await read('https://example.com');assert.equal(calls,2);assert.equal(r.http,503);
});
const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:REPOSITORY,GITHUB_REPOSITORY_ID:String(REPOSITORY_ID),GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',ACD_LIFECYCLE_ENABLED:'true',ACD_LIFECYCLE_WRITES_ENABLED:'true'};
const api=async p=>p.endsWith('/main')?{object:{sha:base}}:{id:REPOSITORY_ID,full_name:REPOSITORY,private:false,default_branch:'main'};
test('actual reference access, identity and both gates are required for writes',async()=>{
  assert.equal(await guard(api,{env,write:true,expectedSha:base}),base);
  for(const change of [{GITHUB_REPOSITORY:'Propex1/acd-monitoring-private'},{GITHUB_REPOSITORY_ID:'1'},{GITHUB_REF:'refs/heads/other'},{GITHUB_EVENT_NAME:'push'},{ACD_LIFECYCLE_WRITES_ENABLED:'false'},{ACD_LIFECYCLE_ENABLED:'false'}])await assert.rejects(guard(api,{env:{...env,...change},write:true,expectedSha:base}));
  await assert.rejects(guard(async p=>({...await api(p),private:true}),{env,write:true,expectedSha:base}));
  await assert.rejects(guard(async()=>{throw new Error('403');},{env,expectedSha:base}));
  await assert.rejects(guard(api,{env,expectedSha:'b'.repeat(40)}));
});
test('API token stays on the exact GitHub repository and raw errors are suppressed',async()=>{
  const client=githubClient('secret',async()=>{throw new Error('secret');});
  await assert.rejects(client('/repos/other/repo'),/Foreign/);await assert.rejects(client('/repos/'+REPOSITORY),e=>!e.message.includes('secret'));
});
test('every active/new job is selected and previously uncertain jobs are never dropped',()=>{
  const {records,snapshot}=publicModules(),live=snapshot(records,new Date().toISOString());
  const jobs=selectJobs(records,live,'availability',date);assert.equal(jobs.length,live.jobs.length);
  assert.equal(selectJobs([...records,{...job,id:'ACD-new'}],live,'availability',date).length,live.jobs.length+1);
});
test('plans are deterministic, preserve history, reject incomplete scans, tampering and stale baselines',async()=>{
  const assessment=await checkJob(job,async()=>closed,date),records=[job],state={schemaVersion:1,events:[]},live={jobs:[{id:job.id}]};
  const plan=makePlan({records,state,assessments:[{id:job.id,assessment}],base,mode:'availability',live});
  const next=validatePlan(plan,{records,state,base});assert.equal(next.events.length,1);assert.equal(state.events.length,0);
  assert.throws(()=>validatePlan({...plan,base:'b'.repeat(40)},{records,state,base}));
  assert.throws(()=>validatePlan({...plan,events:[]},{records,state,base}));
  assert.throws(()=>validatePlan({...plan,at:'2020-01-01'},{records,state,base}));
  assert.throws(()=>validatePlan({...plan,assessments:[],events:[]},{records,state,base}));
  const retry=makePlan({records,state:next,assessments:[{id:job.id,assessment}],base,mode:'availability',live});assert.equal(retry.events.length,0);
});
test('mass changes and exhausted network budget cannot be auto-applied',()=>{
  const records=Array.from({length:6},(_,i)=>({...job,id:'ACD-'+i})),assessment={classification:'VERIFIED CLOSED',kind:'closed',evidence:{checkedAt:at,sourceUrl:job.applyUrl,reason:'closed',hash},confirmation:{hash}};
  const p=makePlan({records,state:{events:[]},assessments:records.map(j=>({id:j.id,assessment})),base,mode:'availability',live:{jobs:[]}});assert.ok(p.blocks.length);
});
test('lifecycle overlay preserves all 229 original records and publication timestamps; pause remains explicit',()=>{
  const {records}=publicModules();assert.ok(records.length>=229);const original=JSON.stringify(records),j=records.find(j=>j.publicationStatus==='live'&&j.boardSection==='Jobs');
  const e={jobId:j.id,kind:'paused',checkedAt:new Date().toISOString(),sourceUrl:j.applyUrl,reason:'Authoritative hiring pause',evidenceHashes:[hash]};
  const overrides=lifecycleOverrides({schemaVersion:1,events:[e]},records);assert.match(overrides.closures[j.id].reason,/not permanently closed/);assert.equal(JSON.stringify(records),original);
  assert.throws(()=>lifecycleOverrides({schemaVersion:1,events:[{...e,jobId:'unknown'}]},records));
  assert.throws(()=>lifecycleOverrides({schemaVersion:1,events:[{...e,sourceUrl:'http://example.com'}]},records));
});
test('the three authoritative 11 October audit removals replay conservatively',async()=>{
  const fs=await import('node:fs');const rows=JSON.parse(fs.readFileSync('tools/acd/lifecycle/audit-fixtures.json','utf8'));
  for(const r of rows){const j={...job,applyUrl:r.url};const a=await checkJob(j,async()=>r,date);assert.equal(a.classification,'VERIFIED CLOSED',r.id);assert.equal(a.kind,r.id==='ACD-0139'?'paused':'closed');}
});
test('an inferred display date becomes authoritative only after repeated official verification',async()=>{
  const j={...job,deadlineDate:'2099-10-16',applyUrl:'https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS2601-1'};
  const a=await checkJob(j,async()=>page('<title>Investment Associate</title>Closing Date 2099/10/16',j.applyUrl),date);
  const e=decision(j,a,date).events[0];assert.equal(e.kind,'deadline');assert.equal(e.evidenceHashes.length,2);
});
test('projection changes, interrupted-state recovery and rollback retain identities and publication history',()=>{
  const empty={schemaVersion:1,events:[]},before=publicModules(process.cwd(),empty),live=before.records.filter(j=>j.boardSection==='Jobs'&&j.publicationStatus==='live');
  const common={checkedAt:new Date().toISOString(),reason:'Fixture: authoritative evidence confirmed',evidenceHashes:[hash,hash]};
  const events=[{...common,jobId:live[0].id,sourceUrl:live[0].applyUrl,kind:'paused'},{...common,jobId:live[1].id,sourceUrl:live[1].applyUrl,kind:'deadline',value:'2020-01-01'},{...common,jobId:live[2].id,sourceUrl:live[2].applyUrl,kind:'apply',value:'https://example.com/verified-job'}];
  const restored=JSON.parse(JSON.stringify({schemaVersion:1,events}));
  const after=publicModules(process.cwd(),restored);
  assert.equal(after.records.length,before.records.length);
  assert.equal(after.snapshot(after.records,new Date().toISOString()).activeJobCount,live.length-2);
  for(const old of before.records){const current=after.records.find(j=>j.id===old.id);assert.ok(current);assert.equal(current.publishedAt,old.publishedAt);if(!events.some(e=>e.jobId===old.id))assert.deepEqual(current,old);}
  assert.match(after.records.find(j=>j.id===live[0].id).closureReason,/paused, not permanently closed/);
  assert.deepEqual(publicModules(process.cwd(),empty).records,before.records);
  assert.throws(()=>publicModules(process.cwd(),{schemaVersion:1,events:[{jobId:live[0].id}]}));
});
test('complete coverage includes jobs expired since the previous served production snapshot',()=>{
  const j={...job,publicationStatus:'removed',lifecycleReason:'deadline_passed',deadlineDate:'2020-01-01',verifiedDeadline:{deadlineDate:'2020-01-01',verifiedAt:'2020-01-01',authority:'employer',sourceUrl:job.applyUrl,statement:'Closes 1 January 2020'}};
  assert.equal(selectJobs([j],{jobs:[{id:j.id}]},'deadlines',date).length,1);
  assert.equal(selectJobs([{...j,lifecycleReason:'verified_closed'}],{jobs:[{id:j.id}]},'availability',date).length,0);
});
test('an older page cannot silently reverse a previously verified deadline extension',async()=>{
  const url='https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS2601-1';
  const j={...job,applyUrl:url,deadlineDate:'2099-10-16',verifiedDeadline:{deadlineDate:'2099-10-16',verifiedAt:date,authority:'official_ats',sourceUrl:url,statement:'Extended to 16 October 2099'}};
  const a=await checkJob(j,async()=>page('<title>Investment Associate</title>Closing Date 2020/01/01',url),date);
  assert.match(a.classification,/UNCERTAIN/);assert.equal(a.deadline,undefined);assert.equal(decision(j,a,date).events.length,0);
});
test('verified deadline expirations are included in the initial removal cap',()=>{
  const records=Array.from({length:8},(_,i)=>({...job,id:'ACD-'+i,deadlineDate:'2020-01-01',verifiedDeadline:{deadlineDate:'2020-01-01',verifiedAt:'2020-01-01',authority:'employer',sourceUrl:job.applyUrl,statement:'Closes 1 January 2020'}}));
  const assessments=records.map(j=>({id:j.id,assessment:{classification:'VERIFIED EXPIRED'}}));
  const p=makePlan({records,state:{schemaVersion:1,events:[]},assessments,base,mode:'deadlines',live:{jobs:records.map(j=>({id:j.id}))}});
  assert.equal(p.events.length,8);assert.equal(p.removals.length,8);assert.ok(p.blocks.some(b=>b.reason.includes("limit of 3")));
});

test('removal limit is configurable and pending production removals cannot evade it',()=>{
  assert.equal(removalLimit(),3);for(const v of ['0','11','NaN','-1','3.5'])assert.throws(()=>removalLimit(v));
  const records=Array.from({length:4},(_,i)=>({...job,id:'ACD-'+i,publicationStatus:'removed',lifecycleReason:'deadline_passed'}));
  const args={records,state:{schemaVersion:1,events:[]},assessments:[],base,mode:'deadlines',live:{jobs:records.map(j=>({id:j.id}))}};
  const p=makePlan(args);assert.equal(p.events.length,0);assert.equal(p.removals.length,4);assert.ok(p.blocks.length);
  assert.equal(makePlan({...args,maxRemovals:4}).blocks.length,0);
});
const lockEnv={...env,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',ACD_LIFECYCLE_LOCK_SHA:base};
function lockStore(initial={state:'success',context:LOCK_CONTEXT,target_url:'https://github.com/'+REPOSITORY}){
  let latest=initial;const writes=[];
  const api=async (p,options={})=>{if(options.method){assert.equal(p,'/repos/'+REPOSITORY+'/statuses/'+base);latest=structuredClone(options.body);writes.push(latest);return latest;}
    return {sha:base,statuses:latest?[latest]:[]};};return {api,writes,get:()=>latest,set:v=>latest=v};
}
test('persistent failure lock survives independent runs and requires explicit recovery clearance',async()=>{
  const store=lockStore();await writeLock(store.api,{operation:'begin',env:lockEnv});
  assert.equal(store.get().state,'pending');assert.equal((await writeLock(store.api,{env:lockEnv})).writable,false);
  await writeLock(store.api,{operation:'fail',env:lockEnv});assert.equal(store.get().state,'error');
  const next={...lockEnv,GITHUB_RUN_ID:'124'};
  await assert.rejects(writeLock(store.api,{operation:'begin',env:next}),/explicit recovery/);
  await assert.rejects(writeLock(store.api,{operation:'complete',env:next}),/owning run/);
  store.set({state:'success',context:LOCK_CONTEXT,target_url:'https://github.com/'+REPOSITORY}); // Explicit authorized recovery.
  await writeLock(store.api,{operation:'begin',env:next});await writeLock(store.api,{operation:'require',env:next});
  await writeLock(store.api,{operation:'complete',env:next});assert.equal(store.get().state,'success');
});
test('interrupted update leaves durable pending lock; missing or inaccessible lock fails closed',async()=>{
  const store=lockStore();await writeLock(store.api,{operation:'begin',env:lockEnv});
  await assert.rejects(writeLock(store.api,{operation:'begin',env:{...lockEnv,GITHUB_RUN_ATTEMPT:'2'}}));
  await assert.rejects(writeLock(lockStore(null).api,{operation:'begin',env:lockEnv}));
  await assert.rejects(writeLock(async()=>{throw new Error('403');},{operation:'begin',env:lockEnv}));
  await assert.rejects(writeLock(store.api,{operation:'begin',env:{...lockEnv,ACD_LIFECYCLE_LOCK_SHA:''}}));
});
test('uncertain sources do not activate the lock; only current owner may change a pending lock',async()=>{
  const store=lockStore();assert.equal(decision(job,{classification:'UNCERTAIN / SOURCE INACCESSIBLE'},date).events.length,0);
  assert.equal((await writeLock(store.api,{operation:'fail',env:lockEnv})).unchanged,true);assert.equal(store.writes.length,0);
  await writeLock(store.api,{operation:'begin',env:lockEnv});
  assert.equal((await writeLock(store.api,{operation:'fail',env:{...lockEnv,GITHUB_RUN_ID:'999'}})).unchanged,true);assert.equal(store.get().state,'pending');
});
test('status API helper refuses writes outside the exact lock context',async()=>{
  const client=githubClient('test-token',async()=>new Response('{}'));
  await assert.rejects(client('/repos/'+REPOSITORY+'/statuses/'+base,{method:'POST',body:{context:'Vercel',state:'success'}}),/Unapproved/);
  await assert.rejects(client('/repos/'+REPOSITORY+'/contents/file',{method:'PUT',body:{context:LOCK_CONTEXT}}),/Unapproved/);
});
