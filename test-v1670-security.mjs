import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { webcrypto,createHash } from 'node:crypto';
const source=fs.readFileSync(new URL('./_worker.js',import.meta.url),'utf8');
function snippet(begin,end){const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);assert(a>=0 && b>a,`Extract ${begin}`);return source.slice(a,b)}
const checks=[];
const test=(name,fn)=>checks.push({name,fn});
const ctx=(vars={})=>vm.createContext({console,crypto:webcrypto,TextEncoder,TextDecoder,Response,Headers,Date,Math,...vars});
const result=(data,status=200)=>({status,data});
const mp3=snippet('function cfMp3DurationSeconds(', 'function cfVoiceNoteQuoteSeconds(');
test('MPEG frame duration is calculated server-side',()=>{
 const env=ctx();vm.runInContext(mp3,env);
 // MPEG 1 Layer III, 128 kbit, 44.1 kHz, 417-byte frames
 const buf=new Uint8Array(417*100);
 for(let i=0;i<100;i++){const o=i*417;buf[o]=0xff;buf[o+1]=0xfb;buf[o+2]=0x90;buf[o+3]=0;}
 const n=env.cfMp3DurationSeconds(buf.buffer);
 assert(Math.abs(n-100*1152/44100)<.002,`duration ${n}`);
});
test('Missing or malformed audio metadata produces safe fallback',()=>{
 const env=ctx();vm.runInContext(mp3,env);
 assert.equal(env.cfMp3DurationSeconds(new Uint8Array([0,1,2]).buffer),null);
});
const videoSrc=snippet('async function cfVideoGenerate(request,env)', 'async function cfVideoStatus(');
const makeVideo=(options={})=>{
 const events=[];
 const scope=ctx({
   json:result,
   authenticatedCustomer:async()=>({user:{id:'u1',email:'user@example.org',name:'Customer'}}),
   cfGetVideoSettings:async()=>({enabled:true,cost10:300,cost15:450,aspectRatios:['9:16'],motionStyles:['Natural'],dailyLimit:3}),
   cfListVideoJobs:async()=>[],
   CF_VIDEO_PREFIX: "image_video:job:",
   cfGetRates:async()=>({voiceNote:100}),
   getConfig:async()=>({unlimitedCreditEmails:[]}),
   normalizeCustomerEmail:(x)=>x,
   getCustomerDataForUpdate:async()=>({wallet:{balanceSeconds:80000}}),
   normalizeServerWallet:(w)=>w,
   callFocusSecondsForCredits:(n)=>n*.6,
   cfAcquireExpenseGuard:async()=>{events.push('lock');return {id:'u1',token:'t1'}},
   cfReleaseExpenseGuard:async()=>{events.push('unlock')},
   cfEconomyQuota:async()=>null,
   cfVideoWalletChange:async()=>{events.push('charge');return options.chargeRejected?{ok:false,insufficient:true}:{ok:true,unlimited:false}},
   cfPutVideoJob:async()=>{events.push('persist')},
   cfXaiFetch:async()=>{events.push('provider');return options.providerRejected?{ok:false,json:async()=>({error:{message:'rejected'}})}:{ok:true,json:async()=>({request_id:'req-test'})}},
   cfVideoRefund:async()=>{events.push('refund');return {refunded:true}},
   cfPublicVideo:(x)=>({id:x.id,status:x.status,charged:x.charged}),
 });
 vm.runInContext(videoSrc,scope);
 const req={method:'POST',headers:new Headers(),json:async()=>({duration:10,prompt:'A gentle camera movement',aspectRatio:'9:16',motionStyle:'Natural',image:'data:image/png;base64,AAAABBBB'})};
 return {scope,req,events};
};
test('Video generation charges and persists before upstream request',async()=>{
 const {scope,req,events}=makeVideo();const reply=await scope.cfVideoGenerate(req,{XAI_API_KEY:'test'});
 assert.equal(reply.status,200);
 assert(events.indexOf('charge')<events.indexOf('provider'));
 assert(events.indexOf('persist')<events.indexOf('charge'));
 assert.equal(events.at(-1),'unlock');
});
test('Video with rejected charge never calls provider',async()=>{
 const {scope,req,events}=makeVideo({chargeRejected:true});const reply=await scope.cfVideoGenerate(req,{XAI_API_KEY:'test'});
 assert.equal(reply.status,402);assert(!events.includes('provider'));assert.equal(events.at(-1),'unlock');
});
test('Rejected provider response triggers explicit refund path',async()=>{
 const {scope,req,events}=makeVideo({providerRejected:true});const reply=await scope.cfVideoGenerate(req,{XAI_API_KEY:'test'});
 assert.equal(reply.status,502);assert(events.includes('refund'));assert.equal(events.at(-1),'unlock');
});
const noteSrc=snippet('async function handleVoiceNote(request, env)', 'function paceInstruction(');
const makeNote=(options={})=>{
 const events=[];
 const scope=ctx({
   json:result,
   authenticatedCustomer:async()=>({user:{id:'u1',email:'user@example.org',name:'Customer'}}),
   getConfig:async()=>({unlimitedCreditEmails:[],femaleVoice:'marin',maleVoice:'cedar',instructions:'',opening:'',speechStyle:'',speakingPace:'normal'}),
   normalizeCustomerEmail:(x)=>x,
   DEFAULT_CONFIG:{instructions:'',opening:''},
   getCustomerDataForUpdate:async()=>({wallet:{balanceSeconds:9999}}),
   normalizeServerWallet:(x)=>x,
   normalizeCallLanguage:()=> 'English',
   normalizeUserAiVoiceProfile:()=>null,
   customVoiceById:()=>null,
   TTS_VOICES:['marin','cedar'],
   userAiVoiceInstructions:()=>'',
   paceInstruction:()=>'',
   speechSpeedForPace:()=>1,
   cfGetRates:async()=>({voiceNote:100}),
   cfChargeWalletSeconds:(seconds,rate)=>Math.ceil(seconds*rate/100),
   cfVoiceNoteQuoteSeconds:()=>22,
   cfMp3DurationSeconds:()=>20,
   cfAcquireExpenseGuard:async()=>{events.push('lock');return {id:'u1',token:'token'}},
   cfReleaseExpenseGuard:async()=>{events.push('unlock')},
   cfEconomyQuota:async()=>null,
   cfVoiceNoteJournal:async()=>events.push('journal'),
   cfVoiceNoteJournalState:async(_e,_id,state)=>events.push('state:'+state),
   cfVoiceNoteCreditChange:async(_e,_u,_id,kind,secs)=>{events.push('bill:'+kind+':'+secs);return {ok:true}},
   fetch:async(url)=>{events.push('tts');assert(url.endsWith('/audio/speech'));return options.upstreamFails?{ok:false,status:500,text:async()=>''}:{ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}},
 });
 vm.runInContext(noteSrc,scope);
 const req={method:'POST',json:async()=>({prompt:'Hello this is a short voice note',mode:'script',voiceGender:'male'})};
 return {scope,req,events};
};
test('Voice note reserves before TTS and settles before sending audio',async()=>{
 const {scope,req,events}=makeNote();const reply=await scope.handleVoiceNote(req,{OPENAI_API_KEY:'test'});
 assert(reply instanceof Response);assert.equal(reply.headers.get('X-CallFocus-Server-Billed'),'1');
 assert(events.indexOf('bill:reserve:22')<events.indexOf('tts'));
 assert(events.indexOf('state:completed')>events.indexOf('tts'));
 assert.equal(events.at(-1),'unlock');
});
test('Failed TTS refunds held credits',async()=>{
 const {scope,req,events}=makeNote({upstreamFails:true});const reply=await scope.handleVoiceNote(req,{OPENAI_API_KEY:'test'});
 assert.equal(reply.status,500);assert(events.includes('bill:refund:22'));assert(events.includes('state:refunded'));
});
test('Voice note browser handlers no longer invoke a post-generation wallet charge',()=>{
 const client=fs.readFileSync(new URL('./callfocus.js',import.meta.url),'utf8');
 const a=client.indexOf('async function generateVoiceNote()'),b=client.indexOf('async function generateVoiceNoteV113()');
 const narrow=client.slice(a,b);
 assert(!narrow.slice(0,narrow.indexOf("const originalShowView = showView")).includes('consumeUsageSeconds('));
 assert(client.slice(b,b+6000).includes('X-CallFocus-Server-Billed'));
 assert(!client.slice(b,b+6000).includes('consumeUsageSeconds('));
});
test('The live OpenAI voice session and instruction builders are unchanged by this fix',()=>{
 const fragment=(s)=>s.slice(s.indexOf('async function handleSession(request, env)'),s.indexOf('// -----------------------------------------------------------------------------\n// V11.21 Paystack',s.indexOf('async function handleSession(request, env)')));
 const hash=createHash('sha256').update(fragment(source)).digest('hex');
 assert.equal(hash,'1f42ac1ee94a70a888dc79ecfdb470aedd95b321a54f1ce54462e061ac6ca672');
});
for(const x of checks){await x.fn();console.log('PASS',x.name)}
console.log('PASS',checks.length,'security regression checks');
