import { textOnly, sha } from './http.mjs';
const normalized=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function identity(url) {
  const u=new URL(url),p=u.pathname;
  return p.match(/\/(?:j|careers|positions|Vacancies)\/([a-zA-Z0-9_-]+)/)?.[1] || p.match(/\/apply\/([a-zA-Z0-9]{10})(?:\/|$)/)?.[1] ||
    p.match(/_((?:R-?\d+)|\d+)(?:\.aspx)?$/)?.[1] || u.searchParams.get('jobID') || u.searchParams.get('jobId') || p.match(/\/View\/(DBS[\d-]+)/)?.[1];
}
export function sameJobUrl(a,b) {
  try { const x=new URL(a),y=new URL(b);return x.origin===y.origin && ((identity(a)||identity(b)) ? Boolean(identity(a)&&identity(a)===identity(b)) : x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'') && x.search===y.search); } catch{return false;}
}
function links(page) {
  return [...(page.body||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{try{return[{url:new URL(m[1].replace(/&amp;/g,'&'),page.finalUrl).href,label:textOnly(m[2])}];}catch{return[];}});
}
function form(page) {return /<form\b/i.test(page.body||'')&&/(?:name=["'](?:firstname|firstName|first_name|candidate\[first_name\]|email|candidate_name)|Submit application|Your curriculum vitae|Candidate full name)/i.test(page.body);}
function apiUrl(job) {
  const u=new URL(job.applyUrl);
  if(u.hostname.endsWith('.myworkdayjobs.com')){const parts=u.pathname.split('/').filter(Boolean),site=parts.find(x=>!/^\w\w-\w\w$/.test(x));return u.origin+'/wday/cxs/'+u.hostname.split('.')[0]+'/'+site+'/job/'+u.pathname.split('/job/')[1];}
  if(u.hostname==='www.standardbank.com'&&u.searchParams.get('jobID'))return 'https://api.smartrecruiters.com/v1/companies/StandardBankGroup/postings/'+u.searchParams.get('jobID');
  if(u.hostname.endsWith('.bamboohr.com')&&/^\/careers\/\d+$/.test(u.pathname))return u.origin+u.pathname+'/detail';
  return null;
}
function safeUrl(value){try{const u=new URL(value);for(const k of [...u.searchParams.keys()])if(!['jobID','jobId','id','job','lang'].includes(k))u.searchParams.delete(k);u.hash='';return u.href;}catch{return undefined;}}
function evidence(page,reason) {return {sourceUrl:safeUrl(page.url),checkedAt:page.checkedAt,hash:page.hash,reason};}
export function inspectPage(job,page) {
  const base={classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'No sufficient job-specific evidence of current acceptance.'};
  if(!page||![200,410].includes(page.http)||!page.hash)return {...base,reason:'Request failed or source inaccessible; not evidence of closure.'};
  if(!sameJobUrl(page.url,page.finalUrl))return {...base,reason:'Redirect to a different/generic destination; not evidence of closure.'};
  const u=new URL(page.url),body=page.text||'',title=(page.body||'').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  let closed;
  if(u.hostname.endsWith('.applytojob.com')&&/^\/apply\/[A-Za-z0-9]{10}\//.test(u.pathname)) {
    if(/Hiring for this position has been put on hold at this time\./i.test(body))closed={kind:'paused',reason:'Official job-specific JazzHR page explicitly states hiring is on hold.'};
    else if(/Sorry, this position is no longer available\.?|This position has been filled\./i.test(body))closed={kind:'closed',reason:'Official job-specific JazzHR page explicitly states the position is unavailable or filled.'};
  }
  if(u.hostname==='isw.changeworknow.co.uk'&&/^\/bii\/vms\/e\/careers\/positions\/[^/]+$/.test(u.pathname)&&/No Vacancy Found\s+That vacancy is no longer available/i.test(body))closed={kind:'closed',reason:'Official job-specific BII ATS explicitly states the vacancy is no longer available.'};
  if(u.hostname==='bmcecapital-cand.talent-soft.com'&&/\/imprimer-fiche-emploi-.*_\d+\.aspx$/.test(u.pathname)&&/offre que vous essayez.*n.existe pas ou plus sur ce site/i.test(body))closed={kind:'closed',reason:'Official TalentSoft print view explicitly states this exact requisition no longer exists.'};
  if(closed&&!form(page))return {classification:'VERIFIED CLOSED',...closed,evidence:evidence(page,closed.reason)};
  const titleMatches=normalized(title).includes(normalized(job.title))||body.includes(job.title);

  // Only labelled authoritative deadline fields, never generic dates or JSON-LD validThrough.
  if(page.http===200&&titleMatches){const d=body.match(/Closing Date\s+(20\d{2})\/(\d{2})\/(\d{2})/i),ebrd=body.match(/Posting End Date\s+(\d{2})\/(\d{2})\/(20\d{2})/i),bii=body.match(/Closing Date\s*:\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);let date;
    if(u.hostname==='dbsa.erecruit.co'&&d)date=`${d[1]}-${d[2]}-${d[3]}`;
    if(u.hostname==='jobs.ebrd.com'&&ebrd)date=`${ebrd[3]}-${ebrd[2]}-${ebrd[1]}`;
    if(u.hostname==='isw.changeworknow.co.uk'&&bii)date=new Date(`${bii[2]} ${bii[1]}, ${bii[3]} 00:00:00 GMT`).toISOString().slice(0,10);
    if(validDate(date))base.deadline={date,...evidence(page,`Official labelled application/posting closing date: ${date}. Existing calendar-day UTC rule applies.`)};
  }
  if(page.http===200&&titleMatches&&form(page))return {...base,classification:"VERIFIED OPEN",reason:"Exact job title and job-specific candidate application form are available.",evidence:evidence(page,"Exact vacancy and application form available.")};
  return base;
}
export function inspectApi(job,page) {
  if(page?.http!==200)return null;
  try {
    const data=JSON.parse(page.body),u=new URL(page.url);
    if(u.hostname.endsWith('.myworkdayjobs.com')) {
      const p=data.jobPostingInfo;
      if(!p||normalized(p.title)!==normalized(job.title)||p.jobReqId!==identity(job.applyUrl))return null;
      const open=p.posted===true&&p.canApply===true;
      const date=p.endDate?.slice(0,10),result={classification:open?'VERIFIED OPEN':'UNCERTAIN / SOURCE INACCESSIBLE',reason:open?'Exact Workday requisition reports posted=true and canApply=true.':'Workday does not explicitly accept applications; absence/booleans alone cannot authorize closure.',evidence:evidence(page,'Exact Workday requisition and application flags checked.')};
      if(validDate(date))result.deadline={date,...evidence(page,`Official Workday endDate ${date}; exclusive employer wording retained; conservative UTC calendar-day expiry applies.`)};
      return result;
    }
    if(u.hostname.endsWith('.bamboohr.com')) {const p=data.result?.jobOpening;if(p&&normalized(p.jobOpeningName).startsWith(normalized(job.title))&&p.jobOpeningStatus==='Open')return {classification:'VERIFIED OPEN',reason:'Exact BambooHR job opening explicitly reports Open.',evidence:evidence(page,'Job-specific BambooHR status Open.')};}
    if(u.hostname==='api.smartrecruiters.com'&&String(data.id)===identity(job.applyUrl))return {classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'Exact requisition is published in official API; application acceptance must be checked separately.',apiApply:data.applyUrl};
  } catch { /* Unrecognized or invalid API schema is uncertain. */ }
  return null;
}
export async function checkJob(job,read,today) {
  const observations=[];const get=async url=>{const r=await read(url);observations.push({url:safeUrl(r.url),finalUrl:safeUrl(r.finalUrl),http:r.http,error:r.error,hash:r.hash,checkedAt:r.checkedAt});return r;};
  let detail=await get(job.sourceUrl||job.applyUrl),apply=job.applyUrl===(job.sourceUrl||job.applyUrl)?detail:await get(job.applyUrl);
  let result=inspectPage(job,detail),fromApply=inspectPage(job,apply);
  if(fromApply.classification==='VERIFIED CLOSED'||fromApply.classification==='VERIFIED OPEN'||fromApply.deadline)result=fromApply;
  let api;try{const url=apiUrl(job);if(url)api=inspectApi(job,await get(url));}catch{}
  if(api&&(api.classification==='VERIFIED OPEN'||api.deadline))result={...result,...api};
  // Known TalentSoft redirect: query the exact requisition's print endpoint, not a guessed new job.
  if(new URL(job.applyUrl).hostname==='bmcecapital-cand.talent-soft.com'&&!sameJobUrl(apply.url,apply.finalUrl||apply.url)) {
    const p=await get(job.applyUrl.replace('/emploi-','/imprimer-fiche-emploi-'));const q=inspectPage(job,p);if(q.classification==='VERIFIED CLOSED')result=q;
  }
  // Follow actual Apply destinations. Never infer openness merely from ATS inventory or HTTP 200.
  const destinations=[...links(detail),...links(apply)].filter(l=>/^(?:apply|click here to apply|postuler|candidater)/i.test(l.label)&&/^https:/.test(l.url));
  if(api?.apiApply)destinations.unshift({url:api.apiApply});
  for(const l of [...new Map(destinations.map(x=>[x.url,x])).values()].slice(0,2)) {
    const p=await get(l.url);
    if(normalized(detail.text||'').includes(normalized(job.title))&&p.http===200&&sameJobUrl(p.url,p.finalUrl)&&form(p)&&result.classification!=='VERIFIED CLOSED')result={...result,classification:'VERIFIED OPEN',reason:'Job-specific Apply destination exposes a candidate form.',evidence:evidence(p,'Application form reached from the exact official vacancy.')};
  }
  if(result.classification==='VERIFIED CLOSED') {
    // A second independent GET must reproduce the same explicit authoritative template.
    const second=inspectPage(job,await get(result.evidence.sourceUrl));
    if(second.classification!=='VERIFIED CLOSED'||second.kind!==result.kind)return {...result,classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'Closure not reproduced on confirmation request.',observations};
    result.confirmation=second.evidence;
  }
  // Fix only same-origin, same-requisition redirects that expose a verified live job form.
  if(result.classification==='VERIFIED OPEN'&&apply.http===200&&apply.finalUrl!==apply.url&&sameJobUrl(apply.url,apply.finalUrl)&&identity(apply.url)&&form(apply))result={...result,classification:'INCORRECT APPLY LINK',replacement:apply.finalUrl};
  // Recover I&P's language switch only with the identical slug, exact title, and explicit email application instruction.
  if(detail.http===404&&new URL(detail.url).hostname==='www.ietp.com'&&new URL(detail.url).pathname.startsWith('/en/content/')){
    const p=await get(detail.url.replace('/en/content/','/fr/content/'));
    if(p.http===200&&sameJobUrl(p.url,p.finalUrl)&&normalized(p.text).includes(normalized(job.title))&&/recrutement@ietp\.com/.test(p.text)&&/CV|curriculum/i.test(p.text))result={classification:'INCORRECT APPLY LINK',replacement:p.url,reason:'Same employer and exact role slug/title; official French advert accepts emailed applications.',evidence:evidence(p,'Verified same-vacancy French posting and application invitation.')};
  }
  if(result.deadline) {
    const p=await get(result.deadline.sourceUrl),confirmed=inspectApi(job,p)||inspectPage(job,p);
    if(confirmed?.deadline?.date!==result.deadline.date)return {classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'Deadline could not be reproduced; no automatic mutation.',observations,blockExpiry:true};
    result.deadline.confirmationHash=p.hash;
  }
  if(result.replacement){
    const p=await get(result.replacement);
    if(p.http!==200||!sameJobUrl(p.url,p.finalUrl)||!(form(p)||(/recrutement@ietp\.com/.test(p.text)&&normalized(p.text).includes(normalized(job.title)))))return {classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'Replacement not independently reproduced.',observations};
    result.confirmation=evidence(p,'Replacement vacancy confirmed independently.');
  }
  if(result.deadline&&savedDeadlineEvidence(job)&&result.deadline.date<job.deadlineDate)result={...result,deadline:undefined,classification:'UNCERTAIN / SOURCE INACCESSIBLE',reason:'An earlier source date conflicts with the latest verified deadline/extension. Preserve the later authoritative date; investigate rather than shorten automatically.'};
  const deadline=result.deadline;
  if(deadline&&deadline.date<today&&result.classification!=='VERIFIED CLOSED')result={...result,classification:'VERIFIED EXPIRED',reason:deadline.reason};
  return {...result,observations};
}
export const savedDeadlineEvidence = job => job.verifiedDeadline && validDate(job.verifiedDeadline.deadlineDate) &&
  job.verifiedDeadline.deadlineDate===job.deadlineDate && ['employer','official_ats'].includes(job.verifiedDeadline.authority) &&
  Number.isFinite(Date.parse(job.verifiedDeadline.verifiedAt)) && /^https:\/\//.test(job.verifiedDeadline.sourceUrl) && job.verifiedDeadline.statement?.trim();
export function decision(job,assessment,today) {
  if(assessment.blockExpiry)return {events:[],blocked:true,reason:assessment.reason};
  const rows=[],at=assessment.evidence?.checkedAt||new Date().toISOString();
  const event=(kind,value,evidence)=>({jobId:job.id,kind,...(kind==='deadline'?{authority:evidence.authority||'official_ats'}:{}),...(value?{value}:{}),checkedAt:evidence.checkedAt||at,sourceUrl:evidence.sourceUrl,reason:evidence.reason,evidenceHashes:[evidence.hash,...(evidence.confirmationHash?[evidence.confirmationHash]:[])]});
  if(assessment.classification==='VERIFIED CLOSED'&&assessment.confirmation){const e=event(assessment.kind,undefined,assessment.evidence);e.evidenceHashes.push(assessment.confirmation.hash);rows.push(e);}
  if(assessment.deadline?.confirmationHash&&(!savedDeadlineEvidence(job)||assessment.deadline.date!==job.deadlineDate||assessment.deadline.date<today))rows.push(event('deadline',assessment.deadline.date,assessment.deadline));
  if(assessment.classification==='INCORRECT APPLY LINK'&&assessment.replacement&&assessment.confirmation)rows.push(event('apply',assessment.replacement,assessment.evidence));
  if(savedDeadlineEvidence(job)&&job.deadlineDate<today&&!assessment.deadline&&!assessment.classification.startsWith('VERIFIED CLOSED')) {
    if(assessment.classification==='VERIFIED OPEN')return {events:rows,blocked:true,reason:'Explicit application acceptance conflicts with saved expired deadline; require investigation before production refresh.'};
    rows.push(event('deadline',job.deadlineDate,{sourceUrl:job.verifiedDeadline.sourceUrl,authority:job.verifiedDeadline.authority,reason:job.verifiedDeadline.statement+' Verified saved deadline expired; no authoritative extension observed. Source failure is not used as closure evidence.',hash:sha(JSON.stringify(job.verifiedDeadline)),checkedAt:at}));
  }
  return {events:rows,blocked:false};
}
