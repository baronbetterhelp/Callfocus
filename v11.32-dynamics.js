/* CallFocus V11.32 — select up to 50 conversation screenshots and generate dynamics */
(()=>{
  const MAX_IMAGES=50;
  const BATCH_SIZE=6;
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  const ALLOWED_TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif']);
  let files=[];
  let thumbUrls=[];
  let busy=false;

  const $=id=>document.getElementById(id);
  const notify=message=>{ try{ if(typeof window.toast==='function') return window.toast(message); if(typeof toast==='function') return toast(message); }catch{} console.log(message); };
  const token=()=>localStorage.getItem(SERVER_TOKEN_KEY)||'';

  function installModal(){
    if($('dynamicsGeneratorModal')) return;
    const wrap=document.createElement('div');
    wrap.className='modal-backdrop hidden';
    wrap.id='dynamicsGeneratorModal';
    wrap.innerHTML=`
      <div class="modal dynamics-modal" role="dialog" aria-modal="true" aria-labelledby="dynamicsGeneratorTitle">
        <div class="modal-head">
          <div><span class="section-eyebrow">AI conversation analysis</span><h2 id="dynamicsGeneratorTitle">Generate conversation dynamics</h2><p>Select up to 50 conversation screenshots at once. CallFocus analyzes them together and creates editable dynamics you can copy into any call.</p></div>
          <button class="modal-close" type="button" id="dynamicsCloseBtn" aria-label="Close">×</button>
        </div>
        <label class="dynamics-upload-zone" for="dynamicsFileInput">
          <span class="dynamics-upload-icon">＋</span>
          <strong>Upload conversation screenshots</strong>
          <p>Choose 1–50 PNG, JPG, WEBP or GIF images. Select them in conversation order when possible.</p>
        </label>
        <input class="dynamics-file-input" id="dynamicsFileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple />
        <div class="dynamics-selection-head"><strong id="dynamicsCount">0 / 50 selected</strong><span id="dynamicsSelectionNote">No screenshots selected</span></div>
        <div class="dynamics-thumbs" id="dynamicsThumbs"><div class="dynamics-empty-thumbs">Your selected screenshots will appear here.</div></div>
        <div class="dynamics-privacy">Screenshots are used only for this analysis request and are not saved to the CallFocus account. Avoid uploading content you do not have permission to process.</div>
        <div class="dynamics-progress-wrap hidden" id="dynamicsProgressWrap">
          <div class="dynamics-progress-line"><div class="dynamics-progress-bar" id="dynamicsProgressBar"></div></div>
          <div class="dynamics-progress-copy"><span id="dynamicsProgressText">Preparing images…</span><span id="dynamicsProgressPercent">0%</span></div>
        </div>
        <div class="dynamics-result hidden" id="dynamicsResult">
          <div class="dynamics-result-head"><strong>Generated conversation dynamics</strong><span class="section-eyebrow">Ready to paste</span></div>
          <textarea id="dynamicsResultText" readonly spellcheck="true" aria-label="Generated conversation dynamics"></textarea>
          <div class="dynamics-result-actions">
            <button class="btn btn-ghost" type="button" id="dynamicsEditBtn">Edit</button>
            <button class="btn btn-primary" type="button" id="dynamicsCopyBtn">Copy dynamics</button>
          </div>
        </div>
        <div class="dynamics-modal-actions">
          <button class="btn btn-ghost" type="button" id="dynamicsClearBtn">Clear images</button>
          <button class="btn btn-primary" type="button" id="dynamicsGenerateBtn" disabled>Generate dynamics</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    $('dynamicsFileInput').addEventListener('change',event=>selectFiles([...event.target.files]));
    $('dynamicsCloseBtn').onclick=closeModal;
    $('dynamicsClearBtn').onclick=()=>resetSelection(true);
    $('dynamicsGenerateBtn').onclick=runAnalysis;
    $('dynamicsEditBtn').onclick=toggleEdit;
    $('dynamicsCopyBtn').onclick=copyResult;
    wrap.addEventListener('click',e=>{ if(e.target===wrap&&!busy) closeModal(); });
  }

  function installLaunchButton(){
    const btn=$('heroHowBtn');
    if(!btn) return;
    btn.classList.add('dynamics-launch');
    btn.innerHTML='<span class="voice-note-launch-icon" aria-hidden="true">◎</span><span>Generate conversation dynamics</span>';
    btn.setAttribute('aria-label','Generate conversation dynamics from screenshots');
    btn.onclick=openGenerator;
  }

  function openGenerator(){
    if(!token()){
      try{ if(typeof showAuth==='function') showAuth('signin',null,'Sign in to analyze conversation screenshots.'); else notify('Sign in to analyze screenshots.'); }catch{ notify('Sign in to analyze screenshots.'); }
      return;
    }
    installModal();
    $('dynamicsGeneratorModal').classList.remove('hidden');
    document.body.style.overflow='hidden';
  }

  function closeModal(){
    if(busy) return notify('Please wait for the current analysis to finish.');
    $('dynamicsGeneratorModal')?.classList.add('hidden');
    document.body.style.overflow='';
  }

  function clearThumbUrls(){
    thumbUrls.forEach(url=>{ try{URL.revokeObjectURL(url);}catch{} });
    thumbUrls=[];
  }

  function resetSelection(resetInput=false){
    if(busy) return;
    files=[]; clearThumbUrls();
    if(resetInput&&$('dynamicsFileInput')) $('dynamicsFileInput').value='';
    $('dynamicsResult')?.classList.add('hidden');
    if($('dynamicsResultText')) $('dynamicsResultText').value='';
    renderSelection();
  }

  function selectFiles(incoming){
    if(busy) return;
    const valid=incoming.filter(f=>ALLOWED_TYPES.has(String(f.type||'').toLowerCase()));
    if(valid.length!==incoming.length) notify('Some files were skipped. Use PNG, JPG, WEBP or GIF images.');
    files=valid.slice(0,MAX_IMAGES);
    if(valid.length>MAX_IMAGES) notify('CallFocus accepts a maximum of 50 screenshots per analysis.');
    clearThumbUrls();
    renderSelection();
    $('dynamicsResult')?.classList.add('hidden');
  }

  function renderSelection(){
    clearThumbUrls();
    const count=$('dynamicsCount'), note=$('dynamicsSelectionNote'), thumbs=$('dynamicsThumbs'), generate=$('dynamicsGenerateBtn');
    if(count) count.textContent=`${files.length} / ${MAX_IMAGES} selected`;
    if(note) note.textContent=files.length ? `${files.length} screenshot${files.length===1?'':'s'} ready` : 'No screenshots selected';
    if(generate) generate.disabled=!files.length||busy;
    if(!thumbs) return;
    thumbs.innerHTML='';
    if(!files.length){ thumbs.innerHTML='<div class="dynamics-empty-thumbs">Your selected screenshots will appear here.</div>'; return; }
    files.forEach((file,i)=>{
      const url=URL.createObjectURL(file); thumbUrls.push(url);
      const item=document.createElement('div'); item.className='dynamics-thumb';
      const img=document.createElement('img'); img.src=url; img.alt=`Screenshot ${i+1}`; img.loading='lazy';
      const num=document.createElement('b'); num.textContent=String(i+1);
      item.append(img,num); thumbs.appendChild(item);
    });
  }

  function setProgress(percent,text,isError=false){
    const wrap=$('dynamicsProgressWrap'); if(!wrap) return;
    wrap.classList.remove('hidden');
    $('dynamicsProgressBar').style.width=`${Math.max(0,Math.min(100,percent))}%`;
    $('dynamicsProgressText').textContent=text||'';
    $('dynamicsProgressText').classList.toggle('dynamics-status-error',!!isError);
    $('dynamicsProgressPercent').textContent=`${Math.round(Math.max(0,Math.min(100,percent)))}%`;
  }

  function readAsDataURL(file){
    return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=()=>reject(new Error('Could not read an image.')); r.readAsDataURL(file); });
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('One screenshot could not be prepared.')); img.src=src; });
  }

  async function prepareImage(file){
    const src=await readAsDataURL(file);
    const img=await loadImage(src);
    const longest=Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height);
    const scale=longest>2048 ? 2048/longest : 1;
    const width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    const height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,width,height); ctx.drawImage(img,0,0,width,height);
    return canvas.toDataURL('image/jpeg',0.84);
  }

  async function api(path,body){
    const t=token();
    const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body),cache:'no-store'});
    let payload={}; try{payload=await res.json();}catch{}
    if(!res.ok) throw new Error(payload?.error||'CallFocus could not analyze these screenshots.');
    return payload;
  }

  async function analyzeBatch(imageData,batchNumber,totalBatches){
    let lastError;
    for(let attempt=0;attempt<2;attempt++){
      try{return await api('/api/dynamics/analyze',{kind:'batch',images:imageData,batchNumber,totalBatches});}
      catch(error){lastError=error;if(attempt===0) await new Promise(r=>setTimeout(r,650));}
    }
    throw lastError;
  }

  async function runAnalysis(){
    if(busy||!files.length) return;
    if(!token()) return openGenerator();
    busy=true; renderSelection();
    $('dynamicsResult')?.classList.add('hidden');
    $('dynamicsGenerateBtn').textContent='Analyzing…';
    $('dynamicsClearBtn').disabled=true;
    const totalBatches=Math.ceil(files.length/BATCH_SIZE);
    const summaries=[];
    try{
      for(let b=0;b<totalBatches;b++){
        const start=b*BATCH_SIZE;
        const group=files.slice(start,start+BATCH_SIZE);
        const prepared=[];
        for(let j=0;j<group.length;j++){
          const imageIndex=start+j+1;
          const prepPct=((b+(j/group.length)*0.38)/(totalBatches+1))*100;
          setProgress(prepPct,`Preparing screenshot ${imageIndex} of ${files.length}…`);
          prepared.push(await prepareImage(group[j]));
        }
        const analyzePct=((b+0.45)/(totalBatches+1))*100;
        setProgress(analyzePct,`Analyzing screenshots ${start+1}–${start+group.length} of ${files.length}…`);
        const payload=await analyzeBatch(prepared,b+1,totalBatches);
        if(!payload?.summary) throw new Error('CallFocus did not receive a usable analysis for one screenshot group.');
        summaries.push(payload.summary);
        setProgress(((b+1)/(totalBatches+1))*100,`Analyzed ${start+group.length} of ${files.length} screenshots.`);
      }
      setProgress((totalBatches/(totalBatches+1))*100,'Combining the full conversation into final dynamics…');
      const final=await api('/api/dynamics/analyze',{kind:'finalize',summaries,imageCount:files.length});
      if(!final?.dynamics) throw new Error('CallFocus could not create the final conversation dynamics.');
      $('dynamicsResultText').value=final.dynamics.trim();
      $('dynamicsResultText').readOnly=true;
      $('dynamicsEditBtn').textContent='Edit';
      $('dynamicsResult').classList.remove('hidden');
      setProgress(100,`Finished analyzing ${files.length} screenshot${files.length===1?'':'s'}.`);
      $('dynamicsResult').scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(error){
      setProgress(0,error?.message||'Analysis failed. Please try again.',true);
      notify(error?.message||'Analysis failed. Please try again.');
    }finally{
      busy=false;
      $('dynamicsGenerateBtn').textContent='Generate dynamics';
      $('dynamicsClearBtn').disabled=false;
      renderSelection();
    }
  }

  function toggleEdit(){
    const area=$('dynamicsResultText'); if(!area||!area.value) return;
    area.readOnly=!area.readOnly;
    $('dynamicsEditBtn').textContent=area.readOnly?'Edit':'Done editing';
    if(!area.readOnly){area.focus();area.setSelectionRange(area.value.length,area.value.length);}
  }

  async function copyResult(){
    const area=$('dynamicsResultText'); const text=String(area?.value||'').trim(); if(!text) return;
    try{await navigator.clipboard.writeText(text);notify('Conversation dynamics copied.');}
    catch{area.focus();area.select();document.execCommand('copy');notify('Conversation dynamics copied.');}
  }

  function boot(){ installModal(); installLaunchButton(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
