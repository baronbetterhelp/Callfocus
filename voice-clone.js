/* CallFocus V16.15 — optional voice-clone studio. No API keys in client code. */
(()=>{'use strict';
const $=id=>document.getElementById(id),token=()=>{try{return localStorage.getItem('callfocus_server_session_v1')||'';}catch{return'';}};
let voices=[],enabled=false,liveReady=false,recorder=null,recStream=null,recChunks=[],recStart=0,recTick=null;
let live=null,recordedFile=null;
const say=(message,error=false)=>{const el=$('status');el.textContent=message;el.classList.toggle('error',error);};
async function api(path,options={}){
 const h=new Headers(options.headers||{});h.set('Authorization','Bearer '+token());
 const r=await fetch(path,{...options,headers:h,cache:'no-store'});
 if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data?.error||`Request failed (${r.status}).`)}return r.json();
}
function render(){
 $('voiceLimit').textContent=`${voices.length} / 3`;
 const list=$('voices');list.replaceChildren();
 if(!voices.length){const p=document.createElement('p');p.textContent='No cloned voices saved yet.';list.append(p)}
 const select=$('liveVoice');select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Select my own saved voice';select.append(blank);
 for(const v of voices){
  const item=document.createElement('div');item.className='voice-item';
  const content=document.createElement('div'),name=document.createElement('strong');name.textContent=v.name;content.append(name);
  const p=document.createElement('div');p.className='small';p.textContent=v.verificationRequired?'Provider verification required (not available for playback)':'Personal cloned voice · consent recorded';content.append(p);item.append(content);
  const btn=document.createElement('button');btn.className='danger';btn.textContent='Delete';btn.disabled=!!live;
  btn.addEventListener('click',()=>removeVoice(v.id));item.append(btn);list.append(item);
  if(!v.verificationRequired){const o=document.createElement('option');o.value=v.id;o.textContent=v.name;select.append(o)}
 }
 $('createBtn').disabled=!enabled||voices.length>=3;
 $('startLive').disabled=!liveReady||!!live||!voices.some(v=>!v.verificationRequired);
}
async function refresh(){
 if(!token()){say('Please sign in on CallFocus first, then return to this page.',true);$('voices').textContent='Open CallFocus Home to sign in.';return;}
 try{const d=await api('/api/voice-clones');voices=d.voices||[];enabled=!!d.enabled;liveReady=!!d.liveReady;
   render();say(!enabled?'Voice cloning is prepared but disabled pending the owner’s ElevenLabs setup.':liveReady?'Voice cloning and live agent pilot are configured.':'Voice cloning is configured. The live agent still needs setup.');
 }catch(e){say(e.message,true)}
}
async function removeVoice(id){
 if(!confirm('Permanently delete this cloned voice from CallFocus and the provider?'))return;
 try{await api('/api/voice-clones',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceId:id})});await refresh()}catch(e){say(e.message,true)}
}
function stopRec(){if(recorder&&recorder.state==='recording')recorder.stop();}
$('recordBtn').addEventListener('click',async()=>{
 if(recorder&&recorder.state==='recording'){stopRec();return;}
 try{
  recStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  recorder=new MediaRecorder(recStream,type?{mimeType:type}:undefined);recChunks=[];
  recorder.ondataavailable=e=>{if(e.data?.size)recChunks.push(e.data)};
  recorder.onstop=()=>{
   clearInterval(recTick);recStream?.getTracks().forEach(t=>t.stop());recStream=null;
   const b=new Blob(recChunks,{type:recorder.mimeType});const ext=b.type.includes('mp4')?'m4a':'webm';
   const file=new File([b],`my-own-voice.${ext}`,{type:b.type});
   recordedFile=file;
   $('recTimer').textContent=`Recorded ${Math.round((Date.now()-recStart)/1000)} seconds · ${(b.size/1024).toFixed(0)} KB`;
   $('recordBtn').textContent='Record again';
  };
  recorder.start(1000);recStart=Date.now();$('recordBtn').textContent='Stop recording';
  recTick=setInterval(()=>{const t=Math.floor((Date.now()-recStart)/1000);$('recTimer').textContent=`Recording ${t}s / 120s`;if(t>=120)stopRec()},500);
 }catch(e){say('Could not access microphone: '+e.message,true)}
});
$('sample').addEventListener('change',()=>{recordedFile=null});
$('cloneForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!enabled)return say('The owner has not enabled voice cloning yet.',true);
 const file=recordedFile||$('sample').files?.[0];if(!file||!$('ownVoice').checked)return say('You must provide your own voice recording and consent.',true);
 const b=new FormData();b.set('name',$('cloneName').value.trim());b.set('sample',file);b.set('ownVoiceConfirmed','true');
 $('createBtn').disabled=true;say('Creating your own cloned voice. This can take a moment…');
 try{const d=await api('/api/voice-clones',{method:'POST',body:b});$('cloneForm').reset();recordedFile=null;await refresh();say(d.voice?.verificationRequired?'Voice created. Provider verification is required before it can be used.':'Your cloned voice is saved and ready to use.');}
 catch(e){say(e.message,true)}finally{render()}
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
 if(!encoded||encoded.length>2500000)return;
 const bin=atob(encoded),raw=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)raw[i]=bin.charCodeAt(i);
 const sampleRate=session.outputRate||16000;
 const count=Math.floor(raw.length/2),audio=session.audioCtx.createBuffer(1,count,sampleRate),f=audio.getChannelData(0),view=new DataView(raw.buffer);
 for(let i=0;i<count;i++)f[i]=view.getInt16(i*2,true)/32768;
 const source=session.audioCtx.createBufferSource();source.buffer=audio;source.connect(session.audioCtx.destination);
 source.start(Math.max(session.audioCtx.currentTime,session.nextPlay));session.nextPlay=Math.max(session.audioCtx.currentTime,session.nextPlay)+audio.duration;
 session.audioSources.add(source);source.onended=()=>session.audioSources.delete(source);
}
function interruptPlayback(session){for(const s of session.audioSources){try{s.stop()}catch{}}session.audioSources.clear();session.nextPlay=session.audioCtx.currentTime;}
function openMic(session){
 const ctx=session.audioCtx,stream=session.stream;
 const src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(2048,1,1),mute=ctx.createGain();mute.gain.value=0;
 src.connect(proc);proc.connect(mute);mute.connect(ctx.destination);
 proc.onaudioprocess=e=>{
  if(session.ws?.readyState!==WebSocket.OPEN||session.ending)return;
  const chunk=encodePcm(e.inputBuffer.getChannelData(0),ctx.sampleRate);
  try{session.ws.send(JSON.stringify({user_audio_chunk:chunk}))}catch{}
 };
 session.micNode=src;session.proc=proc;session.mute=mute;
}
async function meter(session,end=false){
 if(session.busy){if(end)session.endPending=true;return;}if(!end&&session.ending)return;
 session.busy=true;
 try{
  const result=await api('/api/voice-clones/live/meter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session.id,end})});
  $('liveStatus').textContent=`${result.elapsed}s · ${result.creditsUsed} credits billed`;
  $('liveMeter').style.width=`${Math.min(100,100*result.elapsed/session.maxSeconds)}%`;
  $('liveClock').textContent='00:'+String(Math.min(59,result.elapsed)).padStart(2,'0');
  if((result.closed||result.creditExhausted)&&!end)endLive('Pilot time or available credits reached.');
 }catch(err){if(!end){session.failures=(session.failures||0)+1;if(session.failures>1)endLive('Could not confirm credit usage. Call stopped.')}}
 finally{session.busy=false;if(session.endPending){session.endPending=false;meter(session,true).catch(()=>{})}}
}
function endLive(reason='Call ended.'){
 const session=live;if(!session)return;
 session.ending=true;live=null;clearInterval(session.heartbeat);clearTimeout(session.timeout);
 try{session.proc?.disconnect();session.micNode?.disconnect();session.mute?.disconnect()}catch{}
 try{session.stream?.getTracks().forEach(t=>t.stop())}catch{}
 try{session.ws?.close(1000,'Call ended')}catch{}
 if(session.audioCtx){interruptPlayback(session);session.audioCtx.close().catch(()=>{});}
 meter(session,true).catch(()=>{});
 $('liveStatus').textContent=reason;$('endLive').disabled=true;render();
}
$('startLive').addEventListener('click',async()=>{
 if(live)return;const voiceId=$('liveVoice').value;
 if(!voiceId){$('liveStatus').textContent='Choose a cloned voice first.';return}
 $('startLive').disabled=true;
 let session=null;
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx();await ctx.resume();
  try{
   const info=await api('/api/voice-clones/live/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceId,context:$('liveContext').value})});
   session={id:info.sessionId,voiceId,maxSeconds:info.maxSeconds,ws:new WebSocket(info.signedUrl),stream,audioCtx:ctx,outputRate:16000,nextPlay:ctx.currentTime,audioSources:new Set(),heartbeat:null,timeout:null,ending:false,busy:false};
   live=session;
   session.ws.addEventListener('open',()=>{
    if(session.ending)return;
    // The owner must enable Voice ID and System Prompt overrides on the private agent.
    const guidance='You are an AI-generated conversational voice, not a real human. Disclose this when relevant or asked. Do not impersonate anyone. Keep responses short, conversational, and natural. Do not facilitate fraud, sexual content, or deceptive impersonation. Context: '+String(info.context||'');
    session.ws.send(JSON.stringify({type:'conversation_initiation_client_data',conversation_config_override:{agent:{prompt:{prompt:guidance}},tts:{voice_id:voiceId}}}));
    openMic(session);$('liveStatus').textContent='Connected · AI voice live';$('endLive').disabled=false;
    session.heartbeat=setInterval(()=>meter(session),5000);
    session.timeout=setTimeout(()=>endLive('Pilot time limit reached.'),info.maxSeconds*1000);
   });
   session.ws.addEventListener('message',ev=>{
    if(session.ending)return;let p;try{p=JSON.parse(ev.data)}catch{return}
    if(p.type==='conversation_initiation_metadata'){
     const format=String(p.conversation_initiation_metadata_event?.agent_output_audio_format||'');
     if(format==='pcm_44100')session.outputRate=44100;else if(format==='pcm_22050')session.outputRate=22050;else session.outputRate=16000;
    }
    if(p.type==='audio')outputAudio(session,p);
    if(p.type==='interruption')interruptPlayback(session);
    if(p.type==='user_transcript'){
     const t=String(p.user_transcription_event?.user_transcript||'');$('liveTranscript').textContent+=`\nYou: ${t}`;
    }
    if(p.type==='agent_response'){
     const t=String(p.agent_response_event?.agent_response||'');$('liveTranscript').textContent+=`\nAI: ${t}`;
    }
    if(p.type==='ping'){try{session.ws.send(JSON.stringify({type:'pong',event_id:p.ping_event?.event_id}))}catch{}}
    if(p.type==='client_error')endLive('Voice agent reported an error. Check agent overrides.');
   });
   session.ws.addEventListener('close',()=>{if(!session.ending)endLive('Voice agent disconnected.');});
   session.ws.addEventListener('error',()=>{if(!session.ending)endLive('Voice connection failed.');});
   $('liveStatus').textContent='Connecting to private AI voice agent…';
  }catch(e){stream.getTracks().forEach(t=>t.stop());ctx.close().catch(()=>{});throw e}
 }catch(err){$('liveStatus').textContent=err.message||'Could not start call.';if(session)endLive('Could not start call.');}
 finally{render()}
});
$('endLive').addEventListener('click',()=>endLive());
window.addEventListener('pagehide',()=>{if(live)endLive('Page closed.');if(recorder?.state==='recording')stopRec()});
refresh().then(()=>{
 try{const pre=JSON.parse(sessionStorage.getItem('callfocus_clone_call_prefill_v1')||'null');
  sessionStorage.removeItem('callfocus_clone_call_prefill_v1');
  if(pre&&new URL(location.href).searchParams.get('mode')==='live'){
   $('liveContext').value=String(pre.context||'').slice(0,2400);
   if([...$('liveVoice').options].some(o=>o.value===pre.voiceId))$('liveVoice').value=pre.voiceId;
   document.getElementById('liveContext').closest('section')?.scrollIntoView({behavior:'smooth'});
  }
 }catch{}
});
})();
