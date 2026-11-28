import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { CAREER_AREAS, isCareerSelection } from "../../../src/data/career-taxonomy.ts";
import { getApprovedCareerClassification, isClassificationMetadata } from "../../../src/lib/career-classification.ts";
import { assessFrameworkV1, type FrameworkInput } from "./framework-v1.ts";
import fixtures from "./policy-fixtures.json" with { type: "json" };
const dir=path.resolve(import.meta.dirname);
const read=(name:string)=>JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));
const saved=read("framework-v1-assessments.json").records;
const report=read("framework-v1-evaluation.json");
const make=(changes:Partial<FrameworkInput>={}):FrameworkInput=>({ id:"synthetic-framework-case", company:"Synthetic organisation", summary:"A specialist finance team supports financial decisions for African investments.", aboutRole:"Synthetic policy control, not a historical vacancy.", responsibilities:["Build financial models and valuation scenarios, assess investment returns and recommend decisions to the investment committee."], requirements:[], sourceUrl:"https://example.test/source",applyUrl:"https://example.test/apply",country:"Kenya",boardSection:"Jobs",...changes });

test("all 23 approved subcategories remain covered by explicitly synthetic activity controls",()=>{
  const covered=new Set<string>();
  for(const row of fixtures.fixtures){
    const value=assessFrameworkV1(make(row.input));
    assert.equal(value.eligibility.decision,row.expectedScope,row.id);
    if("expectedSelection" in row&&row.expectedSelection){
      assert.equal(value.classification.kind,"mapped",row.id);
      if(value.classification.kind==="mapped"){
        assert.equal(value.classification.classification.subcategoryId,row.expectedSelection.subcategoryId,row.id);
        assert.ok(isCareerSelection(value.classification.classification));covered.add(value.classification.classification.subcategoryId);
      }
    }
  }
  assert.deepEqual(covered,new Set(CAREER_AREAS.flatMap(a=>a.subcategories.map(s=>s.id))));
  assert.equal(covered.size,23);assert.equal(CAREER_AREAS.length,7);
});

test("Investment Legal requires direct evidence and mandatory initial editorial review",()=>{
  const legal=assessFrameworkV1(make({title:"Investment Legal Counsel",summary:"Provide legal advice for a private equity investment fund operating across Africa.",responsibilities:["Lead legal execution of investments, negotiate purchase and shareholder agreements and support fund structuring and financing agreements."]}));
  assert.equal(legal.eligibility.decision,"needs-review");assert.equal(legal.eligibility.investmentLegal,"direct-investment-legal");assert.equal(legal.eligibility.editorialReviewRequired,true);
  assert.equal(legal.classification.kind,"mapped");if(legal.classification.kind==="mapped")assert.equal(legal.classification.classification.jobFunction,"Investment Legal");
  assert.ok(legal.publicationReadiness.blockers.includes("investment-legal-editorial-review-required"));
  const generic=assessFrameworkV1(make({title:"Corporate Legal Counsel",summary:"General corporate legal support for an investment services employer in Kenya.",responsibilities:["Review routine commercial contracts, employment agreements and general corporate compliance; manage litigation and legal administration."]}));
  assert.equal(generic.eligibility.decision,"outside-future-scope");assert.equal(generic.classification.kind,"unresolved");
  assert.equal(assessFrameworkV1(make({title:"Investment Legal Counsel",summary:"Investment legal opportunity.",responsibilities:[]})).eligibility.decision,"needs-review");
  const investor=assessFrameworkV1(make({title:"Investment Manager",summary:"Direct private equity investment work across Africa.",responsibilities:["Build financial models, value companies, lead legal execution workstreams with counsel and negotiate investment transaction terms."]}));
  assert.equal(investor.eligibility.investmentLegal,"not-identified");assert.equal(investor.eligibility.decision,"in-scope");
});

test("loan-product sales and administrative collection do not become finance roles from product keywords",()=>{
  for(const responsibilities of [["Sell retail loan and treasury products, cross-sell financial products and meet branch sales targets while collecting loan forms."],["Collect loan forms, perform data entry and administrative loan-file checks, and organise routine customer credit documents."]]){
    const value=assessFrameworkV1(make({title:"Finance Relationship Manager",summary:"Retail product sales and administrative loan services in Kenya.",responsibilities}));
    assert.equal(value.eligibility.decision,"outside-future-scope");assert.equal(value.classification.kind,"unresolved");
  }
});

test("geography requires evidence rather than employer name, foreign location or substring matches",()=>{
  const unknown=assessFrameworkV1(make({company:"Africa Finance Employer",country:"United Kingdom",locationDisplay:"London",summary:"Financial model analysis and data normalisation for institutional decisions.",aboutRole:"No recorded African mandate.",responsibilities:["Build financial models, improve data normalisation and recommend investment decisions for institutional clients."]}));
  assert.equal(unknown.eligibility.checks.africaRelevance,"unknown");assert.equal(unknown.eligibility.decision,"needs-review");
  const clear=assessFrameworkV1(make({country:"United Kingdom",locationDisplay:"London",summary:"An Africa-focused investment fund, based in London, analyses investments in Kenya."}));assert.equal(clear.eligibility.decision,"in-scope");
  const outside=assessFrameworkV1(make({country:"Cambodia",locationDisplay:"Phnom Penh",summary:"Specialist financial modelling exclusively for Cambodia and its domestic investment market.",aboutRole:"The mandate is solely Cambodia domestic financing.",responsibilities:["Build financial models and valuation cases exclusively for Cambodia domestic investments and recommend financing decisions."]}));assert.equal(outside.eligibility.decision,"outside-future-scope");
});

test("expiry, old rejection and missing category remain independent of substantive eligibility",()=>{
  const expired=assessFrameworkV1(make({deadlineDate:"2026-01-31",lifecycleStatus:"closed",publicationStatus:"removed",historicalDecisionReasons:["Do not add — expired vacancy"]}));
  assert.equal(expired.eligibility.decision,"in-scope");assert.equal(expired.publicationReadiness.decision,"not-ready");assert.ok(expired.publicationReadiness.blockers.includes("recorded-deadline-passed"));
  const sovereign=assessFrameworkV1(make({title:"Country Risk Head",company:"Synthetic wholesale bank",summary:"Country and sovereign risk leadership across African credit portfolios.",responsibilities:["Assess sovereign debt sustainability and country limits, model credit risk and recommend cross-border financing risk appetite."]}));assert.equal(sovereign.eligibility.decision,"in-scope");assert.equal(sovereign.classification.kind,"unresolved");
  const missing=assessFrameworkV1(make({summary:"Finance Manager",aboutRole:"",responsibilities:[]}));assert.equal(missing.eligibility.decision,"needs-review");
});

test("substantive FP&A and ESG support qualify without being relabelled primary investment",()=>{
  const fpa=assessFrameworkV1(make({title:"Business Performance Partner",summary:"Business partnering supports finance leaders with profitability decisions.",responsibilities:["Analyse revenue and margin, challenge pricing and cost assumptions, forecast financial results and recommend corrective decisions to executives."]}));
  assert.equal(fpa.eligibility.decision,"in-scope");assert.equal(fpa.classification.kind,"mapped");if(fpa.classification.kind==="mapped"){assert.equal(fpa.classification.classification.subcategoryId,"fpa-finance-leadership");assert.equal(fpa.classification.classification.jobFunction,"FP&A & Business Partnering");}
  const esg=assessFrameworkV1(make({title:"ESG Coordinator",summary:"Specialist ESG due diligence supports an infrastructure investment fund.",responsibilities:["Assess ESG risks during investment due diligence, monitor portfolio environmental commitments and prepare impact reporting."]}));
  assert.equal(esg.eligibility.decision,"in-scope");assert.equal(esg.classification.kind,"mapped");if(esg.classification.kind==="mapped")assert.equal(esg.classification.classification.jobFunction,"Impact & ESG");
});

test("initial historical output preserves all populations, source decisions and no-approval boundary",()=>{
  const oldIndex=read("reference-index.json");const original=oldIndex.recordShards.flatMap((name:string)=>read(name).records);
  assert.equal(saved.length,505);assert.deepEqual(saved.map((x:{id:string})=>x.id),original.map((x:{id:string})=>x.id));
  assert.equal(report.populations.jobs,451);assert.equal(report.populations.nonJobContext,54);assert.equal(report.confirmedMetrics.eligibleExamples,1);
  for(const row of saved){
    const before=original.find((x:{id:string})=>x.id===row.id);assert.equal(row.sourceRevision,before.sourceRevision);assert.deepEqual(row.historicalFacts,before.historicalFacts);assert.deepEqual(row.priorReview,before.previousReview??null);
    assert.equal(row.assessment.publicationReadiness.publicationAction,"none");assert.equal(row.assessment.publicationReadiness.freshVerificationPerformed,false);
    if(row.assessment.classification.kind==="mapped"){assert.ok(isClassificationMetadata(row.assessment.classification.classification));assert.equal(getApprovedCareerClassification(row.assessment.classification.classification),undefined);}
  }
  const legal=saved.filter((x:{assessment:{eligibility:{investmentLegal:string}}})=>x.assessment.eligibility.investmentLegal!=="not-identified");
  assert.deepEqual(legal.map((x:{id:string})=>x.id),["ACD-0250","DRAFT-4142b13c28a8"]);assert.ok(legal.every((x:{assessment:{eligibility:{editorialReviewRequired:boolean}}})=>x.assessment.eligibility.editorialReviewRequired));
  const workbook=read("framework-v1-workbook-assessments.json").records;const source=read("historical-workbook-candidates.json").records;
  assert.equal(workbook.length,130);for(const row of workbook){assert.deepEqual(row.originalDecisions,source.find((x:{id:string})=>x.id===row.id).historicalDecisions);assert.equal(row.labelAuthority,"source-history-only");}
});
