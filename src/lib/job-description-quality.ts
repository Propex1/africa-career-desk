import type {Opportunity} from '../types/index.ts';

/** Editorial checks, separate from approval and source/lifecycle verification. */
export function jobDescriptionQuality(job: Pick<Opportunity, 'summary'|'aboutRole'|'responsibilities'|'requirements'>) {
  const words=(s:string|undefined)=>(s?.trim().split(/\s+/).filter(Boolean).length??0);
  const errors:string[]=[],warnings:string[]=[];
  if(!job.summary?.trim())errors.push('Missing summary');
  if(!job.aboutRole?.trim())warnings.push('Missing role context');
  if(job.aboutRole?.trim().toLowerCase()===job.summary?.trim().toLowerCase())errors.push('Role context repeats the summary');
  for(const [name,items] of [['responsibilities',job.responsibilities],['requirements',job.requirements]] as const){
    if(!items?.length)warnings.push('No evidenced '+name);
    if(new Set(items?.map(s=>s.trim().toLowerCase())).size!==(items?.length??0))errors.push('Duplicate '+name);
  }
  const text=[job.summary,job.aboutRole,...job.responsibilities??[],...job.requirements??[]].filter(Boolean).join('\n');
  if(/…|\.\.\.$|\b(?:TODO|TBC|lorem ipsum)\b/im.test(text))errors.push('Truncated text or placeholder');
  if(words(job.summary)<30)warnings.push('Summary needs useful context (target 35–65 words)');
  if(words(job.aboutRole)<40)warnings.push('Role context is thin (target 50–110 words)');
  if((job.responsibilities?.length??0)<5)warnings.push('Fewer than five evidenced responsibilities');
  if((job.requirements?.length??0)<4)warnings.push('Fewer than four evidenced requirements');
  return {errors,warnings};
}
