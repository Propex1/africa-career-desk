import fs from 'node:fs';
import path from 'node:path';
import { publicModules } from './public-data.mjs';
import { DATA, REPOSITORY, git, json, scan, getLive, validatePlan } from './engine.mjs';
import { githubClient, guard, writeLock } from './github.mjs';
import { verifySite, deployAndVerify } from './production.mjs';
const command=process.argv[2],out=path.resolve(process.env.LIFECYCLE_OUTPUT||'.lifecycle-output');
const planFile=path.join(out,'plan.json');
const emit=(file,value)=>{fs.mkdirSync(out,{recursive:true});const body=JSON.stringify(value,null,2)+'\n';if(Buffer.byteLength(body)>1500000)throw new Error('Report exceeds storage cap');fs.writeFileSync(path.join(out,file),body);};
const summary=plan=>{
  const lines=['## Public job lifecycle',`Mode: ${plan.mode}. Checked: ${plan.assessments.length}. Proposed events: ${plan.events.length}. Blockers: ${plan.blocks.length}.`,'',
    ...Object.entries(plan.counts).map(([k,v])=>`- ${k}: ${v}`),'','| Job | Employer / role | Result | Evidence / uncertainty |','|---|---|---|---|',
    ...plan.assessments.map(r=>`| ${r.id} | ${r.employer} / ${r.title} | ${r.assessment.classification} | ${r.assessment.reason} |`)];
  const text=lines.join('\n').replace(/<[^>]*>/g,'');fs.writeFileSync(path.join(out,'report.md'),text);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n');
};
async function context(write,expectedSha) {
  const api=githubClient(process.env.GITHUB_TOKEN);await guard(api,{write,expectedSha});return api;
}
function prepared(plan) {
  const {records}=publicModules(),state=json(DATA),next=validatePlan(plan,{records,state,base:git('rev-parse','HEAD')});
  const p=publicModules(process.cwd(),next),expected=p.snapshot(p.records,new Date().toISOString());return {next,expected};
}
async function main(){
  if(command==='scan') {
    const mode=process.env.LIFECYCLE_MODE||'availability',base=git('rev-parse','HEAD');
    if(process.env.GITHUB_ACTIONS==='true'){const api=await context(false,base);emit('write-lock.json',await writeLock(api));}
    // Local baseline is explicitly labelled and never accepted for a hosted write.
    const local=process.argv.includes('--local-baseline');
    if(local&&process.env.GITHUB_ACTIONS==='true')throw new Error('Hosted baseline bypass denied');
    const p=publicModules(),live=local?p.snapshot(p.records,new Date().toISOString()):await getLive();
    const plan=await scan({mode,base,live});plan.localBaseline=local;
    emit('plan.json',plan);summary(plan);
    if(plan.blocks.length)throw new Error('Lifecycle evidence requires investigation; see report');
    const {expected}=prepared(plan),needs=plan.events.length>0||expected.fingerprint!==live.fingerprint;
    emit('expected.json',expected);
    if(!local&&!needs)emit('production.json',await verifySite(expected));
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`needs_update=${needs}\n`);
    console.log(JSON.stringify({checked:plan.assessments.length,events:plan.events.length,needsUpdate:needs,counts:plan.counts,localBaseline:local}));
  }else if(command==='prepare'){
    const plan=json(planFile),api=await context(true,plan.base);
    if(plan.localBaseline)throw new Error('Local-baseline plan cannot be published');
    if(git('status','--porcelain','--untracked-files=no'))throw new Error('Dirty checkout; refusing preparation');
    const {next,expected}=prepared(plan);
    await writeLock(api,{operation:'begin'});
    if(plan.events.length)fs.writeFileSync(DATA,JSON.stringify(next,null,2)+'\n');
    emit('expected.json',expected);
    emit('prepared.json',{base:plan.base,at:new Date().toISOString(),changed:plan.events.length>0});
  }else if(command==='publish'){
    const plan=json(planFile),prep=json(path.join(out,'prepared.json')),api=await context(true,plan.base);
    await writeLock(api,{operation:'require'});
    if(plan.localBaseline||prep.base!==plan.base||git('rev-parse','HEAD')!==plan.base)throw new Error('Invalid publication context');
    // Reconstruct from committed baseline: tested output must be exactly the approved deterministic data change.
    const baseState=JSON.parse(git('show',plan.base+':'+DATA));
    const baseline=publicModules(process.cwd(),baseState).records;
    const wanted=validatePlan(plan,{records:baseline,state:baseState,base:plan.base});
    if(JSON.stringify(json(DATA))!==JSON.stringify(wanted))throw new Error('Unexpected lifecycle data mutation');
    const changed=git('diff','--name-only');
    if(changed&&changed!==DATA)throw new Error('Unrelated changes refused');
    if(git('diff','--cached','--name-only'))throw new Error('Unexpected staged changes');
    let sha=plan.base;const since=Date.now();
    if(plan.events.length){
      git('add','--',DATA);
      git('-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','-c','core.hooksPath=/dev/null','commit','-m','Maintain verified public job lifecycle');
      if(git('diff-tree','--no-commit-id','--name-only','-r','HEAD')!==DATA)throw new Error('Commit scope violation');
      sha=git('rev-parse','HEAD');
      await guard(api,{write:true,expectedSha:plan.base});
      await writeLock(api,{operation:'require'});
      // Explicit destination; no force, no cross-repository state, no credentials in argv.
      git('push','https://github.com/'+REPOSITORY+'.git','HEAD:refs/heads/main');
    }
    emit('publication.json',{base:plan.base,sha,since,changed:plan.events.length>0});
    // Guard against an independent publication overtaking this build.
    const ref=await api('/repos/'+REPOSITORY+'/git/ref/heads/main');if(ref.object.sha!==sha)throw new Error('Concurrent publication detected; no deployment hook requested');
    const stored=await api('/repos/'+REPOSITORY+'/contents/'+DATA+'?ref='+sha);
    if(stored.encoding!=='base64'||Buffer.from(stored.content,'base64').toString('utf8')!==fs.readFileSync(DATA,'utf8'))throw new Error('Remote lifecycle data readback failed');
    await writeLock(api,{operation:'require'});
    const result=await deployAndVerify({api,sha,expected:json(path.join(out,'expected.json')),since,hook:process.env.VERCEL_DEPLOY_HOOK_URL,changed:plan.events.length>0});
    emit('production.json',result);
    emit('write-lock.json',await writeLock(api,{operation:'complete'}));
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\nProduction verified: ${result.active} active jobs. Commit: ${result.sha}. Applied lifecycle events: ${plan.events.length}. Deployment: ${result.deploymentId}.\n`);
    console.log(JSON.stringify(result));
  }else if(command==='lock-failure'){
    const api=githubClient(process.env.GITHUB_TOKEN);emit('write-lock.json',await writeLock(api,{operation:'fail'}));
  }else throw new Error('Use scan, prepare, publish or lock-failure');
}
main().catch(error=>{ // Errors generated above are sanitized; never print raw Git/network errors or command arguments.
  const message=error?.stderr||error?.cmd?'Git operation failed; no automatic force/rebase/retry. Inspect branch status.':String(error.message).replace(/https:\/\/api\.vercel\.com\/\S+/g,'[redacted deployment hook]');
  fs.mkdirSync(out,{recursive:true});emit('failure.json',{at:new Date().toISOString(),message});console.error(message);process.exitCode=1;
});
