/* CallFocus V10.9 — Voice Note Studio */
(() => {
  let vnGender = 'male';
  let latestVoiceNoteId = null;
  let playback = { audio:null, url:null, id:null, button:null };
  let dbPromise = null;

  function ensureVoiceNoteData(){
    if(!account || !data) return;
    if(!Array.isArray(data.voiceNotes)) data.voiceNotes = [];
  }

  function openVoiceDb(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open('callfocus_voice_notes_v1', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function saveVoiceBlob(id, blob){
    const db = await openVoiceDb();
    const key = `${account?.id || 'guest'}:${id}`;
    await new Promise((resolve,reject)=>{
      const tx = db.transaction('audio','readwrite');
      tx.objectStore('audio').put(blob,key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getVoiceBlob(id){
    const db = await openVoiceDb();
    const key = `${account?.id || 'guest'}:${id}`;
    return new Promise((resolve,reject)=>{
      const tx = db.transaction('audio','readonly');
      const req = tx.objectStore('audio').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function formatDurationSeconds(seconds){
    const s = Math.max(0,Math.round(Number(seconds)||0));
    const m = Math.floor(s/60), r=s%60;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }

  function voiceDate(iso){
    try { return new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}); }
    catch { return ''; }
  }

  function trimPrompt(text, max=180){
    const v=String(text||'').replace(/\s+/g,' ').trim();
    return v.length>max ? `${v.slice(0,max-1)}…` : v;
  }

  function resetPlaybackButton(btn){
    if(!btn) return;
    btn.classList.remove('is-playing');
    const label=btn.querySelector('span:last-child');
    if(label) label.textContent='Play voice note';
  }

  function stopPlayback(){
    if(playback.audio){ try{ playback.audio.pause(); }catch{} }
    resetPlaybackButton(playback.button);
    if(playback.url){ try{ URL.revokeObjectURL(playback.url); }catch{} }
    playback={audio:null,url:null,id:null,button:null};
  }

  async function playVoiceNote(id, btn){
    if(playback.id===id && playback.audio){
      if(playback.audio.paused){
        await playback.audio.play();
        btn.classList.add('is-playing');
        const l=btn.querySelector('span:last-child'); if(l)l.textContent='Pause voice note';
      }else{
        playback.audio.pause(); resetPlaybackButton(btn);
      }
      return;
    }
    stopPlayback();
    let blob=null;
    try{ blob=await getVoiceBlob(id); }catch{}
    if(!blob){ toast('This voice note audio is no longer stored on this device'); return; }
    const url=URL.createObjectURL(blob);
    const audio=new Audio(url);
    playback={audio,url,id,button:btn};
    audio.onended=()=>stopPlayback();
    audio.onerror=()=>{stopPlayback();toast('Could not play this voice note');};
    try{
      await audio.play();
      btn.classList.add('is-playing');
      const l=btn.querySelector('span:last-child'); if(l)l.textContent='Pause voice note';
    }catch{ stopPlayback(); toast('Tap play again to start the audio'); }
  }

  function audioDuration(blob){
    return new Promise(resolve=>{
      const url=URL.createObjectURL(blob), audio=new Audio();
      let done=false;
      const finish=(value)=>{ if(done)return;done=true;try{URL.revokeObjectURL(url)}catch{};resolve(Number.isFinite(value)?value:0); };
      audio.preload='metadata';
      audio.onloadedmetadata=()=>finish(audio.duration);
      audio.onerror=()=>finish(0);
      setTimeout(()=>finish(0),3500);
      audio.src=url;
    });
  }

  function syncVoiceLabels(){
    const admin=loadAdmin();
    if($('voiceNoteMaleLabel')) $('voiceNoteMaleLabel').textContent=admin.maleVoice || 'cedar';
    if($('voiceNoteFemaleLabel')) $('voiceNoteFemaleLabel').textContent=admin.femaleVoice || 'marin';
  }

  function renderVoiceNoteResult(note){
    const box=$('voiceNoteResult'); if(!box)return;
    if(!note){ box.classList.add('hidden'); $('voiceNoteEmptyState')?.classList.remove('hidden'); return; }
    latestVoiceNoteId=note.id;
    $('voiceNoteEmptyState')?.classList.add('hidden');
    box.classList.remove('hidden');
    $('voiceNoteResultScript').textContent=note.script || '';
    $('voiceNoteResultMeta').textContent=`${note.voiceGender==='female'?'Female':'Male'} · ${note.voiceName || ''} · ${formatDurationSeconds(note.duration)}${Number.isFinite(Number(note.creditsUsed))?' · '+note.creditsUsed+' credits':''}`;
    const play=$('voiceNoteResultPlay');
    play.disabled=false; play.dataset.voiceNotePlay=note.id; resetPlaybackButton(play);
  }

  function voiceHistoryItem(note,index){
    return `<article class="voice-note-history-item">
      <div class="voice-note-history-top">
        <div><strong>Voice note ${String(index+1).padStart(2,'0')}</strong><small>${esc(voiceDate(note.createdAt))} · ${esc(note.voiceGender==='female'?'Female':'Male')} · ${esc(note.voiceName||'')}${Number.isFinite(Number(note.creditsUsed))?' · '+esc(String(note.creditsUsed))+' credits':''}</small></div>
        <span class="voice-note-duration">${esc(formatDurationSeconds(note.duration))}</span>
      </div>
      <p class="voice-note-history-prompt">${esc(trimPrompt(note.prompt))}</p>
      <div class="voice-note-history-actions">
        <button class="voice-note-play" type="button" data-voice-note-play="${esc(note.id)}"><span class="voice-note-play-icon">▶</span><span>Play voice note</span></button>
        <button class="voice-note-script-toggle" type="button" data-voice-note-script="${esc(note.id)}">View generated words</button>
      </div>
      <div class="voice-note-history-script" id="voice-note-script-${esc(note.id)}">${esc(note.script||'')}</div>
    </article>`;
  }

  function renderVoiceNoteHistory(){
    const root=$('voiceNoteHistory'); if(!root)return;
    if(!account||!data){ root.innerHTML='<div class="voice-note-empty-history">Sign in to save and revisit generated voice notes.</div>'; return; }
    ensureVoiceNoteData();
    const notes=[...data.voiceNotes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    root.innerHTML=notes.length ? notes.map(voiceHistoryItem).join('') : '<div class="voice-note-empty-history">Your generated voice notes will appear here, newest first.</div>';
  }

  function renderVoiceNotes(){
    ensureVoiceNoteData(); syncVoiceLabels(); renderVoiceNoteHistory();
    try{ window.CallFocusCredits?.render(); }catch{}
    if(latestVoiceNoteId){
      const note=data?.voiceNotes?.find(n=>n.id===latestVoiceNoteId); if(note)renderVoiceNoteResult(note);
    }
  }

  async function generateVoiceNote(){
    if(!account || !data){ requireAccount({type:'route',route:'voice-notes'},'Create an account or sign in to generate and save voice notes.'); return; }
    const prompt=$('voiceNotePrompt').value.trim();
    if(!prompt){ toast('Type what you want the voice note to say'); $('voiceNotePrompt').focus(); return; }
    const creditsApi=window.CallFocusCredits;
    if(creditsApi && creditsApi.currentBalanceSeconds() < 5){
      toast('Not enough credit to generate a voice note. Buy credits first.');
      try{ showView('credits'); }catch{}
      return;
    }
    const btn=$('voiceNoteGenerateBtn'), status=$('voiceNoteStatus');
    btn.disabled=true; btn.querySelector('span:last-child').textContent='Generating…';
    status.className='voice-note-status'; status.textContent='Preparing the wording and generating the voice note…';
    try{
      await refreshPublicConfig(); syncVoiceLabels();
      const res=await fetch('/api/voice-note',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt,voiceGender:vnGender,userId:account.id,maxSeconds:window.CallFocusCredits?.currentBalanceSeconds?.()||0})
      });
      if(!res.ok){
        let msg='Could not generate the voice note right now. Please try again.';
        try{ const j=await res.json(); if(j?.error)msg=j.error; }catch{}
        throw new Error(msg);
      }
      const blob=await res.blob();
      const script=decodeURIComponent(res.headers.get('X-CallFocus-Script')||'');
      const voiceName=res.headers.get('X-CallFocus-Voice') || (vnGender==='female'?loadAdmin().femaleVoice:loadAdmin().maleVoice);
      const duration=await audioDuration(blob);
      const billableSeconds=Math.max(1,Math.ceil(Number(duration)||1));
      const noteId=uuid();
      let creditResult=null;
      if(window.CallFocusCredits){
        creditResult=window.CallFocusCredits.deductUsageSeconds(billableSeconds,{type:'voice_note',referenceId:noteId});
        if(!creditResult?.ok){
          // The note was already generated by the API, so deduct the remaining balance rather than creating negative credit.
          // Do not allow another generation until the wallet is topped up.
          status.className='voice-note-status error';
          status.textContent='Voice note generated, but your remaining credit was exhausted. Top up before creating another one.';
        }
      }
      const creditsUsed=window.CallFocusCredits ? Math.round(window.CallFocusCredits.creditsForSeconds(creditResult?.deductedSeconds ?? billableSeconds)*10)/10 : null;
      const note={id:noteId,prompt,script,voiceGender:vnGender,voiceName,duration,creditsUsed,creditSecondsUsed:creditResult?.deductedSeconds ?? billableSeconds,createdAt:new Date().toISOString()};
      ensureVoiceNoteData(); data.voiceNotes.unshift(note); data.voiceNotes=data.voiceNotes.slice(0,60);
      await saveVoiceBlob(note.id,blob);
      saveData(); latestVoiceNoteId=note.id; renderVoiceNoteResult(note); renderVoiceNoteHistory();
      if(window.CallFocusCredits) window.CallFocusCredits.render();
      if(!status.classList.contains('error')){
        status.className='voice-note-status success'; status.textContent=`Voice note ready · ${creditsUsed ?? ''}${creditsUsed!=null?' credits used · ':''}Tap Play voice note to listen.`;
      }
      requestAnimationFrame(()=>$('voiceNoteResult')?.scrollIntoView({behavior:'smooth',block:'center'}));
    }catch(err){
      status.className='voice-note-status error'; status.textContent=err?.message || 'Could not generate the voice note right now.';
    }finally{
      btn.disabled=false; btn.querySelector('span:last-child').textContent='Generate';
    }
  }

  // Make Voice Notes an account-backed workspace view.
  const originalShowView = showView;
  showView = function(view,scroll=true){
    if(view==='voice-notes' && !account){
      requireAccount({type:'route',route:'voice-notes'},'Create an account or sign in to generate voice notes and keep your voice-note history.');
      return;
    }
    originalShowView(view,scroll);
    if(view==='voice-notes') renderVoiceNotes();
  };

  // Replace the former "See how it works" hero action.
  if($('heroHowBtn')) $('heroHowBtn').onclick=()=>showView('voice-notes');
  if($('voiceNotesBackBtn')) $('voiceNotesBackBtn').onclick=()=>showView('home');

  qsa('[data-vn-gender]').forEach(btn=>btn.addEventListener('click',()=>{
    vnGender=btn.dataset.vnGender==='female'?'female':'male';
    qsa('[data-vn-gender]').forEach(b=>b.classList.toggle('active',b===btn));
  }));

  $('voiceNotePrompt')?.addEventListener('input',()=>{ $('voiceNoteCharCount').textContent=String($('voiceNotePrompt').value.length); });
  $('voiceNoteGenerateBtn')?.addEventListener('click',generateVoiceNote);

  document.addEventListener('click',e=>{
    const play=e.target.closest('[data-voice-note-play]');
    if(play){ playVoiceNote(play.dataset.voiceNotePlay,play); return; }
    const toggle=e.target.closest('[data-voice-note-script]');
    if(toggle){
      const target=$(`voice-note-script-${toggle.dataset.voiceNoteScript}`); if(!target)return;
      const open=target.classList.toggle('open'); toggle.textContent=open?'Hide generated words':'View generated words';
    }
  });

  syncVoiceLabels();
  if(account&&data){ ensureVoiceNoteData(); }
})();
