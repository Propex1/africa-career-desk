import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deployAndVerify,hookUrl,verifySite } from './production.mjs';
const sha='a'.repeat(40),hook='https://api.vercel.com/v1/integrations/deploy/prj_0sk1RDyLWr9wAwHT4nVJR58MiFoQ/test-secret',since=Date.now();
const deployment={id:1,sha,environment:'Production',created_at:new Date(since).toISOString()};
const noDelay=async()=>{};
const expected={fingerprint:'expected',jobs:[{id:'ACD-one',slug:'one',applyUrl:'https://employer.example/job'}],removed:[{id:'ACD-old',slug:'old'}]};
const response=(value,status=200)=>new Response(typeof value==='string'?value:JSON.stringify(value),{status});
test('successful Production status plus matching live content is required',async()=>{
  let checked=false;const api=async p=>p.includes('/statuses')?[{state:'success'}]:[deployment];
  const r=await deployAndVerify({api,sha,expected,since,hook,changed:true,delay:noDelay,verify:async()=>{checked=true;return {active:1};}});
  assert.equal(r.status,'success');assert.ok(checked);
});
test('a failed Production deployment stops immediately, without a hook retry',async()=>{
  let posts=0;await assert.rejects(deployAndVerify({api:async p=>p.includes('/statuses')?[{state:'failure'}]:[deployment],sha,expected,since,hook,changed:true,delay:noDelay,fetchImpl:async()=>posts++}),/failed; no retry/);assert.equal(posts,0);
});
test('hook acceptance alone never proves successful deployment',async()=>{
  let posts=0;await assert.rejects(deployAndVerify({api:async()=>[],sha,expected,since,hook,changed:false,polls:3,delay:noDelay,fetchImpl:async()=>{posts++;return response({job:{id:'one',state:'PENDING'}});}}),/No successful/);assert.equal(posts,1);
});
test('old, preview and foreign-commit deployments cannot verify production',async()=>{
  for(const d of [{...deployment,sha:'b'.repeat(40)},{...deployment,environment:'Preview'},{...deployment,created_at:'2020-01-01'}])await assert.rejects(deployAndVerify({api:async()=>[d],sha,expected,since,hook,changed:true,polls:1,delay:noDelay}),/No successful/);
});
test('successful status with stale public content cannot turn the run green',async()=>{
  await assert.rejects(deployAndVerify({api:async p=>p.includes('/statuses')?[{state:'success'}]:[deployment],sha,expected,since,hook,changed:true,polls:2,delay:noDelay,verify:async()=>{throw new Error('stale');}}),/stale/);
});
test('an interrupted/unknown deployment-hook request is never blindly retried or leaked',async()=>{
  let posts=0;await assert.rejects(deployAndVerify({api:async()=>[],sha,expected,since,hook,changed:false,polls:3,delay:noDelay,fetchImpl:async()=>{posts++;throw new Error(hook);}}),e=>/outcome unknown/.test(e.message)&&!e.message.includes('test-secret'));assert.equal(posts,1);
});
test('foreign or credential-bearing deployment hooks are rejected',()=>{
  for(const u of ['',hook.replace('api.vercel.com','example.com'),hook.replace('https://','https://user:pass@'),hook.replace('prj_0sk1RDyLWr9wAwHT4nVJR58MiFoQ','prj_other')])assert.throws(()=>hookUrl(u));
});
function site({stale=false,removedStatus=404,badApply=false,listedOld=false}={}){return async value=>{const u=new URL(value);if(u.pathname==='/freshness.json')return response({schemaVersion:2,fingerprint:stale?'old':expected.fingerprint,activeJobCount:1,jobs:expected.jobs});if(u.pathname==='/')return response('one'+(listedOld?' old':''));if(u.pathname==='/sitemap.xml')return response('/jobs/one/');if(u.pathname==='/jobs/one/')return response(badApply?'wrong':'https://employer.example/job');return response('',removedStatus);};}
test('public verification checks active and removed routes, Apply URL, home and sitemap',async()=>{assert.deepEqual(await verifySite(expected,site()),{active:1,removed:1,allRoutesVerified:true});});
for(const options of [{stale:true},{removedStatus:200},{removedStatus:503},{badApply:true},{listedOld:true}])test('production mismatch '+JSON.stringify(options)+' fails closed',async()=>{await assert.rejects(verifySite(expected,site(options)));});
test('interrupted publication recovers by verifying current expected content, not reverting history',async()=>{
  const r=await deployAndVerify({api:async p=>p.includes('/statuses')?[{state:'success'}]:[deployment],sha,expected,since,hook,changed:false,delay:noDelay,verify:async()=>verifySite(expected,site())});assert.equal(r.active,1);assert.equal(r.removed,1);
});
