async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || 'callfocus-user'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleSession(request, env) {
  if (!env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY is not configured on the server.', { status: 503 });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response('Invalid JSON request.', { status: 400 }); }

  if (!body?.sdp || typeof body.sdp !== 'string') {
    return new Response('Missing SDP offer.', { status: 400 });
  }

  const requested = body.session || {};
  const allowedVoices = new Set(['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar']);
  const voice = allowedVoices.has(requested.voice) ? requested.voice : 'marin';
  const model = /^gpt-realtime-[a-zA-Z0-9._-]+$/.test(requested.model || '') ? requested.model : 'gpt-realtime-2.1';
  const instructions = String(requested.instructions || '').slice(0, 24000);

  const sessionConfig = {
    type: 'realtime',
    model,
    instructions,
    audio: {
      input: {
        turn_detection: {
          type: 'server_vad',
          create_response: true,
          interrupt_response: requested.interruptions !== false
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
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'OpenAI-Safety-Identifier': safetyId
      },
      body: form
    });
  } catch (error) {
    return new Response(`Realtime upstream connection failed: ${error?.message || error}`, { status: 502 });
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
    'Cache-Control': 'no-store'
  });
  const location = openai.headers.get('Location');
  if (location) headers.set('X-CallFocus-Realtime-Location', location);

  return new Response(responseBody, { status: openai.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/session') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed.', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleSession(request, env);
    }

    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), request));
    }

    return env.ASSETS.fetch(request);
  }
};
