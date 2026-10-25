import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Opportunity} from '../../../src/types/index.ts';
import {rankJobs,recentJobs,eligibleForOpening,rankingCategory} from '../../../src/lib/job-ranking.ts';
import {parseJobBoardState,serializeJobBoardState} from '../../../src/lib/job-board-state.ts';
const now=new Date('2026-10-25T12:00:00Z');
function job(id:string,roleType:Opportunity['roleType']='Corporate Development, M&A & Strategy',extra:Partial<Opportunity>={}):Opportunity{
 return {id,slug:id,title:id,company:'Example',companyInitials:'E',boardSection:'Jobs',roleType,locationDisplay:'Nairobi',summary:'Role',applyUrl:'https://example.org',sourceUrl:'https://example.org',sourceType:'Company website',applyButtonText:'Apply',status:'Active',publicationStatus:'live',lifecycleStatus:'active',publishedAt:'2026-10-25',lastChecked:'2026-10-25',
 responsibilities:['Lead acquisition due diligence and transaction execution across African markets, coordinating advisers and negotiations.','Build financial models and evaluate investment proposals, capital allocation and valuation scenarios for investment committee decisions.'],
 requirements:['Experience in investment banking or corporate development with demonstrated financial modelling and transaction execution capability.'],...extra};
}
test('a large same-day corporate batch cannot swamp strong recent finance categories',()=>{
 const items=[...Array.from({length:30},(_,i)=>job('c'+i)),...Array.from({length:8},(_,i)=>job('i'+i,'Infrastructure & Project Finance',{publishedAt:'2026-10-22'})),...Array.from({length:4},(_,i)=>job('p'+i,'Private Equity, VC & Private Credit',{publishedAt:'2026-10-20'})),...Array.from({length:4},(_,i)=>job('d'+i,'Development Finance & Multilaterals',{publishedAt:'2026-10-20'})),...Array.from({length:4},(_,i)=>job('m'+i,'Investment Banking & Advisory',{publishedAt:'2026-10-22'})),job('climate','Climate & Impact Investing',{publishedAt:'2026-10-22'})];
 const before=structuredClone(items),ranked=rankJobs(items,now),top=ranked.slice(0,20);
 assert.ok(top.filter(j=>j.roleType==='Corporate Development, M&A & Strategy').length<=7);
 assert.ok(new Set(top.map(rankingCategory)).size>=5);
 assert.equal(ranked.length,items.length);assert.equal(new Set(ranked.map(j=>j.id)).size,items.length);
 assert.deepEqual(items,before);assert.deepEqual(rankJobs([...items].reverse(),now),ranked);
});
test('no stale, expired, weak, unverified or old employer advert is promoted to fill a target',()=>{
 const base=job('ok');assert.ok(eligibleForOpening(base,now));
 for(const extra of [{publishedAt:'2026-10-10'},{publishedAt:undefined},{publishedAt:'2026-10-26'},{lastChecked:'2026-10-10'},{lastChecked:'invalid'},{employerPostedAt:'2026-07-01'},{deadlineDate:'2026-10-24'},{lifecycleStatus:'needs_verification' as const},{publicationStatus:'removed' as const},{responsibilities:['Manage accounts']},{id:'DRAFT-43904592e8cf'}]){
  assert.equal(eligibleForOpening({...base,...extra},now),false,JSON.stringify(extra));
 }
 assert.ok(eligibleForOpening({...base,publishedAt:'2026-10-11',deadlineDate:'2026-10-25'},now));
 const old=job('old','Private Equity, VC & Private Credit',{publishedAt:'2026-09-01'});
 const items=[old,...Array.from({length:25},(_,i)=>job('new'+i))],ranked=rankJobs(items,now);
 assert.equal(ranked.at(-1)?.id,'old');assert.equal(ranked.length,26);
});
test('Most recent is chronological, dates never reset, and empty/diversity-poor pools work',()=>{
 const a=job('a',undefined,{publishedAt:'2026-10-22'}),b=job('b'),c=job('c',undefined,{publishedAt:undefined});
 assert.deepEqual(recentJobs([c,a,b]).map(j=>j.id),['b','a','c']);
 assert.deepEqual(rankJobs([],now),[]);
 assert.deepEqual(rankJobs([c,a,b],now).map(j=>j.id),['b','a','c']);
 assert.deepEqual(rankJobs([c,a,b],new Date('2027-01-01')).map(j=>j.id),['b','a','c']);
});
test('sort URLs preserve explicit recent and deadline with curated as the default',()=>{
 const allowed={regions:[],countries:[],roleTypes:[],experienceBuckets:[],languages:[]};
 assert.equal(parseJobBoardState(new URLSearchParams(),allowed).sort,'curated');
 for(const sort of ['recent','deadline','curated'] as const){
  const state=parseJobBoardState(new URLSearchParams('sort='+sort),allowed);
  assert.equal(state.sort,sort);assert.equal(parseJobBoardState(serializeJobBoardState(state),allowed).sort,sort);
 }
});
