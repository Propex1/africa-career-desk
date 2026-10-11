import { setTimeout as sleep } from 'node:timers/promises';
import { ORIGIN, REPOSITORY } from './engine.mjs';
import { bounded } from './http.mjs';
export async function verifySite(expected,fetchImpl=fetch,origin=ORIGIN) {
  const read=async path=>{let r;try{r=await fetchImpl(origin+path,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new Error('Production verification request failed');}return r;};
  const marker=await read('/freshness.json?verify='+Date.now());
  if(!marker.ok)throw new Error('Production marker missing');
  const actual=await marker.json();
  if(actual.schemaVersion!==2||actual.fingerprint!==expected.fingerprint||actual.activeJobCount!==expected.jobs.length||
    actual.jobs?.some(j=>j.verifiedDeadline&&j.verifiedDeadline<new Date().toISOString().slice(0,10)))throw new Error('Production content is stale or contains verified-expired jobs');
  const [home,sitemap]=await Promise.all([read('/'),read('/sitemap.xml')]);
  if(!home.ok||!sitemap.ok)throw new Error('Production listing unavailable');
  const h=await home.text(),s=await sitemap.text();
  const slug=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  if(![...expected.jobs,...expected.removed].every(j=>slug(j.slug)))throw new Error('Invalid public job route');
  const errors=await bounded([...expected.jobs.map(j=>({...j,active:true})),...expected.removed.map(j=>({...j,active:false}))],async j=>{
    if(j.active?(!h.includes(j.slug)||!s.includes('/jobs/'+j.slug+'/')):(h.includes(j.slug)||s.includes('/jobs/'+j.slug+'/')))return j.id+': listing/sitemap mismatch';
    const r=await read('/jobs/'+j.slug+'/');
    if(!j.active)return [404,410].includes(r.status)?null:j.id+': removed route remains accessible';
    if(r.status!==200)return j.id+': active detail unavailable';
    const html=(await r.text()).replace(/&amp;/g,'&');
    return html.includes(j.applyUrl)?null:j.id+': Apply URL mismatch';
  },4);
  if(errors.some(Boolean))throw new Error(errors.filter(Boolean).join('; '));
  return {active:expected.jobs.length,removed:expected.removed.length,allRoutesVerified:true};
}
export function hookUrl(value) {
  let u;try{u=new URL(value);}catch{throw new Error('Missing existing Vercel deployment hook');}
  if(u.origin!=='https://api.vercel.com'||u.username||u.password||u.hash||!/^\/v1\/integrations\/deploy\/prj_0sk1RDyLWr9wAwHT4nVJR58MiFoQ\/[A-Za-z0-9_-]+$/.test(u.pathname))throw new Error('Foreign deployment hook refused');
  u.search='?buildCache=false';return u;
}
export async function deployAndVerify({api,sha,expected,since,hook,changed,fetchImpl=fetch,delay=sleep,polls=60,verify=verifySite}) {
  let requested=false,seen=false,lastFailure;
  for(let i=0;i<polls;i++) {
    const deployments=await api('/repos/'+REPOSITORY+'/deployments?sha='+sha+'&environment=Production&per_page=20');
    for(const d of deployments.filter(d=>d.sha===sha&&d.environment==='Production'&&Date.parse(d.created_at)>=since-2000)) {
      seen=true;
      const statuses=await api('/repos/'+REPOSITORY+'/deployments/'+d.id+'/statuses?per_page=10');
      const status=statuses[0];
      if(['failure','error'].includes(status?.state))throw new Error('Vercel Production deployment failed; no retry requested.');
      if(status?.state==='success') {
        try {const result=await verify(expected,fetchImpl);return {deploymentId:d.id,sha,status:'success',...result};}
        catch(e){lastFailure=e.message;}
      }
    }
    // A code/data push normally starts Vercel through its existing Git integration.
    // Use the existing hook once only for expiry-only rebuilds or absent Git deployment.
    if(!requested&&!seen&&(!changed||i>=6)) {
      const u=hookUrl(hook);let r;
      try{r=await fetchImpl(u,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new Error('Deployment hook outcome unknown; no blind retry. Inspect Vercel.');}
      if(!r.ok)throw new Error('Deployment hook refused: HTTP '+r.status);
      const body=await r.json().catch(()=>null);
      if(!body?.job?.id||!['PENDING','RUNNING','SUCCEEDED'].includes(body.job.state))throw new Error('Invalid deployment acknowledgement');
      requested=true;
    }
    await delay(10000);
  }
  throw new Error('No successful, content-verified Production deployment within ten minutes.'+(lastFailure?' '+lastFailure:''));
}
