/* CallFocus V16.19 — isolated ElevenLabs voice cloning and conversation adapter.
   This file does not change existing GPT-Live functions, voice selection, or routes. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const auth=()=>localStorage.getItem('callfocus_server_session_v1')||'';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=s=>{if(typeof window.toast==='function')window.toast(s);else alert(s)};
  let voices=[],newSelected='',repeatSelected='',noteSelected='',busy=false,active=null,recorder=null,recordedBlob=null,recordStart=0,recordTimer=0,recordStream=null;
  async function request(path,{method='GET',body,form=false}={}){
    if(!auth())throw Error('Sign in to CallFocus before using voice cloning.');
    const r=await fetch(path,{method,headers:{Authorization:`Bearer ${auth()}`,...(body&&!form?{'Content-Type':'application/json'}:{})},body:form?body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let payload={};try{payload=await r.json()}catch{}if(!r.ok||!payload.ok)throw Error(payload.error||`ElevenLabs request failed (${r.status}).`);return payload;
  }
  async function loadVoices(){
    if(!auth()){voices=[];render();return}
    try{const data=await request('/api/elevenlabs/voices');voices=data.voices||[]}catch(err){console.warn('CallFocus ElevenLabs voice list:',err.message);voices=[]}
    render();
  }
  function choices(selected){return `<option value="">Use normal Male / Female voice (OpenAI)</option>${voices.map(v=>`<option value="${esc(v.id)}" ${selected===v.id?'selected':''} ${v.requiresVerification?'disabled':''}>${esc(v.name)}${v.requiresVerification?' · verification required':''}</option>`).join('')}`;}
  function voicePanel(scope){const selected=scope==='new'?newSelected:scope==='repeat'?repeatSelected:noteSelected;return `<div class="cf-el-box" id="cf-el-${scope}"><h3>Clone your voice</h3><p>Record or upload your own voice, save it, and choose it here for your ${scope==='note'?'voice notes':'calls'}.</p><button class="cf-el-action" type="button" data-el-open>+ Create your own voice</button><label style="margin-top:17px" for="cf-el-select-${scope}">My saved cloned voice</label><select id="cf-el-select-${scope}" data-el-select="${scope}">${choices(selected)}</select><small class="cf-el-muted">Normal voices continue using your existing OpenAI setup. A saved clone uses ElevenLabs instead.</small></div>`;}
  function render(){
    const field=$('newCallVoiceGender')?.closest('.field-section')?.querySelector('.field-content');
    if(field){let host=$('cf-el-new');if(!host){host=document.createElement('div');host.id='cf-el-new';const aiPicker=$('newCallAiVoicePicker');const opening=field.querySelector('.call-opening-box');field.insertBefore(host,aiPicker||opening||null)}host.outerHTML=voicePanel('new');}
    const repeat=$('threadDetailPanel')?.querySelector('.cf-repeat-voice');
    if(repeat){let host=$('cf-el-repeat');if(!host){host=document.createElement('div');host.id='cf-el-repeat';repeat.insertAdjacentElement('afterend',host)}host.outerHTML=voicePanel('repeat');}
    const voiceRow=$('voiceNotePrompt')?.closest('.voice-note-composer')?.querySelector('.voice-note-gender-row');
    if(voiceRow){let host=$('cf-el-note');if(!host){host=document.createElement('div');host.id='cf-el-note';voiceRow.insertAdjacentElement('afterend',host)}host.outerHTML=voicePanel('note');}
    const hero=$('heroNewCallBtn');const quick=hero?.parentElement;
    if(quick&&!$('cf-el-home-btn')){const btn=document.createElement('button');btn.id='cf-el-home-btn';btn.className='cf-el-home';btn.type='button';btn.textContent='◉  Clone your voice';quick.insertAdjacentElement('afterend',btn);btn.addEventListener('click',openModal)}
    const saved=$('cf-el-saved-list');if(saved)saved.innerHTML=voices.length?`<ul>${voices.map(v=>`<li>${esc(v.name)}${v.requiresVerification?' · verification required':''}</li>`).join('')}</ul>`:'No saved voices yet.';
  }
  function installModal(){if($('cf-el-layer'))return;const div=document.createElement('div');div.className='cf-el-layer';div.id='cf-el-layer';div.innerHTML=`<div class="cf-el-modal" role="dialog" aria-modal="true" aria-labelledby="cf-el-title"><button type="button" class="cf-el-close" id="cf-el-close" aria-label="Close">×</button><small>YOUR PERSONAL VOICE · ELEVENLABS</small><h2 id="cf-el-title">Create your own voice</h2><p>Record or upload 30–120 seconds of clear speech. A quiet, consistent 1–2 minute sample is recommended. Save it once and choose it for future calls and voice notes.</p><div class="cf-el-status" id="cf-el-status" aria-live="polite">Your saved voices are ready.</div><label class="cf-el-label" for="cf-el-name">Voice name</label><input type="text" id="cf-el-name" maxlength="65" placeholder="My own voice" /><div class="cf-el-row" style="margin-top:17px"><button type="button" class="cf-el-action" id="cf-el-record">Record sample</button><span id="cf-el-record-info">Not recording</span></div><label class="cf-el-label" for="cf-el-file">Or upload your own recording</label><input id="cf-el-file" type="file" accept="audio/*,.m4a,.mp3,.webm,.wav,.ogg,.flac" /><label class="cf-el-consent"><input id="cf-el-consent" type="checkbox"/><span>This is my own adult voice. I consent to its AI cloning and understand that generated speech must not be presented as a real recording of me.</span></label><p>Your sample is sent privately to ElevenLabs for voice cloning. Some voices require verification before use.</p><button class="cf-el-save" id="cf-el-save" type="button">Save my voice</button><div class="cf-el-saved"><strong>My saved voices <span id="cf-el-count">0 / 3</span></strong><div id="cf-el-saved-list"></div></div></div>`;document.body.append(div);$('cf-el-close').onclick=closeModal;div.addEventListener('click',e=>{if(e.target===div)closeModal()});$('cf-el-record').onclick=toggleRecording;$('cf-el-save').onclick=saveVoice;
  }
  async function openModal(){if(!auth())return notify('Sign in to CallFocus first.');installModal();$('cf-el-layer').classList.add('open');$('cf-el-count').textContent=`${voices.length} / 3`;render();await loadVoices();$('cf-el-count').textContent=`${voices.length} / 3`}
  function closeModal(){if(recorder?.state==='recording')recorder.stop();$('cf-el-layer')?.classList.remove('open')}
  function status(text){if($('cf-el-status'))$('cf-el-status').textContent=text}
  async function toggleRecording(){
    if(recorder?.state==='recording'){recorder.stop();return}
    if(!navigator.mediaDevices?.getUserMedia)return status('Microphone recording is not supported in this browser. Upload an audio file instead.');
    try{
      recordedBlob=null;recordStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];let mime=types.find(t=>MediaRecorder.isTypeSupported?.(t));recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);const chunks=[];
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=()=>{recordedBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});recordStream?.getTracks().forEach(t=>t.stop());clearInterval(recordTimer);$('cf-el-record').textContent='Record again';$('cf-el-record-info').textContent=`Recorded ${Math.round((Date.now()-recordStart)/1000)} seconds · ${Math.round(recordedBlob.size/1024)} KB`;status('Recording ready. Enter a name and save your voice.')};
      recorder.start(500);recordStart=Date.now();$('cf-el-record').textContent='Stop recording';recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStart)/1000);$('cf-el-record-info').textContent=`Recording ${s} seconds`;if(s>=120)recorder.stop()},1000);status('Speak clearly in your normal voice.');
    }catch(err){status('Microphone unavailable: '+err.message)}
  }
  async function saveVoice(){if(busy)return;if(voices.length>=3)return status('You have already saved 3 voices.');
    const name=$('cf-el-name')?.value.trim();const audio=$('cf-el-file')?.files?.[0]||recordedBlob;
    if(!name)return status('Give this voice a name.');if(!audio)return status('Record or upload your own voice first.');if(!$('cf-el-consent')?.checked)return status('Confirm your consent before saving.');
    const elapsed=recordedBlob===audio?(Date.now()-recordStart)/1000:null;
    if(elapsed!=null&&elapsed<10)return status('Record at least 10 seconds. 60–120 seconds is recommended for best results.');
    busy=true;$('cf-el-save').disabled=true;status('Saving your cloned voice with ElevenLabs…');
    try{const form=new FormData();const extension=(audio.type||'').includes('mp4')?'m4a':(audio.type||'').includes('webm')?'webm':'mp3';form.set('name',name);form.set('consent','yes');form.set('audio',audio,audio.name||`my-voice.${extension}`);const result=await request('/api/elevenlabs/clone',{method:'POST',body:form,form:true});voices=[...voices,result.voice];status(result.voice.requiresVerification?'Voice created. Complete verification in your ElevenLabs account before using it.':'Voice saved. You can now select it for calls and voice notes.');$('cf-el-count').textContent=`${voices.length} / 3`;render()}
    catch(err){status(err.message)}finally{busy=false;$('cf-el-save').disabled=false}
  }
  function send(ws,obj){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))}
  const b64bytes=data=>{const bin=atob(data);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes};
  const base64=data=>{let result='';const a=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);for(let i=0;i<a.length;i+=8192)result+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(result)};
  function downsample(input,inRate,outRate=16000){const ratio=inRate/outRate;if(ratio<=1)return input;const n=Math.floor(input.length/ratio);const out=new Float32Array(n);for(let i=0;i<n;i++){const start=Math.floor(i*ratio),end=Math.max(start+1,Math.floor((i+1)*ratio));let total=0;for(let j=start;j<Math.min(end,input.length);j++)total+=input[j];out[i]=total/(end-start)}return out}
  function pcm16(input){const bytes=new Uint8Array(input.length*2);const view=new DataView(bytes.buffer);for(let i=0;i<input.length;i++){const s=Math.max(-1,Math.min(1,input[i]));view.setInt16(i*2,s<0?s*32768:s*32767,true)}return bytes}
  function updateTranscript(text,speaker){const el=$('liveTranscript');if(el){const line=`${speaker}: ${text}\n`;el.textContent=(el.textContent+line).slice(-16000);el.scrollTop=el.scrollHeight;}if(active){active.call.assistantTranscript=(active.call.assistantTranscript||'')+(speaker==='Voice'?' '+text:'');}}
  function playPcm(a,b64){if(!a?.playContext||!b64)return;const bytes=b64bytes(b64),n=Math.floor(bytes.length/2);if(!n)return;const samples=new Float32Array(n),dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let i=0;i<n;i++)samples[i]=dv.getInt16(i*2,true)/32768;const rate=a.outputRate||16000;const buffer=a.playContext.createBuffer(1,n,rate);buffer.getChannelData(0).set(samples);const src=a.playContext.createBufferSource();src.buffer=buffer;src.connect(a.gain);const now=a.playContext.currentTime;a.nextPlay=Math.max(now+.025,a.nextPlay||now);src.start(a.nextPlay);a.nextPlay+=buffer.duration;a.sources.add(src);src.onended=()=>a.sources.delete(src)}
  function stopPlayback(a){if(!a)return;for(const s of a.sources||[]){try{s.stop()}catch{}}a.sources?.clear();a.nextPlay=a.playContext?.currentTime||0}
  async function setupAudio(a){
    a.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    a.playContext=new(window.AudioContext||window.webkitAudioContext)();await a.playContext.resume();a.gain=a.playContext.createGain();a.gain.connect(a.playContext.destination);
    a.captureContext=new(window.AudioContext||window.webkitAudioContext)();a.source=a.captureContext.createMediaStreamSource(a.stream);a.processor=a.captureContext.createScriptProcessor(4096,1,1);
    const silent=a.captureContext.createGain();silent.gain.value=0;a.processor.connect(silent);silent.connect(a.captureContext.destination);a.source.connect(a.processor);
    a.processor.onaudioprocess=e=>{if(!a.started||a.muted||a.held||a.ws?.readyState!==WebSocket.OPEN)return;const floats=downsample(e.inputBuffer.getChannelData(0),a.captureContext.sampleRate,16000);send(a.ws,{user_audio_chunk:base64(pcm16(floats))})};
  }
  async function end(a,save=true){if(!a||a.ending)return;a.ending=true;try{a.ws?.close(1000,'Call ended')}catch{}try{a.processor?.disconnect();a.source?.disconnect();a.stream?.getTracks().forEach(t=>t.stop());stopPlayback(a);await a.captureContext?.close();await a.playContext?.close()}catch{}
    if(active===a)active=null;try{await cleanupCall(save)}catch(err){console.warn('CallFocus ElevenLabs cleanup:',err)}
  }
  function configureButtons(a){
    // Override click handlers only while an ElevenLabs call is active; original OpenAI handlers remain intact.
    const on=(id,fn)=>{const button=$(id);if(!button)return;button.addEventListener('click',e=>{if(active!==a)return;e.preventDefault();e.stopImmediatePropagation();fn()},true)};
    on('liveStartCallBtn',()=>{a.started=true;live.started=true;live.connected=true;a.stream?.getAudioTracks().forEach(t=>t.enabled=true);$('liveStartCallBtn')?.classList.add('hidden');$('callScreen')?.classList.remove('awaiting-start');$('liveStatus').textContent='ElevenLabs · Connected';$('liveCaption').textContent='Call live. Listening.';startTimer();for(const audio of a.pendingAudio.splice(0))playPcm(a,audio)});
    on('muteBtn',()=>{a.muted=!a.muted;live.muted=a.muted;a.stream?.getAudioTracks().forEach(t=>t.enabled=!a.muted&&!a.held);$('muteBtn')?.classList.toggle('active',a.muted)});
    on('holdBtn',()=>{a.held=!a.held;live.held=a.held;a.stream?.getAudioTracks().forEach(t=>t.enabled=!a.held&&!a.muted);$('holdBtn')?.classList.toggle('active',a.held)});
    on('speakerBtn',()=>{a.speakerOn=!a.speakerOn;a.gain.gain.value=a.speakerOn?1:0;live.speakerOn=a.speakerOn;$('speakerBtn')?.classList.toggle('active',!a.speakerOn)});
    on('requestEndBtn',()=>{send(a.ws,{type:'contextual_update',text:'The caller requests a short, natural goodbye, then silence.'});$('liveCaption').textContent='Requested a natural ending.';setTimeout(()=>{if(active===a)end(a,true)},7000)});
    on('endCallBtn',()=>end(a,true));on('activeCallEndBtn',()=>end(a,true));
  }
  async function startElevenCall(call,selection){
    if(active){notify('End your current call before starting another.');return}
    if(!auth())return notify('Sign in to start a call.');
    if(window.CallFocusCredits?.currentBalanceSeconds&&window.CallFocusCredits.currentBalanceSeconds()<15&&window.CallFocusEntitlements?.unlimited!==true){notify('Not enough CallFocus credits to start.');return}
    const a={call,started:false,ending:false,muted:false,held:false,speakerOn:true,nextPlay:0,sources:new Set(),pendingAudio:[],ws:null,stream:null};
    active=a;closeModal('');try{window.closeModal?.('newCallModal')}catch{}$('newCallModal')?.classList.add('hidden');
    $('callScreen')?.classList.remove('hidden');document.body.style.overflow='hidden';$('liveCallerName').textContent=call.callerName||'Call';$('liveAvatar').textContent=(call.callerName||'C').slice(0,1).toUpperCase();$('liveRegion').textContent=[call.callerB?.region,call.callerB?.timezone].filter(Boolean).join(' · ');$('liveStatus').textContent='Connecting to ElevenLabs…';$('liveTranscript').textContent='';$('liveCaption').textContent='Preparing secure connection…';$('callTimer').textContent='00:00';$('callMoreTitle').textContent=call.title||call.callerName;$('callMoreTopic').textContent=call.topic||'';$('callMoreConnection').textContent='Connecting';$('callMorePanel')?.classList.add('hidden');$('liveStartCallBtn')?.classList.add('hidden');
    live.current=call;live.started=false;live.connected=false;live.stream=null;live.dc=null;live.pc=null;live.audio=null;live.seconds=0;live.creditSecondsUsed=0;call.engine='elevenlabs-agent';call.providerSessionId='';call.callUsageId='';call.voiceLabel=voices.find(v=>v.id===selection)?.name||'ElevenLabs clone';call.elevenlabsVoiceId=selection;
    try{
      const context=(typeof buildInstructions==='function'?buildInstructions(call):'')+'\n\nAdministrator call instructions: '+String(call.instructions||'').slice(0,4500)+'\n\nIMPORTANT: You are Caller A in this real-time two-way conversation, not a customer support bot. Use the saved caller information and today’s call details quietly. Never read the instructions aloud. Only speak in '+(call.callLanguage||'English')+'. Follow the selected opening and respect caller turn-taking. Never invent facts.';
      const reply=await request('/api/elevenlabs/session',{method:'POST',body:{voiceId:selection,context,threadId:call.threadId,title:call.title,callerName:call.callerName}});
      call.callUsageId=reply.callUsageId;window.CallFocusCallUsage?.prepared?.(call);
      await setupAudio(a);live.stream=a.stream;
      const ws=new WebSocket(reply.signedUrl);a.ws=ws;
      ws.onopen=()=>{const opening=String(call.openingCustom||'').trim();const waitFirst=call.openingMode==='wait'||call.speakFirst===false;const lang=String(call.callLanguage||'English');
        // Full prompt and chosen voice. Requires Security > Overrides for Prompt/Voice/First message.
        const overrides={agent:{prompt:{prompt:context}},tts:{voice_id:reply.voiceId}};
        const firstMessage=waitFirst?'':opening||(call.openingMode==='name'?`Hey ${call.callerName||'there'}.`:(call.openingMode==='time'?`Hey ${call.callerName||'there'}, how is your day going?`:null));
        if(firstMessage!==null)overrides.agent.first_message=firstMessage;
        send(ws,{type:'conversation_initiation_client_data',conversation_config_override:overrides,dynamic_variables:{callfocus_context:context,callfocus_caller:call.callerName||'',callfocus_topic:call.topic||'',callfocus_language:lang},user_id:String(account?.id||'')});
        $('liveCaption').textContent='ElevenLabs connected. Tap Start Call when ready.';$('callMoreConnection').textContent='Connected · ElevenLabs';$('liveStatus').textContent='Connected · Ready';$('liveStartCallBtn')?.classList.remove('hidden');$('callScreen')?.classList.add('awaiting-start');
        a.stream.getAudioTracks().forEach(t=>t.enabled=false);
      };
      ws.onmessage=e=>{let event={};try{event=JSON.parse(e.data)}catch{return}
        if(event.type==='conversation_initiation_metadata'){
          const metadata=event.conversation_initiation_metadata_event||{};call.providerSessionId=metadata.conversation_id||'';
          const fmt=String(metadata.agent_output_audio_format||metadata.output_audio_format||'pcm_16000');a.outputRate=Number(fmt.match(/\d+/)?.[0])||16000;
        }
        if(event.type==='ping')send(ws,{type:'pong',event_id:event.ping_event?.event_id});
        if(event.type==='audio'){const chunk=event.audio_event?.audio_base_64;if(chunk){if(a.started)playPcm(a,chunk);else if(a.pendingAudio.length<300)a.pendingAudio.push(chunk)}}
        if(event.type==='interruption')stopPlayback(a);
        if(event.type==='user_transcript'&&a.started)updateTranscript(event.user_transcription_event?.user_transcript||'','Caller');
        if(event.type==='agent_response'&&a.started)updateTranscript(event.agent_response_event?.agent_response||'','Voice');
        if(event.type==='agent_response_correction'&&a.started)updateTranscript(event.agent_response_correction_event?.corrected_agent_response||'','Voice');
        if(event.type==='error'){const msg=event.message||event.error?.message||'ElevenLabs rejected the call configuration. Enable System prompt, Voice ID and First message overrides on the agent.';$('liveCaption').textContent=msg;notify(msg)}
      };
      ws.onclose=e=>{if(active===a&&!a.ending){$('liveStatus').textContent='Disconnected from ElevenLabs';$('liveCaption').textContent=e.reason||'Call disconnected.';end(a,true)}};
      ws.onerror=()=>{$('liveCaption').textContent='ElevenLabs connection error.'};
      configureButtons(a);
    }catch(err){$('liveStatus').textContent='Could not connect';$('liveCaption').textContent=err.message;notify(err.message);await end(a,false)}
  }
  function noteUiOutput(blob,voiceName){const old=$('cf-el-note-output');old?.remove();const target=$('cf-el-note');if(!target)return;const wrap=document.createElement('div');wrap.id='cf-el-note-output';wrap.className='cf-el-note-output';const player=document.createElement('audio');player.controls=true;player.style.width='100%';const url=URL.createObjectURL(blob);player.src=url;const title=document.createElement('div');title.textContent=`${voiceName} · ElevenLabs cloned voice note`;wrap.append(title,player);const link=document.createElement('a');link.href=url;link.download=`callfocus-cloned-voice-${Date.now()}.mp3`;link.textContent='Download voice note';link.style.display='block';link.style.marginTop='8px';wrap.append(link);target.append(wrap)}
  async function createClonedNote(e){if(!noteSelected)return;const btn=$('voiceNoteGenerateBtn');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const mode=document.querySelector('[data-vn-mode].active')?.dataset.vnMode;
    if(mode==='reply'){notify('For a cloned voice note, select Create a voice note and type the exact words. Reply drafting still uses your existing OpenAI setup.');return}
    const script=$('voiceNotePrompt')?.value.trim();if(!script)return notify('Type the words for this cloned voice note.');
    if(busy)return;busy=true;btn.disabled=true;
    const status=$('voiceNoteStatus');if(status)status.textContent='Generating voice note with ElevenLabs…';
    try{const item=await request('/api/elevenlabs/tts',{method:'POST',body:{voiceId:noteSelected,script}});const bytes=b64bytes(item.audioBase64);const blob=new Blob([bytes],{type:'audio/mpeg'});noteUiOutput(blob,item.voiceName);if(status)status.textContent=`Voice note ready · ${item.seconds} seconds charged from your CallFocus balance.`;if(item.wallet)window.CallFocusCredits?.applyAuthoritativeWallet?.(item.wallet);try{await window.CallFocusPaystack?.refreshWallet?.({quiet:true})}catch{}}
    catch(err){if(status)status.textContent=err.message;notify(err.message)}finally{busy=false;btn.disabled=false}
  }
  function install(){installModal();render();loadVoices();
    document.addEventListener('click',e=>{if(e.target.closest('[data-el-open]')){e.preventDefault();openModal()}});
    document.addEventListener('change',e=>{const selector=e.target.closest('[data-el-select]');if(!selector)return;const scope=selector.dataset.elSelect;if(scope==='new')newSelected=selector.value;if(scope==='repeat')repeatSelected=selector.value;if(scope==='note')noteSelected=selector.value});
    document.addEventListener('click',e=>{if(e.target.closest('[data-voice],[data-repeat-voice]')){if(e.target.closest('[data-voice]'))newSelected='';else repeatSelected='';setTimeout(render,0)}},true);
    $('voiceNoteGenerateBtn')?.addEventListener('click',createClonedNote,true);
    const original=window.startCall;if(typeof original==='function')window.startCall=async function(call){const picked=call?.mode==='repeat'?repeatSelected:newSelected;if(!picked)return original(call);return startElevenCall(call,picked)};
    const panel=$('threadDetailPanel');if(panel){let frame=0;new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(panel.querySelector('.cf-repeat-voice')&&!$('cf-el-repeat'))render()})}).observe(panel,{subtree:true,childList:true})}
    setInterval(()=>{if(auth()&&voices.length===0&&document.visibilityState==='visible')loadVoices()},120000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
