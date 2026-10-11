import { REPOSITORY, REPOSITORY_ID } from './engine.mjs';
export function githubClient(token,fetchImpl=fetch) {
  if(!token)throw new Error('Missing repository-scoped Actions token');
  return async (path,options={})=>{
    if(!path.startsWith('/repos/'+REPOSITORY+'/')&&path!=='/repos/'+REPOSITORY)throw new Error('Foreign API scope refused');
    if(options.method && (options.method!=='POST'||!new RegExp('^/repos/'+REPOSITORY+'/statuses/[a-f0-9]{40}$').test(path)||options.body?.context!==LOCK_CONTEXT||!['pending','error','success'].includes(options.body?.state)))throw new Error('Unapproved GitHub write refused');
    let r;try{r=await fetchImpl('https://api.github.com'+path,{method:options.method||'GET',...(options.body?{body:JSON.stringify(options.body)}:{}),redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});}catch{throw new Error('GitHub request failed');}
    if(!r.ok)throw new Error('GitHub access failed: HTTP '+r.status);
    try{return await r.json();}catch{throw new Error('Invalid GitHub API response');}
  };
}
export async function guard(api,{write=false,env=process.env,expectedSha}={}) {
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPOSITORY||env.GITHUB_REPOSITORY_ID!==String(REPOSITORY_ID)||
    env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||env.ACD_LIFECYCLE_ENABLED!=='true'||
    (write&&env.ACD_LIFECYCLE_WRITES_ENABLED!=='true'))throw new Error('Lifecycle context or gates denied');
  const repo=await api('/repos/'+REPOSITORY);
  if(repo.id!==REPOSITORY_ID||repo.full_name!==REPOSITORY||repo.private!==false||repo.default_branch!=='main'||repo.archived||repo.fork)throw new Error('Wrong public production repository identity');
  const ref=await api('/repos/'+REPOSITORY+'/git/ref/heads/main');
  if(ref.object?.sha!==expectedSha)throw new Error('Production branch advanced; no overwrite permitted');
  return ref.object.sha;
}
// A commit status on a fixed, explicitly configured release SHA is durable across
// future data commits. Missing/unreadable/pending/error states deny all writes.
export const LOCK_CONTEXT='acd/lifecycle-write-lock';
function lockIdentity(env){
  if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPOSITORY||env.GITHUB_REPOSITORY_ID!==String(REPOSITORY_ID)||env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||!/^\d+$/.test(env.GITHUB_RUN_ID||'')||!/^\d+$/.test(env.GITHUB_RUN_ATTEMPT||'')||!/^[a-f0-9]{40}$/.test(env.ACD_LIFECYCLE_LOCK_SHA||''))throw new Error('Invalid persistent write-lock context');
  return {sha:env.ACD_LIFECYCLE_LOCK_SHA,url:'https://github.com/'+REPOSITORY+'/actions/runs/'+env.GITHUB_RUN_ID+'/attempts/'+env.GITHUB_RUN_ATTEMPT};
}
export async function writeLock(api,{operation='inspect',env=process.env}={}){
  const {sha,url}=lockIdentity(env),root='/repos/'+REPOSITORY;
  const combined=await api(root+'/commits/'+sha+'/status?per_page=100');
  if(combined.sha!==sha||!Array.isArray(combined.statuses))throw new Error('Persistent write-lock readback invalid');
  const current=combined.statuses.find(s=>s.context===LOCK_CONTEXT);
  const owned=current?.state==='pending'&&current.target_url===url;
  if(operation==='inspect')return {state:current?.state||'missing',writable:current?.state==='success',owned};
  if(operation==='require'){if(!owned)throw new Error('Persistent write lock denies this run');return current;}
  if(operation==='begin'&&current?.state!=='success')throw new Error('Persistent write lock is closed; explicit recovery clearance required');
  if(!['begin','complete','fail'].includes(operation))throw new Error('Invalid write-lock operation');
  if(operation!=='begin'&&!owned){if(operation==='fail')return {unchanged:true};throw new Error('Only the owning run can complete its write lock');}
  const state=operation==='begin'?'pending':operation==='complete'?'success':'error';
  const result=await api(root+'/statuses/'+sha,{method:'POST',body:{context:LOCK_CONTEXT,state,target_url:url,
    description:operation==='begin'?'Lifecycle write in progress; interrupted runs stay locked':operation==='complete'?'Unlocked after verified persistence and Production':'LOCKED: critical update failure; explicit recovery required'}});
  if(result.state!==state||result.context!==LOCK_CONTEXT||result.target_url!==url)throw new Error('Persistent write-lock acknowledgement failed');
  const verified=await api(root+'/commits/'+sha+'/status?per_page=100');
  const last=verified.statuses?.find(s=>s.context===LOCK_CONTEXT);
  if(verified.sha!==sha||last?.state!==state||last?.target_url!==url)throw new Error('Persistent write-lock readback failed');
  return {state,writable:state==='success'};
}
