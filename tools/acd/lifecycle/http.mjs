import { request } from 'node:https';
import { Readable } from 'node:stream';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
export const sha = value => createHash('sha256').update(value).digest('hex');
export const textOnly = s => s.replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#(?:39|x27);|&apos;/g,"'").replace(/&(?:nbsp|quot);/g,' ').replace(/\s+/g,' ').trim();
export function publicAddress(ip) {
  if (ip.includes(':')) return /^(?:2|3)[a-f\d]{3}:/i.test(ip); // globally routed IPv6 only, no mapped/private/link-local addresses
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && !/^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|192\.0|198\.(1[89])|22[4-9]|23\d|24\d|25[0-5])\./.test(ip) && ip.split('.').every(x=>+x<=255) && !(ip.startsWith('100.') && +ip.split('.')[1]>=64 && +ip.split('.')[1]<=127);
}
export function allowedUrl(value) {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||isIP(u.hostname)||!u.hostname.includes('.')||/(^|\.)linkedin\.com$/.test(u.hostname)) throw new Error('Source requires manual verification');
  return u;
}
// Pin validated DNS answers to the actual TLS connection (no DNS-rebinding gap).
async function pinnedFetch(url,{signal,headers,addresses}) {
  return new Promise((resolve,reject)=>{
    const req=request(url,{method:'GET',signal,headers,lookup:(_host,options,callback)=>{
      if(options.all)callback(null,addresses);else callback(null,addresses[0].address,addresses[0].family);
    }},res=>{
      const headers=new Headers();for(const [key,value] of Object.entries(res.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
      resolve(new Response([204,304].includes(res.statusCode)?null:Readable.toWeb(res),{status:res.statusCode,headers}));
    });req.on('error',reject);req.end();
  });
}
export function reader({fetchImpl=pinnedFetch,resolve=lookup,delay=sleep,now=Date.now,budgetMs=480000}={}) {
  const started=now(),hosts=new Map(); let count=0;
  async function read(value) {
    const at=new Date(now()).toISOString();
    if(now()-started>budgetMs||count++>=1200)return {url:value,checkedAt:at,error:'Scan budget reached'};
    let u;try{u=allowedUrl(value);}catch{return{url:value,checkedAt:at,error:'Unsupported or restricted source'};}
    const old=hosts.get(u.host)||Promise.resolve();let unlock;hosts.set(u.host,new Promise(r=>unlock=r));await old;
    try {
      await delay(750);
      for(let attempt=0;attempt<2;attempt++) {
        let current=u;
        try {
          for(let hop=0;hop<5;hop++) {
            if(now()-started>budgetMs)return {url:value,checkedAt:at,error:'Scan budget reached'};
            allowedUrl(current.href);
            const addresses=await resolve(current.hostname,{all:true});
            if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('Unsafe source');
            const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
            try {
              const response=await fetchImpl(current,{addresses,redirect:'manual',signal:controller.signal,headers:{'User-Agent':'ACD-Lifecycle/1.0 (+https://www.africacareerdesk.com)'}});
              if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();current=new URL(response.headers.get('location'),current);continue;}
              if((response.status===429||response.status>=500)&&attempt===0){await response.body?.cancel();break;}
              const chunks=[];let size=0;
              if(response.body)for await(const chunk of response.body){size+=chunk.length;if(size>2000000){controller.abort();throw new Error('Oversized response');}chunks.push(chunk);}
              const body=Buffer.concat(chunks).toString('utf8');
              return {url:u.href,finalUrl:current.href,http:response.status,checkedAt:at,hash:sha(body),body,text:textOnly(body)};
            } finally {clearTimeout(timer);}
          }
        } catch { /* Never persist/log raw transport errors, credentials, cookies or response HTML. */ }
        if(attempt===0)await delay(1000);
      }
      return {url:u.href,checkedAt:at,error:'Source inaccessible or redirect budget exhausted'};
    } finally {unlock();}
  }
  return read;
}
export async function bounded(items,fn,concurrency=4) {
  const result=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(next<items.length){const i=next++;result[i]=await fn(items[i]);}}));return result;
}
