const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];

const DEFAULT_CONFIG = {
  serverOnline: true,
  serverMessage: 'Server not active right now. Please try again soon.',
  maleVoice: 'cedar',
  femaleVoice: 'marin',
  model: 'gpt-realtime-2.1',
  instructions: 'Have a natural live spoken conversation using the supplied context. Do not read system context aloud. Keep replies conversational, appropriately brief, emotionally aware and grounded in the facts provided. Never invent personal history, relationship milestones, promises or sensitive facts that were not supplied or established during the current call.',
  speechStyle: 'Sound like a natural live phone conversation, not a chatbot. Use contractions, varied sentence length, short spontaneous acknowledgements and natural pacing. Do not over-explain, summarize every message, repeat what the other person just said, or ask multiple questions at once. Avoid generic assistant phrases unless they genuinely fit the moment. Match the relationship, emotion and energy of the other person. Use fillers sparingly and naturally. Keep most turns concise unless the conversation clearly needs more detail.',
  opening: 'Begin naturally as soon as the call connects. Use the relationship, current topic and both callers’ local times when relevant.',
  speakFirst: true,
  interruptions: true,
  updatedAt: null
};

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || 'callfocus-user'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function getConfig(env) {
  if (!env.CALLFOCUS_CONFIG || typeof env.CALLFOCUS_CONFIG.get !== 'function') return { ...DEFAULT_CONFIG };
  try {
    const saved = await env.CALLFOCUS_CONFIG.get('global_config', { type: 'json' });
    return { ...DEFAULT_CONFIG, ...(saved || {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function sanitizeConfig(input = {}) {
  const voice = v => VOICES.includes(v) ? v : null;
  return {
    serverOnline: input.serverOnline !== false,
    serverMessage: String(input.serverMessage || DEFAULT_CONFIG.serverMessage).slice(0, 240),
    maleVoice: voice(input.maleVoice) || DEFAULT_CONFIG.maleVoice,
    femaleVoice: voice(input.femaleVoice) || DEFAULT_CONFIG.femaleVoice,
    model: /^gpt-realtime-[a-zA-Z0-9._-]+$/.test(input.model || '') ? input.model : DEFAULT_CONFIG.model,
    instructions: String(input.instructions || DEFAULT_CONFIG.instructions).slice(0, 24000),
    speechStyle: String(input.speechStyle || DEFAULT_CONFIG.speechStyle).slice(0, 12000),
    opening: String(input.opening || DEFAULT_CONFIG.opening).slice(0, 8000),
    speakFirst: input.speakFirst !== false,
    interruptions: input.interruptions !== false,
    updatedAt: new Date().toISOString()
  };
}

function adminAuthorized(request, env) {
  const expected = String(env.CALLFOCUS_ADMIN_PASSCODE || '');
  const supplied = String(request.headers.get('X-CallFocus-Admin-Key') || '');
  return !!expected && supplied === expected;
}

async function handlePublicConfig(env) {
  const c = await getConfig(env);
  return json({
    serverOnline: c.serverOnline,
    serverMessage: c.serverMessage,
    maleVoice: c.maleVoice,
    femaleVoice: c.femaleVoice,
    model: c.model,
    opening: c.opening,
    speakFirst: c.speakFirst,
    interruptions: c.interruptions
  });
}

async function handleAdminConfig(request, env) {
  if (!adminAuthorized(request, env)) return json({ error: 'Incorrect admin passcode.' }, 401);
  if (request.method === 'GET') {
    const config = await getConfig(env);
    return json({ config, storageConnected: !!env.CALLFOCUS_CONFIG });
  }
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, POST' } });
  if (!env.CALLFOCUS_CONFIG || typeof env.CALLFOCUS_CONFIG.put !== 'function') {
    return json({ error: 'Global admin storage is not connected yet. Add a Workers KV binding named CALLFOCUS_CONFIG.' }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const config = sanitizeConfig(body);
  await env.CALLFOCUS_CONFIG.put('global_config', JSON.stringify(config));
  return json({ ok: true, config });
}

async function handleAdminLogin(request, env) {
  if (!env.CALLFOCUS_ADMIN_PASSCODE) return json({ error: 'Admin passcode is not configured on the server.' }, 503);
  return adminAuthorized(request, env) ? json({ ok: true }) : json({ error: 'Incorrect admin passcode.' }, 401);
}

async function handleVoicePreview(request, env) {
  if (!adminAuthorized(request, env)) return json({ error: 'Incorrect admin passcode.' }, 401);
  if (!env.OPENAI_API_KEY) return json({ error: 'OpenAI API key is not configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const voice = VOICES.includes(body?.voice) ? body.voice : 'marin';
  const input = String(body?.text || 'Hi, this is a quick CallFocus voice preview.').slice(0, 500);
  const speech = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input,
      instructions: 'Speak naturally like a relaxed live phone conversation. Warm, clear, human pacing. Avoid announcer or assistant-like delivery.',
      response_format: 'mp3'
    })
  });
  if (!speech.ok) {
    const text = await speech.text();
    return json({ error: text.includes('credit') || speech.status === 429 ? 'Voice preview unavailable because API credit is not available.' : 'Voice preview is unavailable right now.' }, speech.status);
  }
  return new Response(speech.body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
}

async function handleSession(request, env) {
  if (!env.OPENAI_API_KEY) return new Response('Server unavailable. Try again soon.', { status: 503 });
  const config = await getConfig(env);
  if (!config.serverOnline) return new Response(config.serverMessage || DEFAULT_CONFIG.serverMessage, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON request.', { status: 400 }); }
  if (!body?.sdp || typeof body.sdp !== 'string') return new Response('Missing SDP offer.', { status: 400 });

  const requested = body.session || {};
  const gender = requested.voiceGender === 'female' ? 'female' : 'male';
  const voice = gender === 'female' ? config.femaleVoice : config.maleVoice;
  const callContext = String(requested.contextInstructions || requested.instructions || '').slice(0, 24000);
  const instructions = [config.instructions, config.speechStyle, callContext].filter(Boolean).join('\n\n');

  const sessionConfig = {
    type: 'realtime',
    model: config.model,
    instructions,
    audio: {
      input: {
        turn_detection: {
          type: 'server_vad',
          create_response: true,
          interrupt_response: config.interruptions !== false
        }
      },
      output: { voice }
    }
  };

  const form = new FormData();
  form.set('sdp', body.sdp);
  form.set('session', JSON.stringify(sessionConfig));
  const safetyId = await sha256Hex(body.userId || 'callfocus-user');

  let openai;
  try {
    openai = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'OpenAI-Safety-Identifier': safetyId },
      body: form
    });
  } catch (error) {
    return new Response('Server unavailable. Try again soon.', { status: 502 });
  }

  const responseBody = await openai.text();
  if (!openai.ok) {
    let code = '';
    try { code = JSON.parse(responseBody)?.error?.code || ''; } catch {}
    const quota = openai.status === 429 || code === 'credit_balance_exhausted' || code === 'insufficient_quota';
    return new Response(quota ? 'Server not active. Try again soon.' : 'Server unavailable. Try again soon.', {
      status: quota ? 503 : openai.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const headers = new Headers({
    'Content-Type': openai.headers.get('Content-Type') || 'application/sdp',
    'Cache-Control': 'no-store',
    'X-CallFocus-Speak-First': config.speakFirst ? '1' : '0',
    'X-CallFocus-Opening': encodeURIComponent(config.opening || '')
  });
  return new Response(responseBody, { status: openai.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/public-config' && request.method === 'GET') return handlePublicConfig(env);
    if (url.pathname === '/api/admin/login' && request.method === 'POST') return handleAdminLogin(request, env);
    if (url.pathname === '/api/admin/config') return handleAdminConfig(request, env);
    if (url.pathname === '/api/admin/voice-preview' && request.method === 'POST') return handleVoicePreview(request, env);
    if (url.pathname === '/api/session') {
      if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'POST' } });
      return handleSession(request, env);
    }
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), request));
    }
    return env.ASSETS.fetch(request);
  }
};
