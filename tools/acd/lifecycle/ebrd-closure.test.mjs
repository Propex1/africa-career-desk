import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {inspectPage,checkJob,decision} from './sources.mjs';
import {sha,textOnly} from './http.mjs';
const url='https://jobs.ebrd.com/job/Abidjan-Associate-Banker%2C-SME-F%26D/1397868933/';
const job={id:'ACD-0314',title:'Associate Banker, SME F&D',applyUrl:url,sourceUrl:url};
// Selected DOM fragments captured from the official role; wrapper attributes
// were observed on its main ancestor. This is not a full HTTP-body capture.
const fixture=readFileSync(new URL('./fixtures/ebrd-filled-dom.html',import.meta.url),'utf8');
const form='<form><input name="email">Submit application</form>';
const page=body=>({url,finalUrl:url,http:200,body,text:textOnly(body),hash:sha(body),checkedAt:new Date().toISOString()});
test('role-bound EBRD closure takes precedence over retained candidate/alert forms',()=>{
 for(const body of [fixture,fixture+form,fixture.replace('has been filled','is no longer available')])assert.equal(inspectPage(job,page(body)).classification,'VERIFIED CLOSED');
});
test('different title, generic route, footer-only and missing main wrappers cannot authorize closure',()=>{
 for(const body of [fixture.replace('Associate Banker','Different Banker'),fixture.replace('id="content"','id="footer"'),fixture.replace('role="main"','role="contentinfo"'),'<h1>'+job.title+'</h1><footer><p><strong>Sorry, this position has been filled.</strong></p></footer>'])assert.notEqual(inspectPage(job,page(body)).classification,'VERIFIED CLOSED');
 assert.notEqual(inspectPage(job,{...page(fixture),url:'https://jobs.ebrd.com/search/',finalUrl:'https://jobs.ebrd.com/search/'}).classification,'VERIFIED CLOSED');
 assert.notEqual(inspectPage(job,{...page(fixture),finalUrl:'https://jobs.ebrd.com/'}).classification,'VERIFIED CLOSED');
});
test('separate live application form cannot override detail closure and second confirmation is mandatory',async()=>{
 const apply='https://jobs.ebrd.com/talentcommunity/apply/1397868933/',j={...job,applyUrl:apply};let n=0;
 const result=await checkJob(j,async u=>{n++;return u===url?page(fixture+form):{...page('<title>'+job.title+'</title>'+form),url:u,finalUrl:u};},'2026-10-15');
 assert.equal(result.classification,'VERIFIED CLOSED');assert(result.confirmation);assert(n>=3);assert.equal(decision(j,result,'2026-10-15').events.length,1);
 let reads=0;const failed=await checkJob(job,async()=>++reads===1?page(fixture):{...page(''),http:403},'2026-10-15');assert.notEqual(failed.classification,'VERIFIED CLOSED');
});
// checkJob precedence is cross-provider: cover existing closure classifications,
// separate open Apply HTML AND exact Workday API acceptance, not only EBRD.
for(const scenario of [
 {name:'BII',source:'https://isw.changeworknow.co.uk/bii/vms/e/careers/positions/abc123',text:'No Vacancy Found That vacancy is no longer available',kind:'closed'},
 {name:'JazzHR filled',source:'https://example.applytojob.com/apply/1234567890/Investment-Associate',text:'Sorry, this position is no longer available.',kind:'closed'},
 {name:'JazzHR paused',source:'https://example.applytojob.com/apply/1234567890/Investment-Associate',text:'Hiring for this position has been put on hold at this time.',kind:'paused'},
])for(const failConfirmation of [false,true])test(scenario.name+' detail closure vs open Apply/API; confirmation '+(failConfirmation?'fails':'succeeds'),async()=>{
 const apply='https://company.myworkdayjobs.com/en-US/Careers/job/City/Investment-Associate_R123';
 const j={id:'ACD-regression',title:'Investment Associate',sourceUrl:scenario.source,applyUrl:apply};
 let detailReads=0,apiReads=0;
 const response=(u,body,http=200)=>({...page(body),url:u,finalUrl:u,http});
 const result=await checkJob(j,async u=>{
  if(u===scenario.source){detailReads++;return response(u,'<title>'+j.title+'</title>'+scenario.text+'<a href="'+apply+'">Apply</a>',failConfirmation&&detailReads>1?503:200);}
  if(u.includes('/wday/cxs/')){apiReads++;return response(u,JSON.stringify({jobPostingInfo:{title:j.title,jobReqId:'R123',posted:true,canApply:true,endDate:'2026-11-15'}}));}
  if(u===apply)return response(u,'<title>'+j.title+'</title>'+form);
  throw new Error('Unexpected URL '+u);
 },'2026-10-15');
 assert.equal(apiReads,1); assert.equal(detailReads,2);
 if(failConfirmation){assert.match(result.classification,/UNCERTAIN/);assert.equal(decision(j,result,'2026-10-15').events.length,0);}
 else{assert.equal(result.classification,'VERIFIED CLOSED');assert.equal(result.kind,scenario.kind);assert(result.confirmation);assert.equal(decision(j,result,'2026-10-15').events[0].kind,scenario.kind);}
});
