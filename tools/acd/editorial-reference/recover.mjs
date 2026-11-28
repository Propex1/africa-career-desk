/** Recover only public-repository history. Does not read private systems or local databases. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const root=process.cwd(), scriptDir=path.join(root,'tools/acd/editorial-reference'), out=path.join(scriptDir,'generated');
fs.mkdirSync(out,{recursive:true});
const ref=process.argv[2]??'58a95fa5212a25fd0719a62c33b11c9e7978153e';
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024,encoding:'utf8'}).trim();
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const commits=git('rev-list','--reverse',ref).split('\n');
const blobs=new Map(),compiled=new Map(),trees=new Map(),sources=new Map(),records=new Map(),projectionGaps=[];
function tree(commit){if(trees.has(commit))return trees.get(commit);const m=new Map();for(const line of git('ls-tree','-r',commit,'--','src','data/imports','data/exports','docs/audits').split('\n')){const x=/^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);if(x)m.set(x[2],x[1]);}trees.set(commit,m);return m;}
function blob(sha){if(!blobs.has(sha))blobs.set(sha,execFileSync('git',['cat-file','blob',sha],{cwd:root,maxBuffer:64*1024*1024}));return blobs.get(sha);}
function record(id){if(!records.has(id))records.set(id,{referenceId:id,observations:[],publicProjectionHistory:[],current:null});return records.get(id);}
function add(id,payload,provenance,kind){const r=record(id),digest=hash(payload);let existing=r.observations.find(x=>x.contentHash===digest&&x.kind===kind);if(existing){existing.provenance.push(provenance);return;}r.observations.push({contentHash:digest,kind,payload,provenance:[provenance]});}
function literal(node,unknown){
 if(ts.isStringLiteralLike(node))return node.text;
 if(ts.isNumericLiteral(node))return Number(node.text);
 if(node.kind===ts.SyntaxKind.TrueKeyword)return true;if(node.kind===ts.SyntaxKind.FalseKeyword)return false;if(node.kind===ts.SyntaxKind.NullKeyword)return null;
 if(ts.isArrayLiteralExpression(node))return node.elements.map(x=>literal(x,unknown));
 if(ts.isObjectLiteralExpression(node)){const result={};for(const p of node.properties){if(!ts.isPropertyAssignment(p)){unknown.push(p.getText().slice(0,150));continue;}const key=p.name.getText().replace(/^['"]|['"]$/g,'');result[key]=literal(p.initializer,unknown);}return result;}
 if(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node))return literal(node.expression,unknown);
 unknown.push(node.getText().slice(0,150));return {$unresolvedExpression:node.getText()};
}
function recoverObjects(source){const text=blob(source.blob).toString('utf8'),ast=ts.createSourceFile(source.path,text,ts.ScriptTarget.Latest,true);function visit(n){if(ts.isObjectLiteralExpression(n)){const names=new Map(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText().replace(/^['"]|['"]$/g,''),p.initializer]));if(['id','title','company'].every(k=>names.has(k)&&ts.isStringLiteralLike(names.get(k)))){const unknown=[];const payload=literal(n,unknown);add(payload.id,payload,{path:source.path,blob:source.blob,firstCommit:source.firstCommit,lastCommit:source.lastCommit,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,unresolvedExpressions:unknown},'tracked-opportunity-literal');}}
 ts.forEachChild(n,visit);}visit(ast);}
function projection(commit){const files=tree(commit),cache=new Map();const timestamp=git('show','-s','--format=%cI',commit);class FixedDate extends Date{constructor(...args){super(...(args.length?args:[timestamp]));}static now(){return new Date(timestamp).getTime();}}
 function load(file){file=path.posix.normalize(file);if(!file.startsWith('src/')||file.includes('..'))throw Error('Module outside src blocked: '+file);if(!files.has(file)){if(files.has(file+'.ts'))file+='.ts';else if(files.has(file+'.json'))file+='.json';else throw Error('Missing tracked dependency '+file);}if(cache.has(file))return cache.get(file).exports;const sha=files.get(file),text=blob(sha).toString('utf8').replace(/^\uFEFF/,'');if(file.endsWith('.json'))return JSON.parse(text);if(!compiled.has(sha))compiled.set(sha,ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);const loadedModule={exports:{}};cache.set(file,loadedModule);const require=name=>{if(name.startsWith('@/'))return load('src/'+name.slice(2));if(name.startsWith('.'))return load(path.posix.join(path.posix.dirname(file),name));throw Error('External module blocked: '+name);};vm.runInNewContext(compiled.get(sha),{require,module:loadedModule,exports:loadedModule.exports,Date:FixedDate,URL,URLSearchParams,structuredClone,process:{env:{}},console:{log(){},warn(){},error(){}}},{filename:file,timeout:2000});return loadedModule.exports;}
 const data=load('src/data/opportunities.ts');const current=Array.isArray(data.OPPORTUNITIES)?data.OPPORTUNITIES:null;
 const live=Array.isArray(data.JOBS)?data.JOBS:[];
 for(const j of live){if(!j.id)continue;const r=record(j.id);r.publicProjectionHistory.push({commit,asOf:timestamp,boardSection:j.boardSection??'Jobs'});}
 if(commit===ref&&current)for(const j of current){record(j.id).current=JSON.parse(JSON.stringify(j));add(j.id,JSON.parse(JSON.stringify(j)),{commit,path:'src/data/opportunities.ts',projection:'OPPORTUNITIES',asOf:timestamp},'current-canonical-record');}
 return {hasCanonical:Boolean(current),jobs:live.length};
}
for(const commit of commits){for(const [file,sha]of tree(commit)){if(!file.startsWith('src/data/')||!file.endsWith('.ts'))continue;const key=file+':'+sha;if(!sources.has(key))sources.set(key,{path:file,blob:sha,firstCommit:commit,lastCommit:commit});else sources.get(key).lastCommit=commit;}try{projection(commit);}catch(e){projectionGaps.push({commit,error:e.message});}}
for(const source of sources.values())recoverObjects(source);
// Preserve every row of every historical tracked import/export workbook, not just CSV companion sheets.
const importArtifacts=[];const seenArtifacts=new Set();
for(const commit of commits)for(const [file,sha]of tree(commit)){if(file.startsWith('docs/audits/')&&file.endsWith('.md')){const key=file+':'+sha;if(!seenArtifacts.has(key)){seenArtifacts.add(key);importArtifacts.push({commit,path:file,blob:sha,format:'markdown-audit',rawText:blob(sha).toString('utf8')});}continue;}if(!file.startsWith('data/')||!['.xlsx','.csv'].some(ext=>file.endsWith(ext)))continue;const key=file+':'+sha;if(seenArtifacts.has(key))continue;seenArtifacts.add(key);const prov={commit,path:file,blob:sha};if(file.endsWith('.xlsx')){const result=spawnSync('python3',[path.join(scriptDir,'xlsx_rows.py')],{input:blob(sha),maxBuffer:32*1024*1024,encoding:'utf8'});if(result.status!==0)throw Error('Workbook read failed '+file+': '+result.stderr);importArtifacts.push({...prov,format:'xlsx',sheets:JSON.parse(result.stdout)});}else importArtifacts.push({...prov,format:'csv',rawText:blob(sha).toString('utf8')});}
const result={schemaVersion:1,sourceRef:ref,reviewDate:'2026-11-28',commitsScanned:commits.length,sourceBlobs:sources.size,projectionGaps,records:[...records.values()].sort((a,b)=>a.referenceId.localeCompare(b.referenceId))};
fs.writeFileSync(path.join(out,'recovered-history.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(out,'import-artifacts.json'),JSON.stringify({schemaVersion:1,sourceRef:ref,artifacts:importArtifacts},null,2)+'\n');console.log(JSON.stringify({commits:commits.length,sourceBlobs:sources.size,records:result.records.length,projected:result.records.filter(r=>r.publicProjectionHistory.length).length,current:result.records.filter(r=>r.current).length,projectionGaps:projectionGaps.length,importArtifacts:importArtifacts.length}));
