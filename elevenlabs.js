/* CallFocus V16.45 — reusable permanent voice cloning on the ElevenLabs-only path.
   This file does not change existing GPT-Live functions, voice selection, or routes. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const auth=()=>localStorage.getItem('callfocus_server_session_v1')||'';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=s=>{if(typeof window.toast==='function')window.toast(s);else alert(s)};
  let bookedStatus=null,homeButtonVisible=false,voices=[],capacity=null,cloningAvailability={enabled:false,message:'Voice cloning is currently unavailable. Please try again later.'},newSelected='',repeatSelected='',noteSelected='',busy=false,active=null,recorder=null,recordedBlob=null,recordStart=0,recordTimer=0,recordStream=null,tempReady=false;
  let preparedAudio=null,selectedUpload=null,fileSelectionId=0;
  async function request(path,{method='GET',body,form=false}={}){
    if(!auth())throw Error('Sign in to CallFocus before using voice cloning.');
    const r=await fetch(path,{method,headers:{Authorization:`Bearer ${auth()}`,...(body&&!form?{'Content-Type':'application/json'}:{})},body:form?body:body?JSON.stringify(body):undefined,cache:'no-store'});
    let payload={};try{payload=await r.json()}catch{}if(!r.ok||!payload.ok)throw Error(String(payload.error||`Voice service request failed (${r.status}).`).replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service'));return payload;
  }
  async function loadVoices(){
    if(!auth()){capacity=null;tempReady=false;newSelected=repeatSelected=noteSelected='';render();return}
    try{const data=await request('/api/elevenlabs/voices');voices=data.voices||[];capacity=data.capacity||null;cloningAvailability=data.availability||{enabled:false,message:'Voice cloning is temporarily unavailable.'};if(voices.length){newSelected=newSelected||'permanent';repeatSelected=repeatSelected||'permanent';noteSelected=noteSelected||'permanent';}else{newSelected=repeatSelected=noteSelected='';}}
    catch(err){console.warn('CallFocus voice availability:',err.message);cloningAvailability={enabled:false,message:'Voice cloning is temporarily unavailable. Please try again later.'};capacity={available:false,message:cloningAvailability.message}}
    render();updateCapacityUi();
  }
  function syncHomeCloneButton(){
    const existing=$('cf-el-home-btn');
    const hero=$('heroNewCallBtn');
    if(!homeButtonVisible||!hero){existing?.remove();return;}
    if(existing)return;
    const btn=document.createElement('button');
    btn.id='cf-el-home-btn';btn.className='cf-el-home';btn.type='button';
    btn.innerHTML='<span aria-hidden="true">◉</span><span>Clone your voice</span><span class="cf-clone-hot">HOT</span>';
    hero.insertAdjacentElement('afterend',btn);btn.addEventListener('click',openModal);
  }
  async function refreshHomeCloneButton(){
    try{
      const r=await fetch('/api/voice-cloning-availability',{method:'GET',cache:'no-store',credentials:'same-origin'});
      if(!r.ok)throw Error('Cloning availability unavailable');
      const data=await r.json();
      homeButtonVisible=data.homeButtonVisible===true;
    }catch{homeButtonVisible=false;}
    syncHomeCloneButton();
  }
  function choices(selected){return `<option value="">Use normal Male / Female voice</option>${voices.length?`<option value="permanent" ${selected==='permanent'?'selected':''}>My saved permanent voice · cloned rate</option>`:''}`}
  function voicePanel(scope){const selected=scope==='new'?newSelected:scope==='repeat'?repeatSelected:noteSelected;return `<div class="cf-el-box" id="cf-el-${scope}"><h3>Use your own saved voice</h3><p>Book one slot, create your own consent-verified voice once, then reuse it for future ${scope==='note'?'voice notes':'cloned calls'}.</p><button class="cf-el-action" type="button" data-el-open>${voices.length?'View my saved voice':'Book slot / create voice'}</button><label style="margin-top:17px" for="cf-el-select-${scope}">Voice selection</label><select id="cf-el-select-${scope}" data-el-select="${scope}">${choices(selected)}</select><small class="cf-el-muted">Your original normal voice options remain independent and unchanged.</small></div>`}
  function render(){
    const field=$('newCallVoiceGender')?.closest('.field-section')?.querySelector('.field-content');
    if(field){let host=$('cf-el-new');if(!host){host=document.createElement('div');host.id='cf-el-new';const aiPicker=$('newCallAiVoicePicker');const opening=field.querySelector('.call-opening-box');field.insertBefore(host,aiPicker||opening||null)}host.outerHTML=voicePanel('new')}
    const repeat=$('threadDetailPanel')?.querySelector('.cf-repeat-voice');
    if(repeat){let host=$('cf-el-repeat');if(!host){host=document.createElement('div');host.id='cf-el-repeat';repeat.insertAdjacentElement('afterend',host)}host.outerHTML=voicePanel('repeat')}
    const voiceRow=$('voiceNotePrompt')?.closest('.voice-note-composer')?.querySelector('.voice-note-gender-row');
    if(voiceRow){let host=$('cf-el-note');if(!host){host=document.createElement('div');host.id='cf-el-note';voiceRow.insertAdjacentElement('afterend',host)}host.outerHTML=voicePanel('note')}
    syncHomeCloneButton();
    updateCapacityUi();fitModal();
  }
  function installModal(){
    if($('cf-el-layer'))return;
    const div=document.createElement('div');div.className='cf-el-layer';div.id='cf-el-layer';
    div.innerHTML=`<div class="cf-el-modal" role="dialog" aria-modal="true" aria-labelledby="cf-el-title">
      <button type="button" class="cf-el-close" id="cf-el-close" aria-label="Close">×</button>
      <small class="cf-el-eyebrow">YOUR PERSONAL VOICE</small>
      <h2 id="cf-el-title">Create your permanent voice</h2>
      <p class="cf-el-intro">Record or upload 30–120 seconds of your own clear speech. Your verified voice is saved to your CallFocus account for future cloned calls and voice notes.</p>
      <div class="cf-el-status" id="cf-el-status" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="cf-el-capacity" id="cf-el-capacity" role="status" aria-live="polite" hidden></div>
      <label class="cf-el-label" for="cf-el-name">Voice name</label>
      <input type="text" id="cf-el-name" maxlength="65" placeholder="My own voice" />
      <div class="cf-el-row cf-el-record-row"><button type="button" class="cf-el-action" id="cf-el-record">Record sample</button><span id="cf-el-record-info">Not recording</span></div>
      <label class="cf-el-label" for="cf-el-file">Or upload your own recording</label>
      <label for="cf-el-file" class="cf-el-file-picker"><span>Choose file</span><span id="cf-el-file-summary">No file selected</span></label>
      <input id="cf-el-file" class="cf-el-file-input" type="file" accept="audio/*,video/mp4,video/quicktime,.m4a,.mp3,.mp4,.webm,.wav,.ogg,.flac,.aac,.opus,.3gp,.amr,.caf,.aiff,.wma,.mov" />
      <div id="cf-el-convert-tools" class="cf-el-convert-tools" hidden>
        <button type="button" class="cf-el-convert-btn" id="cf-el-convert">Convert to WAV</button>
        <span class="cf-el-convert-hint" id="cf-el-convert-hint">Convert compatible audio on your device.</span>
        <progress id="cf-el-convert-progress" max="100" value="0" hidden aria-label="Audio conversion progress"></progress>
      </div>
      <label class="cf-el-consent"><input id="cf-el-consent" type="checkbox"/><span>This is my own adult voice. I consent to its AI cloning and understand that generated speech must not be presented as a real recording of me.</span></label>
      <p class="cf-el-disclosure">Your sample is processed once to create a private saved voice in the connected ElevenLabs account. Future cloned calls and voice notes reuse that same saved voice.</p>
      <button class="cf-el-save" id="cf-el-save" type="button">Save my permanent voice</button>
      <p class="cf-el-once-note">One voice per booked customer. Saving permanently occupies one provider custom-voice slot. Your voice is never deleted automatically after a call.</p>
    </div>`;
    document.body.append(div);
    $('cf-el-close').onclick=closeModal;
    div.addEventListener('click',e=>{if(e.target===div)closeModal()});
    $('cf-el-record').onclick=toggleRecording;$('cf-el-save').onclick=saveVoice;
    $('cf-el-file').addEventListener('change',onUploadSelected);
    $('cf-el-convert').addEventListener('click',convertSelectedAudio);
    window.addEventListener('resize',fitModal,{passive:true});
    window.visualViewport?.addEventListener('resize',fitModal,{passive:true});
  }
  let fitting=false;
  function fitModal(){
    if(fitting||!$('cf-el-layer')?.classList.contains('open'))return;
    fitting=true;
    requestAnimationFrame(()=>{
      const modal=$('cf-el-layer')?.querySelector('.cf-el-modal');
      if(!modal){fitting=false;return}
      // Preserve the reference's near-full-screen height at normal iPhone sizes.
      // Compact only when the actual controls require more height than available.
      modal.style.zoom='1';
      const v=Math.max(260,window.visualViewport?.height||window.innerHeight);
      const available=Math.max(240,v-24);
      const required=Math.max(modal.scrollHeight,modal.offsetHeight);
      if(!modal.classList.contains('cf-el-expanded')&&required>available+1){
        modal.style.zoom=String(Math.max(0.62,Math.min(1,(available-2)/required)));
      }
      fitting=false;
    });
  }
  async function openModal(){
    try{bookedStatus=await window.CallFocusPermanentSlots?.load()}catch{bookedStatus=null}
    if(!bookedStatus?.me){return window.CallFocusPermanentSlots?.show(true)}
    installModal();cloningAvailability={enabled:false,message:'Checking availability…'};capacity={available:false,message:'Checking availability…'};
    $('cf-el-layer').classList.add('open');document.body.classList.add('cf-el-is-open');updateCapacityUi();fitModal();
    if(!auth()){
      try{
        const r=await fetch('/api/voice-cloning-availability',{cache:'no-store'}),data=await r.json();
        if(data.enabled){closeModal();return notify('Sign in to CallFocus first to use voice cloning.')}
        cloningAvailability={enabled:false,message:data.message||'Voice cloning is currently unavailable.'};
      }catch{cloningAvailability={enabled:false,message:'Voice cloning is currently unavailable. Please try again later.'}}
      updateCapacityUi();fitModal();return;
    }
    render();await loadVoices();fitModal();
  }
  function updateCapacityUi(){
    const paused=cloningAvailability.enabled!==true;
    const saved=voices.length>0;
    const untilDate=bookedStatus?.eventDate&&new Date().toISOString().slice(0,10)<bookedStatus.eventDate;
    const full=paused||saved||!bookedStatus?.me||untilDate;
    const blockedMessage=paused?(cloningAvailability.message||'Voice cloning is temporarily unavailable.'):saved?'Your permanent voice is saved. Select it in cloned calling or voice notes. No new recording is necessary.':untilDate?`Your slot is booked. Voice creation opens on ${bookedStatus.eventDate}.`:'Book a permanent voice slot before recording.';
    const block=$('cf-el-capacity');if(block){block.hidden=!full;block.textContent=full?blockedMessage:''}
    const modal=$('cf-el-layer')?.querySelector('.cf-el-modal');
    modal?.classList.toggle('cf-el-full',full);modal?.classList.toggle('cf-el-paused',paused);
    if($('cf-el-title'))$('cf-el-title').textContent=paused?'Voice cloning unavailable':saved?'Permanent voice saved':'Create your permanent voice';
    const record=$('cf-el-record'),save=$('cf-el-save'),file=$('cf-el-file');
    if(record)record.disabled=full;
    if(save)save.disabled=full||busy;
    if(file)file.disabled=full||busy;
    if($('cf-el-convert'))$('cf-el-convert').disabled=full||busy;
    const picker=$('cf-el-layer')?.querySelector('.cf-el-file-picker');if(picker)picker.classList.toggle('cf-el-file-picker-disabled',full);
    fitModal();
  }
  function clearSample(){
    tempReady=false;newSelected=repeatSelected=noteSelected='';selectedUpload=null;preparedAudio=null;recordedBlob=null;fileSelectionId++;
    if($('cf-el-file'))$('cf-el-file').value='';if($('cf-el-file-summary'))$('cf-el-file-summary').textContent='No file selected';
    if($('cf-el-consent'))$('cf-el-consent').checked=false;
    setConvertTools(false);render();
  }
  function currentSample(){return selectedUpload?preparedAudio:recordedBlob}
  function sampleForm(){
    const audio=currentSample(),name=$('cf-el-name')?.value.trim()||'My voice';
    if(!tempReady||!audio||!$('cf-el-consent')?.checked)throw Error('Prepare your own voice sample again before starting.');
    const extension=(audio.type||'').includes('wav')?'wav':(audio.type||'').includes('mp4')?'m4a':(audio.type||'').includes('webm')?'webm':'mp3';
    const form=new FormData();form.set('name',name);form.set('consent','yes');form.set('audio',audio,audio.name||`one-time-voice.${extension}`);return form;
  }
  async function releaseTemp(leaseId){if(!leaseId)return;try{await request('/api/elevenlabs/release',{method:'POST',body:{leaseId}})}catch(err){console.warn('Temporary voice provider cleanup deferred:',err.message)}}
  function closeModal(){if(recorder?.state==='recording')recorder.stop();$('cf-el-layer')?.classList.remove('open');document.body.classList.remove('cf-el-is-open')}
  function setConvertTools(visible,hint='',pct=null){
    const row=$('cf-el-convert-tools');if(!row)return;
    row.hidden=!visible;
    if($('cf-el-convert-hint'))$('cf-el-convert-hint').textContent=hint;
    const bar=$('cf-el-convert-progress');if(bar){bar.hidden=pct==null;bar.value=pct||0}
    fitModal();
  }
  async function onUploadSelected(){
    const id=++fileSelectionId;
    const file=$('cf-el-file')?.files?.[0]||null;
    selectedUpload=file;preparedAudio=null;tempReady=false;newSelected=repeatSelected=noteSelected='';render();
    if(!file){$('cf-el-file-summary').textContent='No file selected';setConvertTools(false);status(recordedBlob?'Recorded sample ready.':'');return}
    $('cf-el-file-summary').textContent=file.name||'Selected recording';
    if(!window.CallFocusAudioConvert){setConvertTools(false);return audioRejected('Audio conversion is unavailable. Reload this page and try again.')}
    if(file.size>40*1024*1024){setConvertTools(false);return audioRejected('This file is too large to process on your phone.')}
    status('Checking your recording…');
    try{
      const result=await window.CallFocusAudioConvert.prepare(file);
      if(id!==fileSelectionId)return;
      if(result&&result.file.size<=16*1024*1024){
        preparedAudio=result.file;
        status(`Recording recognized as ${result.format}. Ready to save or convert to WAV.`);
        setConvertTools(true,'Optional: convert to WAV for compatibility.');
      }else{
        status(result?'The original file is over the upload limit. Try converting to WAV.':'This recording needs conversion before uploading.');
        setConvertTools(true,'Tap Convert to WAV to prepare the recording.');
      }
    }catch(err){if(id!==fileSelectionId)return;status('Could not identify the recording. Try Convert to WAV.');setConvertTools(true,'Tap Convert to WAV to prepare the recording.');}
    updateCapacityUi();
  }
  async function convertSelectedAudio(){
    const file=selectedUpload;if(!file||busy)return status('Choose an audio recording first.');
    if(!window.CallFocusAudioConvert)return audioRejected('Audio conversion is unavailable. Reload and try again.');
    const id=fileSelectionId;
    busy=true;updateCapacityUi();
    const button=$('cf-el-convert');if(button)button.disabled=true;
    try{
      setConvertTools(true,'Preparing audio…',0);
      const result=await window.CallFocusAudioConvert.convert(file,(pct,info)=>{
        if(id!==fileSelectionId)return;
        setConvertTools(true,`${info} ${pct}%`,pct);
      });
      if(id!==fileSelectionId)return;
      preparedAudio=result;
      $('cf-el-file-summary').textContent=`Converted to WAV · ${(result.size/1024/1024).toFixed(1)} MB`;
      setConvertTools(true,'Converted successfully. Tap Save my voice.',null);
      status('Converted to WAV. Your recording is ready to save.');
    }catch(err){if(id!==fileSelectionId)return;preparedAudio=null;setConvertTools(true,'Try a different recording or Record sample.',null);audioRejected(err.message||'This recording could not be converted.');}
    finally{busy=false;if(button)button.disabled=false;updateCapacityUi()}
  }
  const AUDIO_HELP='Accepted file types: MP3, M4A/MP4, WEBM, WAV, OGG, AAC and FLAC.';
  function audioRejected(message){
    status(message+' '+AUDIO_HELP);
    const box=document.createElement('div');box.className='cf-el-file-alert';box.setAttribute('role','alert');box.textContent=message+' '+AUDIO_HELP;document.body.appendChild(box);setTimeout(()=>box.remove(),7000);
  }
  function status(text){const el=$('cf-el-status');if(el){el.textContent=String(text||'');el.classList.toggle('cf-el-status-active',!!text);el.classList.toggle('cf-el-status-error',/invalid|not supported|rejected|unsupported|file type|format/i.test(String(text||'')))}fitModal()}
  async function toggleRecording(){
    if(capacity?.available===false)return status(capacity.message);
    if(recorder?.state==='recording'){recorder.stop();return}
    if(!navigator.mediaDevices?.getUserMedia)return status('Microphone recording is not supported in this browser. Upload an audio file instead.');
    try{
      tempReady=false;newSelected=repeatSelected=noteSelected='';recordedBlob=null;selectedUpload=null;preparedAudio=null;fileSelectionId++;if($('cf-el-file'))$('cf-el-file').value='';if($('cf-el-file-summary'))$('cf-el-file-summary').textContent='No file selected';setConvertTools(false);recordStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];let mime=types.find(t=>MediaRecorder.isTypeSupported?.(t));recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);const chunks=[];
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=()=>{recordedBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});recordStream?.getTracks().forEach(t=>t.stop());clearInterval(recordTimer);$('cf-el-record').textContent='Record again';$('cf-el-record-info').textContent=`Recorded ${Math.round((Date.now()-recordStart)/1000)} seconds · ${Math.round(recordedBlob.size/1024)} KB`;fitModal();status('Recording ready. Enter a name and save your voice.')};
      recorder.start(500);recordStart=Date.now();$('cf-el-record').textContent='Stop recording';recordTimer=setInterval(()=>{const s=Math.floor((Date.now()-recordStart)/1000);$('cf-el-record-info').textContent=`Recording ${s} seconds`;if(s>=120)recorder.stop()},1000);status('Speak clearly in your normal voice.');
    }catch(err){status('Microphone unavailable: '+err.message)}
  }
  async function saveVoice(){
    if(busy)return;if(!bookedStatus?.me)return window.CallFocusPermanentSlots?.show(true);
    if(bookedStatus.me.hasSavedVoice)return status('Your permanent voice is already saved.');
    if(cloningAvailability.enabled!==true)return status(cloningAvailability.message||'Voice cloning is paused.');
    const name=$('cf-el-name')?.value.trim(),audio=currentSample();
    if(!name)return status('Give this voice a name.');
    if(selectedUpload&&!preparedAudio)return status('Prepare the selected audio before continuing.');
    if(!audio)return status('Record or upload your own voice first.');
    if(audio.size>16*1024*1024)return status('The audio must be under 16 MB.');
    if(!$('cf-el-consent')?.checked)return status('Confirm that you own the voice and consent to cloning.');
    if(recordedBlob===audio&&(Date.now()-recordStart)/1000<10)return status('Record at least 10 seconds.');
    busy=true;updateCapacityUi();status('Saving your permanent voice. Please do not close this page…');
    try{
      const form=new FormData();form.set('name',name);form.set('consent','yes');form.set('adult','yes');form.set('audio',audio,audio.name||'own-voice.webm');
      const result=await request('/api/permanent-slots/create',{method:'POST',body:form,form:true});
      status(result.message||'Voice saved.');
      if(result.hasSavedVoice){bookedStatus=await window.CallFocusPermanentSlots?.load();await loadVoices();newSelected=repeatSelected=noteSelected='permanent';render();closeModal();notify('Your permanent voice is saved and ready to reuse.');}
      else notify(result.message||'Voice verification is pending.');
    }catch(e){status(e.message);notify(e.message)}finally{busy=false;updateCapacityUi()}
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
    if(a.heartbeat)clearInterval(a.heartbeat);if(active===a)active=null;try{await cleanupCall(save)}catch(err){console.warn('CallFocus cloned-call cleanup:',err)}finally{if(a.leaseId)await releaseTemp(a.leaseId)}
  }
  function configureButtons(a){
    // Override click handlers only while an ElevenLabs call is active; original OpenAI handlers remain intact.
    const on=(id,fn)=>{const button=$(id);if(!button)return;button.addEventListener('click',e=>{if(active!==a)return;e.preventDefault();e.stopImmediatePropagation();fn()},true)};
    on('liveStartCallBtn',()=>{a.started=true;live.started=true;live.connected=true;a.stream?.getAudioTracks().forEach(t=>t.enabled=true);$('liveStartCallBtn')?.classList.add('hidden');$('callScreen')?.classList.remove('awaiting-start');$('liveStatus').textContent='Connected';$('liveCaption').textContent='Call live. Listening.';startTimer();for(const audio of a.pendingAudio.splice(0))playPcm(a,audio)});
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
    if(selection!=='permanent'||!voices.length)return notify('Book a slot and save your permanent voice first.');
    const a={call,started:false,ending:false,muted:false,held:false,speakerOn:true,nextPlay:0,sources:new Set(),pendingAudio:[],ws:null,stream:null,leaseId:''};
    active=a;closeModal('');try{window.closeModal?.('newCallModal')}catch{}$('newCallModal')?.classList.add('hidden');
    $('callScreen')?.classList.remove('hidden');document.body.style.overflow='hidden';$('liveCallerName').textContent=call.callerName||'Call';$('liveAvatar').textContent=(call.callerName||'C').slice(0,1).toUpperCase();$('liveRegion').textContent=[call.callerB?.region,call.callerB?.timezone].filter(Boolean).join(' · ');$('liveStatus').textContent='Connecting your call…';$('liveTranscript').textContent='';$('liveCaption').textContent='Preparing secure connection…';$('callTimer').textContent='00:00';$('callMoreTitle').textContent=call.title||call.callerName;$('callMoreTopic').textContent=call.topic||'';$('callMoreConnection').textContent='Connecting';$('callMorePanel')?.classList.add('hidden');$('liveStartCallBtn')?.classList.add('hidden');
    live.current=call;live.started=false;live.connected=false;live.stream=null;live.dc=null;live.pc=null;live.audio=null;live.seconds=0;live.creditSecondsUsed=0;call.engine='elevenlabs-agent';call.providerSessionId='';call.callUsageId='';call.voiceLabel=voices[0]?.name||'My permanent voice';call.elevenlabsVoiceId=voices[0]?.voiceId||'';
    try{
      const context=(typeof buildInstructions==='function'?buildInstructions(call):'')+'\n\nAdministrator call instructions: '+String(call.instructions||'').slice(0,4500)+'\n\nIMPORTANT: You are Caller A in this real-time two-way conversation, not a customer support bot. Use the saved caller information and today’s call details quietly. Never read the instructions aloud. Only speak in '+(call.callLanguage||'English')+'. Follow the selected opening and respect caller turn-taking. Never invent facts.';
      const form=new FormData();form.set('mode','permanent');form.set('context',context);form.set('threadId',call.threadId||'');form.set('title',call.title||'');form.set('callerName',call.callerName||'');
      const reply=await request('/api/elevenlabs/session',{method:'POST',body:form,form:true});a.leaseId=reply.leaseId;
      call.callUsageId=reply.callUsageId;window.CallFocusCallUsage?.prepared?.(call);
      await setupAudio(a);live.stream=a.stream;
      const ws=new WebSocket(reply.signedUrl);a.ws=ws;
      a.heartbeat=setInterval(()=>{if(active===a&&!a.ending&&a.leaseId)request('/api/elevenlabs/heartbeat',{method:'POST',body:{leaseId:a.leaseId}}).catch(()=>{})},60000);
      ws.onopen=()=>{const opening=String(call.openingCustom||'').trim();const waitFirst=call.openingMode==='wait'||call.speakFirst===false;const lang=String(call.callLanguage||'English');
        // Full prompt and chosen voice. Requires Security > Overrides for Prompt/Voice/First message.
        const overrides={agent:{prompt:{prompt:context}},tts:{voice_id:reply.voiceId}};
        const firstMessage=waitFirst?'':opening||(call.openingMode==='name'?`Hey ${call.callerName||'there'}.`:(call.openingMode==='time'?`Hey ${call.callerName||'there'}, how is your day going?`:null));
        if(firstMessage!==null)overrides.agent.first_message=firstMessage;
        send(ws,{type:'conversation_initiation_client_data',conversation_config_override:overrides,dynamic_variables:{callfocus_context:context,callfocus_caller:call.callerName||'',callfocus_topic:call.topic||'',callfocus_language:lang},user_id:String(account?.id||'')});
        $('liveCaption').textContent='Connected. Tap Start Call when ready.';$('callMoreConnection').textContent='Connected';$('liveStatus').textContent='Connected · Ready';$('liveStartCallBtn')?.classList.remove('hidden');$('callScreen')?.classList.add('awaiting-start');
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
        if(event.type==='error'){const msg=String(event.message||event.error?.message||'Could not start this voice. Please contact support if this continues.').replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service');$('liveCaption').textContent=msg;notify(msg)}
      };
      ws.onclose=e=>{if(active===a&&!a.ending){$('liveStatus').textContent='Call disconnected';$('liveCaption').textContent=String(e.reason||'Call disconnected.').replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service');end(a,true)}};
      ws.onerror=()=>{$('liveCaption').textContent='Call connection error.'};
      configureButtons(a);
    }catch(err){$('liveStatus').textContent='Could not connect';$('liveCaption').textContent=err.message;notify(err.message);await end(a,false)}
  }
  function noteUiOutput(blob,voiceName){const old=$('cf-el-note-output');old?.remove();const target=$('cf-el-note');if(!target)return;const wrap=document.createElement('div');wrap.id='cf-el-note-output';wrap.className='cf-el-note-output';const player=document.createElement('audio');player.controls=true;player.style.width='100%';const url=URL.createObjectURL(blob);player.src=url;const title=document.createElement('div');title.textContent=`${voiceName} · cloned voice note`;wrap.append(title,player);const link=document.createElement('a');link.href=url;link.download=`callfocus-cloned-voice-${Date.now()}.mp3`;link.textContent='Download voice note';link.style.display='block';link.style.marginTop='8px';wrap.append(link);target.insertAdjacentElement('afterend',wrap)}
  async function createClonedNote(e){
    if(noteSelected!=='permanent')return;const btn=$('voiceNoteGenerateBtn');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const mode=document.querySelector('[data-vn-mode].active')?.dataset.vnMode;
    if(mode==='reply'){notify('Use Create a voice note for your saved cloned voice.');return}
    const script=$('voiceNotePrompt')?.value.trim();if(!script)return notify('Type the words for this cloned voice note.');
    if(busy)return;busy=true;btn.disabled=true;const ui=$('voiceNoteStatus');if(ui)ui.textContent='Generating speech with your saved voice…';
    try{const form=new FormData();form.set('mode','permanent');form.set('script',script);
      const result=await request('/api/elevenlabs/tts',{method:'POST',body:form,form:true});
      const bytes=b64bytes(result.audioBase64),blob=new Blob([bytes],{type:'audio/mpeg'});noteUiOutput(blob,result.voiceName);
      if(ui)ui.textContent=`Voice note ready · ${result.seconds} seconds charged. Your permanent voice remains saved.`;
      if(result.wallet)window.CallFocusCredits?.applyAuthoritativeWallet?.(result.wallet);try{await window.CallFocusPaystack?.refreshWallet?.({quiet:true})}catch{}
    }catch(err){if(ui)ui.textContent=err.message;notify(err.message)}finally{busy=false;btn.disabled=false}
  }
  function install(){installModal();render();loadVoices();refreshHomeCloneButton();
    document.addEventListener('click',e=>{if(e.target.closest('[data-el-open]')){e.preventDefault();openModal()}});
    document.addEventListener('change',e=>{const selector=e.target.closest('[data-el-select]');if(!selector)return;const scope=selector.dataset.elSelect;if(scope==='new')newSelected=selector.value;if(scope==='repeat')repeatSelected=selector.value;if(scope==='note')noteSelected=selector.value});
    document.addEventListener('click',e=>{if(e.target.closest('[data-voice],[data-repeat-voice]')){if(e.target.closest('[data-voice]'))newSelected='';else repeatSelected='';setTimeout(render,0)}},true);
    $('voiceNoteGenerateBtn')?.addEventListener('click',createClonedNote,true);
    const original=window.startCall;if(typeof original==='function')window.startCall=async function(call){const picked=call?.mode==='repeat'?repeatSelected:newSelected;if(!picked)return original(call);return startElevenCall(call,picked)};
    const panel=$('threadDetailPanel');if(panel){let frame=0;new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(panel.querySelector('.cf-repeat-voice')&&!$('cf-el-repeat'))render()})}).observe(panel,{subtree:true,childList:true})}
    setInterval(()=>{if(document.visibilityState==='visible')refreshHomeCloneButton();if(auth()&&document.visibilityState==='visible')loadVoices()},180000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshHomeCloneButton()});
    window.addEventListener('pageshow',refreshHomeCloneButton);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
