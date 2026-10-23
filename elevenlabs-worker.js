/* CallFocus V16.19 — isolated ElevenLabs endpoints. No OpenAI routes or credentials. */
const EL_API='https://api.elevenlabs.io';
const elJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const getKey=env=>String(env.ELEVENLABS_API_KEY||env.ELEVEN_LABS_API_KEY||env.ELEVENLAB_API_KEY||'').trim();
const getAgent=env=>String(env.ELEVENLABS_AGENT_ID||env.ELEVEN_LABS_AGENT_ID||env.ELEVENLAB_AGENT_ID||env.ELEVENLABS_AGENT||'').trim();
const voicesKey=user=>`elevenlabs:voices:${user.id}`;
const safeName=v=>String(v||'').trim().replace(/[\x00-\x1f\x7f]/g,' ').slice(0,65);
const badResponse=async(res,what)=>{let body={};try{body=await res.json()}catch{}return elJson({error:String(body?.detail?.message||body?.detail?.status||body?.error?.message||body?.detail||`${what} failed (HTTP ${res.status}).`).replace(/\b(?:Eleven\s*Labs|Open\s*AI)\b/gi,'voice service').slice(0,350)},res.status===429?429:res.status===401||res.status===403?502:res.status>=500?502:400)};
const withKey=env=>({'xi-api-key':getKey(env)});
async function readVoices(env,user){let list=await env.CALLFOCUS_CONFIG.get(voicesKey(user),{type:'json'});return Array.isArray(list)?list.filter(x=>x&&typeof x.voiceId==='string'&&typeof x.name==='string').slice(0,3):[];}
const idValid=id=>/^[a-zA-Z0-9_-]{8,120}$/.test(String(id||''));
async function elRequest(req,env,helpers){
  const path=new URL(req.url).pathname;
  if(!['/api/elevenlabs/voices','/api/elevenlabs/clone','/api/elevenlabs/session','/api/elevenlabs/tts'].includes(path))return elJson({error:'Not found'},404);
  const auth=await helpers.auth(req,env);
  if(!auth)return elJson({error:'Sign in to CallFocus first.'},401);
  if(!getKey(env))return elJson({error:'Voice cloning is temporarily unavailable. Please contact support.'},503);
  if(path==='/api/elevenlabs/voices'){
    if(req.method!=='GET')return elJson({error:'Method not allowed.'},405);
    return elJson({ok:true,voices:await readVoices(env,auth.user),agentConfigured:!!getAgent(env)});
  }
  if(path==='/api/elevenlabs/clone'){
    if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
    let form;try{form=await req.formData()}catch{return elJson({error:'Invalid recording submission.'},400)}
    const name=safeName(form.get('name'));const consent=String(form.get('consent')||'');const file=form.get('audio');
    if(name.length<2)return elJson({error:'Enter a voice name.'},400);
    if(consent!=='yes')return elJson({error:'Confirm this is your own adult voice and you consent to cloning.'},400);
    if(!(file instanceof File)||file.size<2000||file.size>16*1024*1024)return elJson({error:'Upload an audio recording under 16 MB.'},400);
    // Safari frequently includes codec parameters (audio/mp4;codecs=mp4a.40.2)
    // or uses a generic MIME. Inspect the container signature before allowing it.
    const head=new Uint8Array(await file.slice(0,32).arrayBuffer());
    const ascii=(start,count)=>String.fromCharCode(...head.slice(start,start+count));
    const isMP4=ascii(4,4)==='ftyp';
    const isWebM=head[0]===0x1a&&head[1]===0x45&&head[2]===0xdf&&head[3]===0xa3;
    const isWav=ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE';
    const isOgg=ascii(0,4)==='OggS';
    const isFlac=ascii(0,4)==='fLaC';
    const isMp3=ascii(0,3)==='ID3'||(head[0]===0xff&&(head[1]&0xe0)===0xe0);
    const isAac=head[0]===0xff&&(head[1]&0xf0)===0xf0;
    const mime=String(file.type||'').split(';')[0].trim().toLowerCase();
    const supportedMime=/^(audio\/(webm|mp4|mpeg|mp3|wav|wave|x-wav|ogg|aac|aiff|flac|x-flac|x-m4a|m4a|x-aac)|video\/(webm|mp4)|application\/(octet-stream|mp4))$/.test(mime);
    if(!(isMP4||isWebM||isWav||isOgg||isFlac||isMp3||isAac)||(!supportedMime&&mime))return elJson({error:'This audio file format could not be read. Try M4A, MP3, WAV, or WEBM.'},400);
    // Give the upstream service a stable, conventional filename and MIME label.
    const ext=isMP4?'m4a':isWebM?'webm':isWav?'wav':isOgg?'ogg':isFlac?'flac':isAac?'aac':'mp3';
    const type=isMP4?'audio/mp4':isWebM?'audio/webm':isWav?'audio/wav':isOgg?'audio/ogg':isFlac?'audio/flac':isAac?'audio/aac':'audio/mpeg';
    const acceptedAudio=new File([file],`voice-sample.${ext}`,{type});
    const existing=await readVoices(env,auth.user);
    if(existing.length>=3)return elJson({error:'You already have 3 saved cloned voices.'},409);
    const payload=new FormData();payload.set('name',`CF ${name} ${auth.user.id.slice(0,8)}`);payload.append('files',acceptedAudio,acceptedAudio.name);
    let upstream;try{upstream=await fetch(`${EL_API}/v1/voices/add`,{method:'POST',headers:withKey(env),body:payload,signal:AbortSignal.timeout(60000)})}catch{return elJson({error:'The voice service could not be reached. Please retry.'},502)}
    if(!upstream.ok)return badResponse(upstream,'Voice clone');
    const created=await upstream.json().catch(()=>({}));
    if(!idValid(created.voice_id))return elJson({error:'Your voice could not be saved. Please contact support.'},502);
    const voice={id:crypto.randomUUID(),voiceId:created.voice_id,name,requiresVerification:created.requires_verification===true,createdAt:new Date().toISOString()};
    await env.CALLFOCUS_CONFIG.put(voicesKey(auth.user),JSON.stringify([...existing,voice]));
    return elJson({ok:true,voice});
  }
  let body;try{body=await req.json()}catch{return elJson({error:'Invalid request.'},400)}
  const voices=await readVoices(env,auth.user);
  const voice=voices.find(v=>v.id===body?.voiceId);
  if(!voice)return elJson({error:'Select one of your own saved cloned voices.'},403);
  if(voice.requiresVerification)return elJson({error:'This voice needs verification before it can be used.'},409);
  const walletConfig=await helpers.getConfig(env);
  if(walletConfig.serverOnline===false)return elJson({error:'Calling is currently unavailable.'},503);
  const unlimited=(walletConfig.unlimitedCreditEmails||[]).map(x=>String(x).toLowerCase()).includes(String(auth.user.email||'').toLowerCase());
  const walletData=await helpers.customerData(env,auth.user.id,auth.user.name);
  const wallet=helpers.normalizeWallet(walletData.wallet||{});
  if(!unlimited&&wallet.balanceSeconds<(path.endsWith('/session')?15:5))return elJson({error:'Not enough CallFocus credits. Buy credits to continue.'},402);
  if(path==='/api/elevenlabs/session'){
    if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
    if(!getAgent(env))return elJson({error:'The calling service is not configured yet. Please contact support.'},503);
    if(String(body?.context||'').length>24000)return elJson({error:'Call context exceeds the permitted size.'},400);
    const url=new URL(`${EL_API}/v1/convai/conversation/get-signed-url`);url.searchParams.set('agent_id',getAgent(env));
    let signed;try{signed=await fetch(url,{headers:withKey(env),signal:AbortSignal.timeout(20000)})}catch{return elJson({error:'Could not connect to the calling service.'},502)}
    if(!signed.ok)return badResponse(signed,'Voice call');
    const response=await signed.json().catch(()=>({}));
    if(typeof response.signed_url!=='string'||!response.signed_url.startsWith('wss://api.elevenlabs.io/'))return elJson({error:'Could not establish a secure call.'},502);
    // Reuse existing CallFocus server-authoritative call usage/wallet flow.
    const id=await helpers.registerUsage(req,env,{session:{threadId:String(body.threadId||'').slice(0,160),callTitle:String(body.title||'').slice(0,160),callerName:String(body.callerName||'').slice(0,120)}},{id:'elevenlabs-agent'},auth);
    if(!id)return elJson({error:'Could not create the call credit record.'},503);
    const index=await env.CALLFOCUS_CONFIG.get(`call_usage:id:${id}`,{type:'json'});
    if(index?.key){const record=await env.CALLFOCUS_CONFIG.get(index.key,{type:'json'});if(record){record.model='elevenlabs-agent';record.voiceRateUsdPerMinute=0;record.missingBackendPricing=true;record.providerSessionId='elevenlabs-agent';record.chargeRateCreditsPerMinute=(await helpers.getServiceRates(env)).cloneVoice;await helpers.saveUsage(env,index.key,record);}}
    return elJson({ok:true,signedUrl:response.signed_url,callUsageId:id,voiceId:voice.voiceId,voiceName:voice.name,context:String(body.context||'').slice(0,22000),balanceSeconds:wallet.balanceSeconds,unlimited});
  }
  if(path==='/api/elevenlabs/tts'){
    if(req.method!=='POST')return elJson({error:'Method not allowed.'},405);
    const script=String(body.script||'').trim();
    if(!script||script.length>2200)return elJson({error:'Enter a script of up to 2,200 characters.'},400);
    const ttsUrl=`${EL_API}/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}/with-timestamps`;
    let result;try{result=await fetch(ttsUrl,{method:'POST',headers:{...withKey(env),'Content-Type':'application/json'},body:JSON.stringify({text:script,model_id:'eleven_multilingual_v2',output_format:'mp3_44100_128'}),signal:AbortSignal.timeout(60000)})}catch{return elJson({error:'Voice note generation timed out.'},502)}
    if(!result.ok)return badResponse(result,'Voice note');
    const item=await result.json().catch(()=>({}));const base64=item.audio_base64;const align=item.alignment||item.normalized_alignment||{};
    if(typeof base64!=='string'||!base64)return elJson({error:'No audio was generated.'},502);
    const endpoints=[...(align.character_end_times_seconds||[]).map(Number),...(align.character_start_times_seconds||[]).map((s,i)=>Number(s)+Number((align.character_durations_seconds||[])[i]||0))].filter(n=>Number.isFinite(n)&&n>0);
    if(!endpoints.length)return elJson({error:'Could not verify the audio duration. No credits were charged.'},502);
    const seconds=Math.max(1,Math.ceil(Math.max(...endpoints)));
    let updatedWallet=null;
    if(!unlimited){
      if(seconds>wallet.balanceSeconds)return elJson({error:`This voice note needs about ${seconds} seconds of credits. Your current balance is insufficient.`},402);
      const payReq=new Request(req.url,{method:'POST',headers:{Authorization:req.headers.get('Authorization')||'','Content-Type':'application/json'},body:JSON.stringify({type:'voice_note',referenceId:`el-${crypto.randomUUID()}`,seconds})});
      const paid=await helpers.consume(payReq,env,(await helpers.getServiceRates(env)).cloneVoice);if(!paid.ok)return paid;
      const outcome=await paid.json().catch(()=>({}));
      if(!outcome?.ok)return elJson({error:'CallFocus could not confirm the credit deduction.'},503);
      updatedWallet=outcome.wallet||null;
    }
    return elJson({ok:true,audioBase64:base64,script,seconds,voiceName:voice.name,wallet:updatedWallet});
  }
  return elJson({error:'Not found'},404);
}
export {elRequest};
