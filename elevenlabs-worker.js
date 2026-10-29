import {slotVoiceForUser} from './permanent-voice-slots-worker.js';
/* CallFocus V16.34: one-time voice cloning. No permanent customer voice library.
   The original OpenAI call engine and its endpoints are untouched.
   Provider voices exist ONLY during active jobs and are deleted on completion or by the cleanup cron. */
const EL_API='https://api.elevenlabs.io';
const elJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const getKey=(env,pool='primary')=>String((pool==='tertiary'?env.ELEVENLABS_PERMANENT_3_API_KEY:pool==='secondary'?env.ELEVENLABS_PERMANENT_2_API_KEY:env.ELEVENLABS_PERMANENT_API_KEY)||'').trim();
const oldKey=env=>String(env.ELEVENLABS_API_KEY||env.ELEVEN_LABS_API_KEY||env.ELEVENLAB_API_KEY||'').trim();
const getAgent=(env,pool='primary')=>String((pool==='tertiary'?env.ELEVENLABS_PERMANENT_3_AGENT_ID:pool==='secondary'?env.ELEVENLABS_PERMANENT_2_AGENT_ID:env.ELEVENLABS_PERMANENT_AGENT_ID)||'').trim();
const withKey=(env,pool='primary')=>({'xi-api-key':getKey(env,pool)});
const oldVoicesPrefix='elevenlabs:voices:';
const leasePrefix='elevenlabs:temporary:';
const safeName=v=>String(v||'').trim().replace(/[\x00-\x1f\x7f]/g,' ').slice(0,65);
const idValid=id=>/^[a-zA-Z0-9_-]{8,120}$/.test(String(id||''));
const availabilityKey='callfocus:cloning:availability:v1';
const availabilityDefaultMessage='Voice cloning is currently unavailable while we make improvements. Please use the standard voices for now.';
// Fail closed when settings are missing or unavailable: prevents accidental provider creations.
async function elGetAvailability(env){
 if(!env.CALLFOCUS_CONFIG)return {enabled:false,message:availabilityDefaultMessage,homeButtonVisible:false};
 try{
  const record=await env.CALLFOCUS_CONFIG.get(availabilityKey,{type:'json'});
  return {enabled:record?.enabled===true,message:String(record?.message||availabilityDefaultMessage).slice(0,350),homeButtonVisible:record?.homeButtonVisible!==false};
 }catch(error){console.warn('CallFocus cloning availability read failed',String(error?.message||error).slice(0,120));return {enabled:false,message:availabilityDefaultMessage,homeButtonVisible:false}}
}
async function elAdminAvailability(req,env){
 if(req.method==='GET'){
  const current=await elGetAvailability(env);
  return elJson({ok:true,...current,storageConnected:!!env.CALLFOCUS_CONFIG});
 }
 if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
 if(!env.CALLFOCUS_CONFIG)return elJson({error:'Settings storage is not connected. Voice cloning remains paused.'},503);
 let data;try{data=await req.json()}catch{return elJson({error:'Invalid settings.'},400)}
 if(typeof data?.enabled!=='boolean')return elJson({error:'Choose whether voice cloning is enabled.'},400);
 if(data.homeButtonVisible!==undefined&&typeof data.homeButtonVisible!=='boolean')return elJson({error:'Choose whether the homepage button is visible.'},400);
 const message=String(data.message||'').trim();
 if(!message||message.length>350)return elJson({error:'Enter an unavailable message (1–350 characters).'},400);
 try{
  // Preserve the current value when an earlier admin client does not send this new field.
  const previous=await elGetAvailability(env);
  const homeButtonVisible=typeof data.homeButtonVisible==='boolean'?data.homeButtonVisible:previous.homeButtonVisible;
  await env.CALLFOCUS_CONFIG.put(availabilityKey,JSON.stringify({enabled:data.enabled,message,homeButtonVisible,updatedAt:new Date().toISOString()}));
  return elJson({ok:true,enabled:data.enabled,message,homeButtonVisible});
 }catch(error){console.error('Voice availability save failure',String(error?.message||error).slice(0,140));return elJson({error:'Could not save these settings. Voice cloning remains paused.'},503)}
}
const capacityText={full:'Voice creation is at capacity right now. Please try again later or contact CallFocus support.',operations:'Monthly voice-creation capacity has been reached. Please contact CallFocus support.',plan:'Voice cloning is currently unavailable. Please contact CallFocus support.'};
async function badResponse(res,what){let body={};try{body=await res.json()}catch{}
 const msg=String(body?.detail?.message||body?.detail?.status||body?.error?.message||body?.detail||`${what} failed (HTTP ${res.status}).`).replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service').slice(0,350);
 return elJson({error:msg},res.status===429?429:res.status===401||res.status===403?502:res.status>=500?502:400);
}
async function voiceCapacity(env){
 try{const r=await fetch(`${EL_API}/v1/user/subscription`,{headers:withKey(env),signal:AbortSignal.timeout(9000)});if(!r.ok)return {available:null,reason:'unavailable'};
 const d=await r.json();const used=Number(d.voice_slots_used),limit=Number(d.voice_limit);
 if(Number.isFinite(limit)&&limit>=0&&Number.isFinite(used)&&used>=limit)return {available:false,reason:'full'};
 const max=d.max_voice_add_edits,ops=Number(d.voice_add_edit_counter);
 if(max!=null&&Number(max)>0&&Number.isFinite(ops)&&ops>=Number(max))return {available:false,reason:'operations'};
 if(d.can_use_instant_voice_cloning===false)return {available:false,reason:'plan'};
 return {available:true,reason:null};}catch{return {available:null,reason:'unavailable'}}
}
const publicCapacity=v=>({available:v.available,reason:v.available===false?v.reason:null,message:v.available===false?capacityText[v.reason]||capacityText.full:null});
function isCapacityError(v){return /maximum amount of custom voices|custom voice limit|voice slots? (?:limit|reached|exceeded|full)|too many (?:custom )?voices|voice_limit|voice slots used/i.test(String(v||''))}
function safeAudio(form){
 const name=safeName(form.get('name'));const consent=String(form.get('consent')||'');const file=form.get('audio');
 if(name.length<2)throw new Error('Enter a voice name.');
 if(consent!=='yes')throw new Error('Confirm that this is your own adult voice and you consent to cloning.');
 if(!(file instanceof File)||file.size<2000||file.size>16*1024*1024)throw new Error('Upload an audio recording under 16 MB.');
 return {name,file};
}
async function formatAudio(file){
 const h=new Uint8Array(await file.slice(0,32).arrayBuffer());const ascii=(s,n)=>String.fromCharCode(...h.slice(s,s+n));
 const mp4=ascii(4,4)==='ftyp',webm=h[0]===0x1a&&h[1]===0x45&&h[2]===0xdf&&h[3]===0xa3;
 const wav=ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE',ogg=ascii(0,4)==='OggS',flac=ascii(0,4)==='fLaC';
 const mp3=ascii(0,3)==='ID3'||(h[0]===0xff&&(h[1]&0xe0)===0xe0),aac=h[0]===0xff&&(h[1]&0xf0)===0xf0;
 if(!(mp4||webm||wav||ogg||flac||mp3||aac))throw new Error('This recording cannot be read. Convert it to WAV and try again.');
 const ext=mp4?'m4a':webm?'webm':wav?'wav':ogg?'ogg':flac?'flac':aac?'aac':'mp3';
 const type=mp4?'audio/mp4':webm?'audio/webm':wav?'audio/wav':ogg?'audio/ogg':flac?'audio/flac':aac?'audio/aac':'audio/mpeg';
 return new File([file],`callfocus-sample.${ext}`,{type});
}
async function providerDelete(env,providerId){
 if(!idValid(providerId))return false;
 try{const r=await fetch(`${EL_API}/v1/voices/${encodeURIComponent(providerId)}`,{method:'DELETE',headers:{'xi-api-key':oldKey(env)},signal:AbortSignal.timeout(18000)});return r.ok||r.status===404;}catch{return false}
}
// KV leases contain an ID, not the audio samples. Do NOT automatically expire the KV index before deletion; cron must retain a way to clean provider orphans.
async function createTemporary(env,user,form){
 // A second check prevents a new provider creation if Admin paused cloning after the session request started.
 const allowed=await elGetAvailability(env);
 if(!allowed.enabled){const err=new Error(allowed.message);err.status=503;throw err}
 const {name,file}=safeAudio(form);
 const capacity=await voiceCapacity(env);
 if(capacity.available===false){const err=new Error(capacityText[capacity.reason]||capacityText.full);err.status=409;throw err}
 const sample=await formatAudio(file);
 const request=new FormData();request.set('name',`CF TEMP ${name} ${user.id.slice(0,8)}`);request.append('files',sample,sample.name);
 let response;try{response=await fetch(`${EL_API}/v1/voices/add`,{method:'POST',headers:withKey(env),body:request,signal:AbortSignal.timeout(60000)})}catch{const err=new Error('The voice service could not be reached. Please try again.');err.status=502;throw err}
 if(!response.ok){let detail={};try{detail=await response.json()}catch{}
 const raw=JSON.stringify(detail);const msg=isCapacityError(raw)?capacityText.full:String(detail?.detail?.message||detail?.error?.message||'Could not create a temporary voice.').replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service');
 const err=new Error(msg.slice(0,350));err.status=response.status===429?429:response.status>=500?502:400;throw err;}
 const created=await response.json().catch(()=>({}));if(!idValid(created.voice_id))throw new Error('Voice creation failed.');
 const leaseId=crypto.randomUUID();const lease={id:leaseId,voiceId:created.voice_id,userId:user.id,name,createdAt:Date.now(),lastSeen:Date.now(),requiresVerification:created.requires_verification===true};
 try{await env.CALLFOCUS_CONFIG.put(leasePrefix+leaseId,JSON.stringify(lease),{});}
 catch{await providerDelete(env,created.voice_id);throw new Error('Could not prepare voice cleanup. Please try again.');}
 return lease;
}
async function releaseLease(env,lease){
 if(!lease||lease.persistent===true)return true;
 const deleted=await providerDelete(env,lease.voiceId);
 if(deleted)await env.CALLFOCUS_CONFIG.delete(leasePrefix+lease.id);
 return deleted;
}
async function leaseById(env,id,userId){
 if(!/^[0-9a-f-]{36}$/i.test(String(id||'')))return null;
 const l=await env.CALLFOCUS_CONFIG.get(leasePrefix+id,{type:'json'});
 return l&&l.userId===userId?l:null;
}
async function elCleanup(env){
 if(!env.CALLFOCUS_CONFIG||!oldKey(env))return;
 let cursor;let scanned=0;
 do{const page=await env.CALLFOCUS_CONFIG.list({prefix:leasePrefix,limit:100,...(cursor?{cursor}:{})});
 for(const item of page.keys){scanned++;const lease=await env.CALLFOCUS_CONFIG.get(item.name,{type:'json'});if(!lease||!idValid(lease.voiceId))continue;
 // Heartbeats from live calls keep active voices alive regardless of call length.
 if(Date.now()-Number(lease.lastSeen||lease.createdAt||0)<20*60*1000)continue;
 try{await releaseLease(env,lease)}catch(e){console.warn('CallFocus temporary voice cleanup retry',String(e?.message||e).slice(0,140))}
 }cursor=page.list_complete?null:page.cursor;
 }while(cursor&&scanned<200);
}
// Explicitly requested deletion of PREVIOUS CallFocus customer library. No unrelated provider voices.
// Only operator-authenticated requests may access this function.
async function elAdminPurge(req,env){
 if(req.method==='GET')return elJson({ok:true,message:'Deletes historical CallFocus customer clones only, not provider defaults or unrelated voices. This cannot be undone.'});
 if(req.method!=='POST')return elJson({error:'Method not allowed'},405);
 let body={};try{body=await req.json()}catch{}
 if(body.confirm!=='DELETE ALL CALLFOCUS VOICES')return elJson({error:'Confirmation does not match.'},400);
 const cursor=String(body.cursor||'').slice(0,2048);const page=await env.CALLFOCUS_CONFIG.list({prefix:oldVoicesPrefix,limit:20,...(cursor?{cursor}:{})});
 let deleted=0,failed=0,scanned=0;
 for(const key of page.keys){scanned++;
 const records=await env.CALLFOCUS_CONFIG.get(key.name,{type:'json'});if(!Array.isArray(records)){continue}
 const survivors=[];
 for(const v of records){if(!idValid(v.voiceId)){survivors.push(v);continue}
 if(await providerDelete(env,v.voiceId))deleted++;else{survivors.push(v);failed++;}}
 if(survivors.length)await env.CALLFOCUS_CONFIG.put(key.name,JSON.stringify(survivors));else await env.CALLFOCUS_CONFIG.delete(key.name);
 }
 return elJson({ok:true,scanned,deleted,failed,done:page.list_complete,cursor:page.list_complete?null:page.cursor,note:failed?'Some provider deletions failed; the remaining references were kept for retry.':'Historical CallFocus voice records in this batch were removed.'});
}
async function elRequest(req,env,helpers){
 const path=new URL(req.url).pathname;
 if(!['/api/elevenlabs/voices','/api/elevenlabs/clone','/api/elevenlabs/session','/api/elevenlabs/tts','/api/elevenlabs/release','/api/elevenlabs/heartbeat'].includes(path))return elJson({error:'Not found.'},404);
 const auth=await helpers.auth(req,env);if(!auth)return elJson({error:'Sign in to CallFocus first.'},401);
 // Administrative pause applies before ANY provider request and never blocks cleanup.
 const availability=await elGetAvailability(env);
 if(path==='/api/elevenlabs/voices'&&req.method==='GET'&&!availability.enabled){
  const existing=await slotVoiceForUser(env,auth.user.id).catch(()=>null);
  return elJson({ok:true,voices:existing?[existing]:[],capacity:{available:false,reason:'paused',message:availability.message},availability,agentConfigured:!!getAgent(env,existing?.providerPool||'primary'),temporary:false});
 }
 if((path==='/api/elevenlabs/session'||path==='/api/elevenlabs/tts')&&!availability.enabled){
  return elJson({error:availability.message,code:'voice_cloning_paused'},503);
 }
 // Provider credentials are selected only AFTER reading the customer's saved voice assignment.
 if(path==='/api/elevenlabs/voices'){
  if(req.method==='GET'){const saved=await slotVoiceForUser(env,auth.user.id).catch(()=>null);return elJson({ok:true,voices:saved?[saved]:[],capacity:{available:!!saved,message:saved?null:'Book a permanent voice slot to create your voice.'},availability,agentConfigured:!!getAgent(env,saved?.providerPool||'primary'),temporary:false});}
  return elJson({error:'Permanent saved voices are no longer supported.'},410);
 }
 if(path==='/api/elevenlabs/clone')return elJson({error:'Use your booked permanent slot to save your voice.'},410);
 if(path==='/api/elevenlabs/heartbeat'||path==='/api/elevenlabs/release'){
  if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
  let body={};try{body=await req.json()}catch{return elJson({error:'Invalid request.'},400)}
  const lease=await leaseById(env,body.leaseId,auth.user.id);
  if(!lease)return elJson({ok:true,released:true});
  if(path.endsWith('/heartbeat')){
   lease.lastSeen=Date.now();await env.CALLFOCUS_CONFIG.put(leasePrefix+lease.id,JSON.stringify(lease),{});return elJson({ok:true});
  }
  const removed=await releaseLease(env,lease);return removed?elJson({ok:true,released:true}):elJson({error:'Cleanup is pending and will retry automatically.',code:'cleanup_pending'},502);
 }
 if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
 let form;try{form=await req.formData()}catch{return elJson({error:'Invalid cloned voice request.'},400)}
 const script=String(form.get('script')||'').trim();const context=String(form.get('context')||'');
 if(path.endsWith('/tts')&&(!script||script.length>2200))return elJson({error:'Enter a script of up to 2,200 characters.'},400);
 if(path.endsWith('/session')&&context.length>24000)return elJson({error:'Call context exceeds the permitted size.'},400);
 // Each saved voice uses the agent and API key from the account that created it.
 const walletConfig=await helpers.getConfig(env);if(walletConfig.serverOnline===false)return elJson({error:'Calling is currently unavailable.'},503);
 const unlimited=(walletConfig.unlimitedCreditEmails||[]).map(x=>String(x).toLowerCase()).includes(String(auth.user.email||'').toLowerCase());
 const data=await helpers.customerData(env,auth.user.id,auth.user.name),wallet=helpers.normalizeWallet(data.wallet||{});
 if(!unlimited&&wallet.balanceSeconds<(path.endsWith('/session')?15:5))return elJson({error:'Not enough CallFocus credits. Buy credits to continue.'},402);
 let lease;
 if(String(form.get('mode')||'')!=='permanent')return elJson({error:'Temporary voice creation is disabled. Book and save one permanent voice instead.'},409);
 try{lease=await slotVoiceForUser(env,auth.user.id)}catch{return elJson({error:'Saved voice storage is not ready.'},503)}
 if(!lease)return elJson({error:'You do not have a saved permanent voice. Book a slot and create your voice first.'},409);
 const pool=lease.providerPool||'primary';
 if(!getKey(env,pool))return elJson({error:'The voice service holding your saved voice is not configured. Please contact CallFocus.'},503);
 if(path.endsWith('/session')&&!getAgent(env,pool))return elJson({error:'The agent for your saved voice account is not configured yet.'},503);
 if(path==='/api/elevenlabs/session'){
  const url=new URL(`${EL_API}/v1/convai/conversation/get-signed-url`);url.searchParams.set('agent_id',getAgent(env,pool));
  let signed;try{signed=await fetch(url,{headers:withKey(env,pool),signal:AbortSignal.timeout(20000)})}catch{await releaseLease(env,lease);return elJson({error:'Could not connect to the calling service.'},502)}
  if(!signed.ok){await releaseLease(env,lease);return badResponse(signed,'Voice call')}
  const response=await signed.json().catch(()=>({}));
  if(typeof response.signed_url!=='string'||!response.signed_url.startsWith('wss://api.elevenlabs.io/')){await releaseLease(env,lease);return elJson({error:'Could not establish a secure call.'},502)}
  let id,index;
  try{id=await helpers.registerUsage(req,env,{session:{threadId:String(form.get('threadId')||'').slice(0,160),callTitle:String(form.get('title')||'').slice(0,160),callerName:String(form.get('callerName')||'').slice(0,120)}},{id:'elevenlabs-agent'},auth);
   if(!id)throw new Error('Unable to open call usage record');
   index=await env.CALLFOCUS_CONFIG.get(`call_usage:id:${id}`,{type:'json'});
   if(index?.key){const rec=await env.CALLFOCUS_CONFIG.get(index.key,{type:'json'});if(rec){rec.model='elevenlabs-agent';rec.voiceRateUsdPerMinute=0;rec.missingBackendPricing=true;rec.providerSessionId='elevenlabs-agent';rec.chargeRateCreditsPerMinute=(await helpers.getServiceRates(env)).cloneVoice;await helpers.saveUsage(env,index.key,rec)}}
  }catch{await releaseLease(env,lease);return elJson({error:'Could not prepare call credits.'},503)}
  return elJson({ok:true,signedUrl:response.signed_url,callUsageId:id,voiceId:lease.voiceId,leaseId:lease.id,voiceName:lease.name,context:context.slice(0,22000),balanceSeconds:wallet.balanceSeconds,unlimited});
 }
 // Voice-note generation uses the voice exactly once and always attempts provider deletion.
 try{
  const ttsUrl=`${EL_API}/v1/text-to-speech/${encodeURIComponent(lease.voiceId)}/with-timestamps`;
  let result;try{result=await fetch(ttsUrl,{method:'POST',headers:{...withKey(env,pool),'Content-Type':'application/json'},body:JSON.stringify({text:script,model_id:'eleven_multilingual_v2',output_format:'mp3_44100_128'}),signal:AbortSignal.timeout(60000)})}catch{return elJson({error:'Voice note generation timed out.'},502)}
  if(!result.ok)return await badResponse(result,'Voice note');
  const item=await result.json().catch(()=>({})),base64=item.audio_base64,align=item.alignment||item.normalized_alignment||{};
  if(typeof base64!=='string'||!base64)return elJson({error:'No audio was generated.'},502);
  const endpoints=[...(align.character_end_times_seconds||[]).map(Number),...(align.character_start_times_seconds||[]).map((s,i)=>Number(s)+Number((align.character_durations_seconds||[])[i]||0))].filter(n=>Number.isFinite(n)&&n>0);
  if(!endpoints.length)return elJson({error:'Could not verify audio duration. No credits were charged.'},502);
  const seconds=Math.max(1,Math.ceil(Math.max(...endpoints)));
  let updatedWallet=null;
  if(!unlimited){if(seconds>wallet.balanceSeconds)return elJson({error:`This voice note needs about ${seconds} seconds of credits. Your balance is insufficient.`},402);
   const payReq=new Request(req.url,{method:'POST',headers:{Authorization:req.headers.get('Authorization')||'','Content-Type':'application/json'},body:JSON.stringify({type:'voice_note',referenceId:`el-${crypto.randomUUID()}`,seconds})});
   const paid=await helpers.consume(payReq,env,(await helpers.getServiceRates(env)).cloneVoice);if(!paid.ok)return paid;
   const outcome=await paid.json().catch(()=>({}));if(!outcome?.ok)return elJson({error:'Could not confirm the credit deduction.'},503);updatedWallet=outcome.wallet||null;}
  return elJson({ok:true,audioBase64:base64,seconds,voiceName:lease.name,wallet:updatedWallet});
 }finally{await releaseLease(env,lease)}
}
export {elRequest,elCleanup,elAdminPurge,elAdminAvailability,elGetAvailability};
