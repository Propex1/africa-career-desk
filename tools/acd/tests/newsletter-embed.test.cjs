const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/components/NewsletterPromptProvider.tsx', 'utf8');
const start = source.indexOf('    if (!shouldPrepare || !hostRef.current) return;');
const end = source.indexOf('  }, [loadKey, shouldPrepare]);', start);
assert.ok(start > 0 && end > start);
const body = ts.transpile(source.slice(start, end), {target: ts.ScriptTarget.ES2020});
function setup() {
  let status, appended = false, removed = false;
  const timers = new Map(), listeners = new Map(), events = new Map(), sent = [];
  const frame = {style:{}, contentWindow:{postMessage:(...args)=>sent.push(args)}, addEventListener:(k,v)=>events.set(k,v), removeEventListener:k=>events.delete(k), remove(){removed=true}};
  const context = {shouldPrepare:true,hostRef:{current:{appendChild(el){assert.equal(el,frame);appended=true}}},setStatus:v=>status=v,
    EMBED_LOAD_TIMEOUT_MS:12000,BEEHIIV_ORIGIN:'https://subscribe-forms.beehiiv.com',BEEHIIV_FORM_URL:'https://subscribe-forms.beehiiv.com/v3/forms/example',
    document:{createElement(tag){assert.equal(tag,'iframe');return frame}},
    window:{setTimeout(cb){timers.set(1,cb);return 1},clearTimeout:id=>timers.delete(id),addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)}};
  const cleanup=vm.runInNewContext('(function(){'+body+'})()',context);
  return {frame,sent,cleanup,timers,events,listeners,get status(){return status},get appended(){return appended},get removed(){return removed},message(type,payload={},origin=context.BEEHIIV_ORIGIN,source=frame.contentWindow){listeners.get('message')({origin,source,data:{type,payload}})}};
}
let t=setup(); assert.ok(t.appended); assert.match(t.frame.src,/layout=slim/); t.timers.get(1)(); assert.equal(t.status,'error'); assert.equal(t.removed,false); t.events.get('load')(); assert.equal(t.status,'error'); t.message('beehiiv:child-loaded'); assert.equal(t.status,'ready'); assert.equal(t.sent[0][0].type,'beehiiv:parent-loaded'); t.cleanup(); assert.equal(t.listeners.size,0); assert.equal(t.events.size,0); assert.equal(t.timers.size,0);
t=setup(); t.message('beehiiv:styles',{height:'500px'},'https://wrong.example'); assert.equal(t.status,'loading'); t.message('beehiiv:styles',{height:'500px'},undefined,{}); assert.equal(t.status,'loading'); t.message('beehiiv:styles',{height:'180px'}); assert.equal(t.frame.style.height,'180px'); assert.equal(t.status,'ready'); t.message('beehiiv:challenge',{height:'350px'}); assert.equal(t.frame.style.height,'400px'); t.message('beehiiv:challenge-resolved'); assert.equal(t.sent.at(-1)[0].type,'beehiiv:resize'); t.message('beehiiv:styles',{height:'NaN'}); assert.equal(t.frame.style.height,'400px'); t.cleanup();
console.log('Passed: direct form creation, timeout without hiding frame, late recovery, trusted message validation, challenge sizing and cleanup.');
