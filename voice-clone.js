/* CallFocus V16.20: isolated cloned-voice engine. Normal calling is unchanged. */
(()=>{'use strict';
const portal=document.getElementById('cfClonePortal');
const $=id=>portal?portal.querySelector('[data-clone-id="'+id+'"]'):document.getElementById(id);
const token=()=>{try{return localStorage.getItem('callfocus_server_session_v1')||'';}catch{return'';}};
let voices=[],enabled=false,liveReady=false,recorder=null,recStream=null,recChunks=[],recStart=0,recTick=null;
let live=null,recordedFile=null,starting=false,cancelStart=false,creating=false,closing=0,recordAttempt=0;
const emit=(name,detail)=>{if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('callfocus:clone-'+name,{detail}));};
const say=(message,error=false)=>{const el=$('status');el.textContent=message;el.classList.toggle('error',error);};
const state=()=>({enabled,liveReady,voices:voices.map(v=>({...v})),active:!!live||closing>0,starting,creating,ready:!!live?.ready,sessionId:live?.id||'',muted:!!live?.muted,speakerOn:live?.speakerOn!==false,held:!!live?.held,graceful:!!live?.graceful,elapsed:live?.ready?Math.max(live.elapsed||0,Math.floor((Date.now()-live.localStartedAt)/1000)):0,creditsUsed:live?.creditsUsed||0,remainingSeconds:live?.remainingSeconds,unlimited:!!live?.unlimited,status:$('liveStatus')?.textContent||''});
async function api(path,options={}){
 const h=new Headers(options.headers||{});h.set('Authorization','Bearer '+token());
 const abort=typeof AbortController==='function'?new AbortController():null;
 const timeout=abort?setTimeout(()=>abort.abort(),45000):null;
 let r;try{r=await fetch(path,{...options,headers:h,cache:'no-store',...(abort?{signal:abort.signal}:{})});}finally{if(timeout)clearTimeout(timeout);}
 if(!r.ok){const data=await r.json().catch(()=>({}));const error=new Error(data?.error||`Request failed (${r.status}).`);error.status=r.status;error.code=data?.code||'';error.retryAfter=Number(r.headers.get('Retry-After')||data?.retryAfter)||0;throw error;}return r.json();
}
function render(){
 const selectedVoice=$('liveVoice').value;
 $('voiceLimit').textContent=`${voices.length} / 3`;
 const list=$('voices');list.replaceChildren();
 if(!voices.length){const p=document.createElement('p');p.textContent='No cloned voices saved yet.';list.append(p)}
 const select=$('liveVoice');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Select my own saved voice';select.append(blank);
 for(const v of voices){
  const item=document.createElement('div');item.className='voice-item';
  const content=document.createElement('div'),name=document.createElement('strong');name.textContent=v.name;content.append(name);
  const p=document.createElement('div');p.className='small';p.textContent=v.verificationRequired?'Verification required before this voice can be used.':'Personal cloned voice · consent recorded';content.append(p);item.append(content);
  const btn=document.createElement('button');btn.type='button';btn.className='danger';btn.textContent='Delete';btn.disabled=!!live||starting;
  btn.addEventListener('click',()=>removeVoice(v.id));item.append(btn);list.append(item);
  if(!v.verificationRequired){const o=document.createElement('option');o.value=v.id;o.textContent=v.name;select.append(o)}
 }
 if([...select.options].some(o=>o.value===selectedVoice))select.value=selectedVoice;
 select.disabled=!!live||starting;
 $('recordBtn').disabled=!enabled||creating||!!live||starting||closing>0;
 $('createBtn').disabled=!enabled||voices.length>=3||!!live||starting||creating||closing>0;
 $('startLive').disabled=!liveReady||!!live||starting||!voices.some(v=>!v.verificationRequired);
}
async function refresh(){
 const requestedToken=token();
 if(!requestedToken){voices=[];enabled=false;liveReady=false;render();emit('voices',state());say('Please sign in on CallFocus to save or use your voice.',true);return state();}
 try{
  const d=await api('/api/voice-clones');
  if(token()!==requestedToken)return state();
  voices=Array.isArray(d.voices)?d.voices:[];enabled=!!d.enabled;liveReady=!!d.liveReady;
  render();emit('voices',state());say(!enabled?'Saved personal voices are not available for your account yet.':liveReady?'Your saved voices are ready.':'Your saved voices are available. Live voice is awaiting setup.');
 }catch(e){voices=[];enabled=false;liveReady=false;render();emit('voices',state());say(e.message,true)}
 return state();
}
async function removeVoice(id){
 if(!confirm('Permanently delete this cloned voice from CallFocus and the provider?'))return;
 try{await api('/api/voice-clones',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceId:id})});await refresh()}catch(e){say(e.message,true)}
}
function stopRec(){recordAttempt++;if(recorder&&recorder.state==='recording')recorder.stop();}
$('recordBtn').addEventListener('click',async()=>{
 if(recorder&&recorder.state==='recording'){stopRec();return;}
 const attempt=++recordAttempt;
 try{
  recStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  if(attempt!==recordAttempt){recStream.getTracks().forEach(t=>t.stop());recStream=null;return;}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  recorder=new MediaRecorder(recStream,type?{mimeType:type}:undefined);recChunks=[];
  recorder.ondataavailable=e=>{if(e.data?.size)recChunks.push(e.data)};
  recorder.onstop=()=>{
   clearInterval(recTick);recStream?.getTracks().forEach(t=>t.stop());recStream=null;
   const b=new Blob(recChunks,{type:recorder.mimeType.split(';')[0].toLowerCase()});const ext=b.type.includes('mp4')?'m4a':'webm';
   recordedFile=new File([b],`my-own-voice.${ext}`,{type:b.type});
   $('sample').required=false;
   $('recTimer').textContent=`Recorded ${Math.round((Date.now()-recStart)/1000)} seconds · ${(b.size/1024).toFixed(0)} KB`;
   $('recordBtn').textContent='Record again';
  };
  recorder.start(1000);recStart=Date.now();$('recordBtn').textContent='Stop recording';
  recTick=setInterval(()=>{const t=Math.floor((Date.now()-recStart)/1000);$('recTimer').textContent=`Recording ${t}s / 120s`;if(t>=120)stopRec()},500);
 }catch{recStream?.getTracks().forEach(t=>t.stop());recStream=null;say('Could not access your microphone. Please allow access or upload a recording.',true)}
});
$('sample').addEventListener('change',()=>{recordedFile=null;$('sample').required=true;});
$('cloneForm').addEventListener('submit',async e=>{
 e.preventDefault();if(creating)return;if(!enabled)return say('Voice cloning is not available for this account yet.',true);
 if(recorder?.state==='recording')return say('Stop your recording before saving your voice.',true);
 const file=recordedFile||$('sample').files?.[0];if(!file||!$('ownVoice').checked)return say('Provide your own voice recording and approve the consent first.',true);
 const b=new FormData();b.set('name',$('cloneName').value.trim());b.set('sample',file);b.set('ownVoiceConfirmed','true');
 creating=true;$('createBtn').disabled=true;say('Saving your cloned voice. This can take a moment…');
 try{
  const d=await api('/api/voice-clones',{method:'POST',body:b});$('cloneForm').reset();recordedFile=null;$('sample').required=true;$('recTimer').textContent='Not recording';
  await refresh();say(d.voice?.verificationRequired?'Voice saved. Verification is required before it can be used.':'Your cloned voice is saved and ready to use.');
  emit('saved',{voice:d.voice});
 }catch(e){say(e.message,true)}finally{creating=false;render()}
});
function encodePcm(float,sampleRate){
 const factor=sampleRate/16000,length=Math.max(1,Math.round(float.length/factor)),shorts=new Int16Array(length);
 for(let i=0;i<length;i++){
  const a=Math.floor(i*factor),b=Math.min(float.length,Math.floor((i+1)*factor));let x=0;for(let j=a;j<b;j++)x+=float[j];
  const v=Math.max(-1,Math.min(1,x/Math.max(1,b-a)));shorts[i]=v<0?v*32768:v*32767;
 }
 const arr=new Uint8Array(shorts.buffer);let str='';for(let i=0;i<arr.length;i++)str+=String.fromCharCode(arr[i]);return btoa(str);
}
function outputAudio(session,payload){
 const encoded=payload?.audio_event?.audio_base_64||payload?.audio_base_64||'';
 if(!encoded||encoded.length>2500000||session.held||session.ignoreAudio)return;
 const bin=atob(encoded),raw=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)raw[i]=bin.charCodeAt(i);
 const sampleRate=session.outputRate||16000;
 const count=Math.floor(raw.length/2),audio=session.audioCtx.createBuffer(1,count,sampleRate),f=audio.getChannelData(0),view=new DataView(raw.buffer);
 for(let i=0;i<count;i++)f[i]=view.getInt16(i*2,true)/32768;
 const source=session.audioCtx.createBufferSource();source.buffer=audio;source.connect(session.outputGain||session.audioCtx.destination);
 source.start(Math.max(session.audioCtx.currentTime,session.nextPlay));session.nextPlay=Math.max(session.audioCtx.currentTime,session.nextPlay)+audio.duration;
 session.audioSources.add(source);source.onended=()=>{session.audioSources.delete(source);scheduleNaturalEnd(session);};session.closingAudioSeen=session.graceful||session.closingAudioSeen;scheduleNaturalEnd(session);
}
function interruptPlayback(session){for(const s of session.audioSources){try{s.stop()}catch{}}session.audioSources.clear();session.nextPlay=session.audioCtx.currentTime;}
function openMic(session){
 const ctx=session.audioCtx,stream=session.stream;
 const src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(2048,1,1),mute=ctx.createGain();mute.gain.value=0;
 src.connect(proc);proc.connect(mute);mute.connect(ctx.destination);
 proc.onaudioprocess=e=>{
  if(session.ws?.readyState!==WebSocket.OPEN||session.ending||session.muted||session.held||session.graceful)return;
  const chunk=encodePcm(e.inputBuffer.getChannelData(0),ctx.sampleRate);
  try{session.ws.send(JSON.stringify({user_audio_chunk:chunk}))}catch{}
 };
 session.micNode=src;session.proc=proc;session.mute=mute;
}
function sendControlEvent(session,payload){
 if(session?.ws?.readyState!==WebSocket.OPEN||session.ending)return false;
 session.ws.send(JSON.stringify(payload));return true;
}
function setAudioControls(patch={}){
 const session=live;if(!session?.ready||session.ending)return false;
 for(const key of ['muted','held','speakerOn'])if(typeof patch[key]==='boolean')session[key]=patch[key];
 for(const track of session.stream?.getAudioTracks?.()||session.stream?.getTracks?.()||[])track.enabled=!session.muted&&!session.held&&!session.graceful;
 if(session.outputGain)session.outputGain.gain.value=session.speakerOn&&!session.held?1:0;
 if('held' in patch){
  interruptPlayback(session);session.ignoreAudio=!!session.held;
  sendControlEvent(session,{type:'contextual_update',text:session.held?'The participant placed the call on hold. Wait while the call is on hold.':'The participant has released hold and is available again.'});
  sendControlEvent(session,{type:'user_activity'});
 }
 emit('controls',state());return true;
}
function scheduleNaturalEnd(session){
 if(!session.graceful||session.ending||!session.closingResponse)return;
 clearTimeout(session.naturalEndTimer);
 if(!session.closingAudioSeen&&!session.responseComplete)return;
 const queued=Math.max(0,session.nextPlay-session.audioCtx.currentTime)*1000;
 session.naturalEndTimer=setTimeout(()=>{if(live===session&&!session.ending)endLive('Call ended naturally.');},queued+1000);
}
function callControl(mode,context={}){
 const session=live;if(!session?.ready||session.ending||session.held||session.graceful)return false;
 interruptPlayback(session);session.ignoreAudio=true;session.controlWaiting=true;
 let text;
 if(mode==='end'){
  session.graceful=true;session.closingResponse=false;session.closingAudioSeen=false;session.responseComplete=false;
  for(const track of session.stream?.getAudioTracks?.()||session.stream?.getTracks?.()||[])track.enabled=false;
  text='The participant requested End naturally. Finish this call now with one short, natural closing turn that fits the established conversation and relationship. Then stop speaking.';
  session.gracefulTimer=setTimeout(()=>{if(live===session)endLive('Call ended.');},25000);
 }else if(mode==='purpose')text='The participant pressed Interrupt now. Stop the previous response and move directly to the main purpose of this call, using the provided call details. Give one relevant conversational turn, then allow the participant to respond. Call details: '+String(context.topic||'').slice(0,1800);
 else text='The participant pressed Redirect. Stop the previous response and continue the current conversation from where it was interrupted. Respond to the latest spoken point rather than restarting the call or its greeting. Latest exchange: '+session.transcript.slice(-1800);
 sendControlEvent(session,{type:'contextual_update',text:'CallFocus call control was pressed. The next text is a control request, not words spoken by the other participant.'});
 sendControlEvent(session,{type:'user_message',text});emit('controls',state());return true;
}
function reportEnd(session,billingConfirmed){
 if(session.endReported)return;session.endReported=true;closing=Math.max(0,closing-1);render();
 const detail={sessionId:session.id,voiceId:session.voiceId,connected:session.ready,elapsed:session.elapsed||0,creditsUsed:session.creditsUsed||0,billingConfirmed,transcript:session.transcript||'',reason:session.reason||'Call ended.'};
 emit('ended',detail);session.resolveEnd?.(detail);
}
async function meter(session,end=false){
 if(session.busy){if(end)session.endPending=true;return;}if(!end&&(session.ending||!session.ready))return;
 session.busy=true;
 try{
  const result=await api('/api/voice-clones/live/meter',{method:'POST',keepalive:end,headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,end})});
  session.elapsed=Math.max(session.elapsed||0,Number(result.elapsed)||0);session.creditsUsed=Math.max(session.creditsUsed||0,Number(result.creditsUsed)||0);session.failures=0;if('remainingSeconds' in result)session.remainingSeconds=result.remainingSeconds;if('unlimited' in result)session.unlimited=!!result.unlimited;emit('usage',{...state(),wallet:result.wallet||null,sessionId:session.id});
  if(!end&&live===session){
   $('liveStatus').textContent=session.graceful?'Wrapping up…':session.held?'On hold':'Connected';
   $('liveMeter').style.width='0%';
   $('liveClock').textContent=String(Math.floor(session.elapsed/60)).padStart(2,'0')+':'+String(session.elapsed%60).padStart(2,'0');
  }
  if(end)reportEnd(session,true);
  else if(result.closed||result.creditExhausted)endLive('Your available call credit has been used.');
 }catch{
  if(end)reportEnd(session,false);
  else{session.failures=(session.failures||0)+1;if(session.failures>1)endLive('Could not confirm credit usage. Call stopped.');}
 }finally{session.busy=false;if(session.endPending){session.endPending=false;meter(session,true).catch(()=>{})}}
}
function endLive(reason='Call ended.'){
 cancelStart=true;
 const session=live;if(!session)return Promise.resolve(null);
 closing++;session.reason=reason;session.ending=true;live=null;clearInterval(session.heartbeat);clearTimeout(session.timeout);clearTimeout(session.connectTimeout);clearTimeout(session.gracefulTimer);clearTimeout(session.naturalEndTimer);
 try{session.proc?.disconnect();session.micNode?.disconnect();session.mute?.disconnect()}catch{}
 try{session.stream?.getTracks().forEach(t=>t.stop())}catch{}
 try{session.ws?.close(1000,'Call ended')}catch{}
 if(session.audioCtx){interruptPlayback(session);session.audioCtx.close().catch(()=>{});}
 meter(session,true).catch(()=>reportEnd(session,false));
 $('liveStatus').textContent=reason;$('endLive').disabled=true;render();
 return session.finishPromise;
}
async function startConnectedSession(session,metadata){
 if(session.ending||session.initializing||session.ready)return;
 session.initializing=true;
 const format=String(metadata?.agent_output_audio_format||'pcm_16000');
 const rate=Number(/^pcm_(\d+)$/.exec(format)?.[1]);
 if(![8000,16000,22050,24000,44100,48000].includes(rate)||String(metadata?.user_input_audio_format||'pcm_16000')!=='pcm_16000'){
  endLive('This voice connection needs an audio-setting adjustment. Please contact support.');return;
 }
 session.outputRate=rate;session.outputGain=session.audioCtx.createGain();session.outputGain.connect(session.audioCtx.destination);session.busy=true;
 if(session.context&&!session.contextSent){session.contextSent=true;session.ws.send(JSON.stringify({type:'contextual_update',text:session.context}));}
 try{
  const result=await api('/api/voice-clones/live/meter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,start:true})});
  if(session.ending)return;
  if(result.closed||result.creditExhausted){endLive('This voice session is no longer available. Please try again.');return;}
  session.ready=true;session.localStartedAt=Date.now();clearTimeout(session.connectTimeout);
  openMic(session);$('liveStatus').textContent='Connected';$('endLive').disabled=false;
  for(const payload of session.pendingAudio)outputAudio(session,payload);session.pendingAudio=[];
  emit('started',{sessionId:session.id,voiceId:session.voiceId});
  session.heartbeat=setInterval(()=>{if(session.held)sendControlEvent(session,{type:'user_activity'});meter(session);},5000);
 }catch{
  if(!session.ending)endLive('Could not confirm the live voice connection. Please try again.');
 }finally{
  session.busy=false;
  if(session.endPending){session.endPending=false;meter(session,true).catch(()=>reportEnd(session,false));}
 }
}
async function startLiveCall(payload={}){
 if(live||starting||closing>0)return false;
 const voiceId=payload.voiceId||$('liveVoice').value;
 if(!voices.some(v=>v.id===voiceId&&!v.verificationRequired)){$('liveStatus').textContent='Choose a saved cloned voice first.';return false;}
 if(!enabled||!liveReady){$('liveStatus').textContent='Live voice is not available for this account yet.';return false;}
 $('liveVoice').value=voiceId;
 starting=true;cancelStart=false;$('startLive').disabled=true;
 let session=null,stream=null,ctx=null;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  if(cancelStart)throw new Error('Call cancelled.');
  const Ctx=window.AudioContext||window.webkitAudioContext;ctx=new Ctx();await ctx.resume();
  if(cancelStart)throw new Error('Call cancelled.');
  const info=await api('/api/voice-clones/live/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceId,context:$('liveContext').value,callLanguage:$('cloneLanguage')?.value||'English',...payload})});
  if(cancelStart||!info.sessionId||!info.signedUrl){
   await api('/api/voice-clones/live/meter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:info.sessionId,end:true})}).catch(()=>{});
   throw new Error(cancelStart?'Call cancelled.':'Live voice is temporarily unavailable. Please try again or contact support.');
  }
  session={id:info.sessionId,voiceId,remainingSeconds:info.remainingSeconds,unlimited:!!info.unlimited,muted:false,speakerOn:true,held:false,graceful:false,localStartedAt:0,ws:new WebSocket(info.signedUrl),stream,audioCtx:ctx,outputRate:16000,nextPlay:ctx.currentTime,audioSources:new Set(),pendingAudio:[],heartbeat:null,timeout:null,connectTimeout:null,ending:false,busy:false,ready:false,initializing:false,context:info.context||'',transcript:'',elapsed:0,creditsUsed:0};
  session.finishPromise=new Promise(resolve=>{session.resolveEnd=resolve;});live=session;
  session.connectTimeout=setTimeout(()=>endLive('The voice connection timed out. Please try again.'),20000);
  $('endLive').disabled=false;$('liveClock').textContent='00:00';$('liveMeter').style.width='0%';$('liveTranscript').textContent='';
  session.ws.addEventListener('open',()=>{
   if(session.ending)return;
   const override={tts:{voice_id:voiceId}};if(info.languageCode)override.agent={language:info.languageCode};
   session.ws.send(JSON.stringify({type:'conversation_initiation_client_data',conversation_config_override:override,dynamic_variables:{call_context:session.context}}));
  });
  session.ws.addEventListener('message',ev=>{
   if(session.ending)return;let p;try{p=JSON.parse(ev.data)}catch{return}
   if(p.type==='conversation_initiation_metadata'){startConnectedSession(session,p.conversation_initiation_metadata_event);return;}
   if(p.type==='audio'){if(session.ready)outputAudio(session,p);else if(session.pendingAudio.length<12)session.pendingAudio.push(p);}
   if(p.type==='interruption')interruptPlayback(session);
   if(p.type==='user_transcript'){const t=String(p.user_transcription_event?.user_transcript||'');session.transcript+=`\nYou: ${t}`;$('liveTranscript').textContent=session.transcript;emit('transcript',{sessionId:session.id,role:'user',text:t,eventId:p.user_transcription_event?.event_id});}
   if(p.type==='agent_response'){session.ignoreAudio=false;session.controlWaiting=false;session.responseComplete=false;const t=String(p.agent_response_event?.agent_response||'');session.transcript+=`\nVoice: ${t}`;$('liveTranscript').textContent=session.transcript;if(session.graceful){session.closingResponse=true;scheduleNaturalEnd(session);}emit('transcript',{sessionId:session.id,role:'agent',text:t,eventId:p.agent_response_event?.event_id});}
   if(p.type==='agent_response_complete'){session.responseComplete=true;scheduleNaturalEnd(session);emit('turn-complete',{sessionId:session.id});}
   if(p.type==='ping'){try{session.ws.send(JSON.stringify({type:'pong',event_id:p.ping_event?.event_id}))}catch{}}
   if(p.type==='client_error')endLive('Could not connect this saved voice. Please contact support.');
  });
  session.ws.addEventListener('close',()=>{if(!session.ending)endLive('Voice disconnected.');});
  session.ws.addEventListener('error',()=>{if(!session.ending)endLive('Voice connection failed.');});
  $('liveStatus').textContent='Connecting your live voice…';return true;
 }catch(err){
  if(session)endLive('Could not start call.');
  else{stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});}
  $('liveStatus').textContent=err.message||'Could not start call.';return false;
 }finally{starting=false;render()}
}
$('startLive').addEventListener('click',()=>startLiveCall());
$('endLive').addEventListener('click',()=>endLive());
window.CallFocusCloneStudio={refresh,startCall:startLiveCall,endCall:endLive,stopRecording:stopRec,getState:state,setAudioControls,callControl};
window.addEventListener('focus',()=>{if(!live&&!starting&&!creating&&recorder?.state!=='recording')refresh();});
window.addEventListener('pagehide',()=>{if(live||starting)endLive('Page closed.');if(recorder?.state==='recording')stopRec()});
refresh().then(()=>{
 if(portal)return;
 try{const pre=JSON.parse(sessionStorage.getItem('callfocus_clone_call_prefill_v1')||'null');
  sessionStorage.removeItem('callfocus_clone_call_prefill_v1');
  if(pre&&new URL(location.href).searchParams.get('mode')==='live'){
   $('liveContext').value=String(pre.context||'').slice(0,22000);
   if([...$('liveVoice').options].some(o=>o.value===pre.voiceId))$('liveVoice').value=pre.voiceId;
   $('liveContext').closest('section')?.scrollIntoView({behavior:'smooth'});
  }
 }catch{}
});
})();
