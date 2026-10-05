/* CallFocus V11.3 — reply mode + script mode for voice notes */
(() => {
  let voiceNoteMode = 'script';
  let latestVoiceNoteIdV113 = null;
  let playback = { audio:null, url:null, id:null, button:null };
  let dbPromise = null;

  const MODE_COPY = {
    script: {
      label: 'Script',
      hint: 'Type the exact words you want the voice note to say. The audio will be generated from your written script.',
      placeholder: 'Example: Hey David, good evening. I just wanted to check on you and hear how your day went.',
      emptyTitle: 'What should this voice note say?',
      emptyCopy: 'Write the exact message the voice note should speak.',
      generate: 'Create voice note',
      resultMode: 'Created from your written script',
      status: 'Create mode uses your exact written script. Reply mode drafts the message for you. Both use your current Admin speech settings and the same shared credit balance as calls.'
    },
    reply: {
      label: 'Reply request',
      hint: 'Describe what you want the reply voice note to say. CallFocus will draft the spoken message for you before generating the audio.',
      placeholder: 'Example: Tell David good evening, ask how his day went, and let him know I just wanted to hear his voice.',
      emptyTitle: 'What should this reply voice note say?',
      emptyCopy: 'Describe the reply naturally, just like you would explain it before recording.',
      generate: 'Reply with voice note',
      resultMode: 'Reply voice note drafted by CallFocus from your prompt',
      status: 'Reply mode drafts the spoken message for you before generating the audio. Create mode reads the exact script you typed. Both use your current Admin speech settings and the same shared credit balance as calls.'
    }
  };

  function currentVoiceGender(){
    return document.querySelector('[data-vn-gender].active')?.dataset?.vnGender === 'female' ? 'female' : 'male';
  }

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
    return await new Promise((resolve,reject)=>{
      const tx = db.transaction('audio','readonly');
      const req = tx.objectStore('audio').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function formatDurationSeconds(seconds){
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(s/60), r = s % 60;
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

  function modeLabel(mode){ return mode === 'reply' ? 'Reply mode' : 'Script mode'; }
  function modePromptLabel(mode){ return mode === 'reply' ? 'Reply request' : 'Script'; }
  function resultModeText(note){ return note?.mode === 'reply' ? MODE_COPY.reply.resultMode : MODE_COPY.script.resultMode; }

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
    playback = { audio:null, url:null, id:null, button:null };
  }

  async function playVoiceNote(id, btn){
    if(playback.id===id && playback.audio){
      if(playback.audio.paused){
        await playback.audio.play();
        btn.classList.add('is-playing');
        const l=btn.querySelector('span:last-child'); if(l) l.textContent='Pause voice note';
      } else {
        playback.audio.pause();
        resetPlaybackButton(btn);
      }
      return;
    }
    stopPlayback();
    let blob = null;
    try{ blob = await getVoiceBlob(id); }catch{}
    if(!blob){ toast('This voice note audio is no longer stored on this device'); return; }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playback = { audio, url, id, button:btn };
    audio.onended = () => stopPlayback();
    audio.onerror = () => { stopPlayback(); toast('Could not play this voice note'); };
    try{
      await audio.play();
      btn.classList.add('is-playing');
      const l=btn.querySelector('span:last-child'); if(l) l.textContent='Pause voice note';
    } catch {
      stopPlayback();
      toast('Tap play again to start the audio');
    }
  }

  function audioDuration(blob){
    return new Promise(resolve=>{
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      let done = false;
      const finish = (value) => { if(done) return; done = true; try{ URL.revokeObjectURL(url); }catch{} resolve(Number.isFinite(value) ? value : 0); };
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => finish(audio.duration);
      audio.onerror = () => finish(0);
      setTimeout(() => finish(0), 3500);
      audio.src = url;
    });
  }

  function applyVoiceModeUi(){
    const cfg = MODE_COPY[voiceNoteMode] || MODE_COPY.script;
    document.querySelectorAll('[data-vn-mode]').forEach(btn => {
      const active = btn.dataset.vnMode === voiceNoteMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if($('voiceNotePromptLabel')) $('voiceNotePromptLabel').textContent = cfg.label;
    if($('voiceNotePromptHint')) $('voiceNotePromptHint').textContent = cfg.hint;
    if($('voiceNotePrompt')) $('voiceNotePrompt').setAttribute('placeholder', cfg.placeholder);
    if($('voiceNoteEmptyTitle')) $('voiceNoteEmptyTitle').textContent = cfg.emptyTitle;
    if($('voiceNoteEmptyCopy')) $('voiceNoteEmptyCopy').textContent = cfg.emptyCopy;
    if($('voiceNoteGenerateLabel')) $('voiceNoteGenerateLabel').textContent = cfg.generate;
    if($('voiceNoteStatus')) $('voiceNoteStatus').textContent = cfg.status;
  }

  function setVoiceNoteMode(next){
    voiceNoteMode = next === 'reply' ? 'reply' : 'script';
    applyVoiceModeUi();
    const note = data?.voiceNotes?.find(n => n.id === latestVoiceNoteIdV113) || data?.voiceNotes?.[0] || null;
    renderVoiceNoteResult(note);
  }

  function openVoiceNotesInMode(mode){
    setVoiceNoteMode(mode);
    showView('voice-notes');
    requestAnimationFrame(()=>applyVoiceModeUi());
  }

  function renderVoiceNoteResult(note){
    const box = $('voiceNoteResult');
    if(!box) return;
    if(!note){
      box.classList.add('hidden');
      $('voiceNoteEmptyState')?.classList.remove('hidden');
      if($('voiceNoteResultMode')) $('voiceNoteResultMode').textContent = MODE_COPY[voiceNoteMode].resultMode;
      return;
    }
    latestVoiceNoteIdV113 = note.id;
    $('voiceNoteEmptyState')?.classList.add('hidden');
    box.classList.remove('hidden');
    $('voiceNoteResultScript').textContent = note.script || '';
    $('voiceNoteResultMeta').textContent = `${note.voiceGender==='female'?'Female':'Male'} · ${note.voiceName || ''} · ${formatDurationSeconds(note.duration)}${Number.isFinite(Number(note.creditsUsed)) ? ' · ' + note.creditsUsed + ' credits' : ''}`;
    if($('voiceNoteResultMode')) $('voiceNoteResultMode').textContent = resultModeText(note);
    const play = $('voiceNoteResultPlay');
    play.disabled = false;
    play.dataset.voiceNotePlay = note.id;
    resetPlaybackButton(play);
  }

  function voiceHistoryItem(note,index){
    return `<article class="voice-note-history-item">
      <div class="voice-note-history-top">
        <div><strong>Voice note ${String(index+1).padStart(2,'0')}</strong><small>${esc(voiceDate(note.createdAt))} · ${esc(note.voiceGender==='female'?'Female':'Male')} · ${esc(note.voiceName || '')}${Number.isFinite(Number(note.creditsUsed)) ? ' · ' + esc(String(note.creditsUsed)) + ' credits' : ''}</small></div>
        <span class="voice-note-duration">${esc(formatDurationSeconds(note.duration))}</span>
      </div>
      <div class="voice-note-history-prompt-row">
        <p class="voice-note-history-prompt">${esc(trimPrompt(note.prompt))}</p>
        <span class="voice-note-history-mode">${esc(modeLabel(note.mode))}</span>
      </div>
      <div class="voice-note-history-note">${esc(modePromptLabel(note.mode))}</div>
      <div class="voice-note-history-actions">
        <button class="voice-note-play" type="button" data-voice-note-play="${esc(note.id)}"><span class="voice-note-play-icon">▶</span><span>Play voice note</span></button>
        <button class="voice-note-script-toggle" type="button" data-voice-note-script="${esc(note.id)}">View generated words</button>
      </div>
      <div class="voice-note-history-script" id="voice-note-script-${esc(note.id)}">${esc(note.script || '')}</div>
    </article>`;
  }

  function renderVoiceNoteHistory(){
    const root = $('voiceNoteHistory');
    if(!root) return;
    if(!account || !data){ root.innerHTML = '<div class="voice-note-empty-history">Sign in to save and revisit generated voice notes.</div>'; return; }
    ensureVoiceNoteData();
    const notes = [...data.voiceNotes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    root.innerHTML = notes.length ? notes.map(voiceHistoryItem).join('') : '<div class="voice-note-empty-history">Your generated voice notes will appear here, newest first.</div>';
  }

  function renderVoiceNotesV113(){
    applyVoiceModeUi();
    renderVoiceNoteHistory();
    try{ window.CallFocusCredits?.render(); }catch{}
    ensureVoiceNoteData();
    const note = data?.voiceNotes?.find(n => n.id === latestVoiceNoteIdV113) || data?.voiceNotes?.[0] || null;
    renderVoiceNoteResult(note);
  }

  async function generateVoiceNoteV113(){
    if(!account || !data){ requireAccount({type:'route',route:'voice-notes'},'Create an account or sign in to generate and save voice notes.'); return; }
    const prompt = $('voiceNotePrompt')?.value.trim() || '';
    if(!prompt){ toast(voiceNoteMode === 'reply' ? 'Describe what the reply voice note should say' : 'Type the script for the voice note'); $('voiceNotePrompt')?.focus(); return; }
    const creditsApi = window.CallFocusCredits;
    if(creditsApi && creditsApi.currentBalanceSeconds() < 5){
      toast('Not enough credit to generate a voice note. Buy credits first.');
      try{ showView('credits'); }catch{}
      return;
    }
    const btn = $('voiceNoteGenerateBtn');
    const label = $('voiceNoteGenerateLabel');
    const status = $('voiceNoteStatus');
    btn.disabled = true;
    if(label) label.textContent = voiceNoteMode === 'reply' ? 'Generating reply…' : 'Generating audio…';
    status.className = 'voice-note-status';
    status.textContent = voiceNoteMode === 'reply' ? 'Drafting the reply and generating the voice note…' : 'Generating the voice note from your script…';
    try {
      await refreshPublicConfig();
      const gender = currentVoiceGender();
      const res = await fetch('/api/voice-note', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt,
          mode:voiceNoteMode,
          voiceGender:gender,
          userId:account.id,
          maxSeconds:window.CallFocusCredits?.currentBalanceSeconds?.() || 0
        })
      });
      if(!res.ok){
        let msg = 'Could not generate the voice note right now. Please try again.';
        try{ const j = await res.json(); if(j?.error) msg = j.error; }catch{}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const script = decodeURIComponent(res.headers.get('X-CallFocus-Script') || '');
      const voiceName = res.headers.get('X-CallFocus-Voice') || (gender === 'female' ? loadAdmin().femaleVoice : loadAdmin().maleVoice);
      const duration = await audioDuration(blob);
      const billableSeconds = Math.max(1, Math.ceil(Number(duration) || 1));
      const noteId = uuid();
      let creditResult = null;
      if(window.CallFocusCredits){
        creditResult = window.CallFocusCredits.deductUsageSeconds(billableSeconds, { type:'voice_note', referenceId:noteId });
        if(!creditResult?.ok){
          status.className = 'voice-note-status error';
          status.textContent = 'Voice note generated, but your remaining credit was exhausted. Top up before creating another one.';
        }
      }
      const creditsUsed = window.CallFocusCredits ? Math.round(window.CallFocusCredits.creditsForSeconds(creditResult?.deductedSeconds ?? billableSeconds) * 10) / 10 : null;
      const note = {
        id:noteId,
        mode:voiceNoteMode,
        prompt,
        script,
        voiceGender:gender,
        voiceName,
        duration,
        creditsUsed,
        creditSecondsUsed:creditResult?.deductedSeconds ?? billableSeconds,
        createdAt:new Date().toISOString()
      };
      ensureVoiceNoteData();
      data.voiceNotes.unshift(note);
      data.voiceNotes = data.voiceNotes.slice(0,60);
      await saveVoiceBlob(note.id, blob);
      saveData();
      latestVoiceNoteIdV113 = note.id;
      renderVoiceNoteResult(note);
      renderVoiceNoteHistory();
      if(window.CallFocusCredits) window.CallFocusCredits.render();
      if(!status.classList.contains('error')){
        status.className = 'voice-note-status success';
        status.textContent = `${voiceNoteMode === 'reply' ? 'Reply' : 'Voice note'} ready · ${creditsUsed != null ? creditsUsed + ' credits used · ' : ''}Tap Play voice note to listen.`;
      }
      requestAnimationFrame(()=>$('voiceNoteResult')?.scrollIntoView({behavior:'smooth',block:'center'}));
    } catch(err){
      status.className = 'voice-note-status error';
      status.textContent = err?.message || 'Could not generate the voice note right now.';
    } finally {
      btn.disabled = false;
      if(label) label.textContent = MODE_COPY[voiceNoteMode].generate;
    }
  }

  const previousShowView = showView;
  showView = function(view, scroll=true){
    previousShowView(view, scroll);
    if(view === 'voice-notes' && account){
      renderVoiceNotesV113();
    }
  };

  // replace old generate button to remove prior click listener
  const oldGenerateBtn = $('voiceNoteGenerateBtn');
  if(oldGenerateBtn){
    const newGenerateBtn = oldGenerateBtn.cloneNode(true);
    oldGenerateBtn.replaceWith(newGenerateBtn);
    newGenerateBtn.addEventListener('click', generateVoiceNoteV113);
  }

  document.querySelectorAll('[data-vn-mode]').forEach(btn => btn.addEventListener('click', () => setVoiceNoteMode(btn.dataset.vnMode)));
  $('heroCreateVoiceBtn') && ($('heroCreateVoiceBtn').onclick = () => openVoiceNotesInMode('script'));
  $('heroHowBtn') && ($('heroHowBtn').onclick = () => openVoiceNotesInMode('reply'));
  $('voiceNotesBackBtn') && ($('voiceNotesBackBtn').onclick = () => showView('home'));
  setVoiceNoteMode('script');
  if(account && data) ensureVoiceNoteData();
})();
