export async function onRequestPost(context) {
  const { request, env } = context;
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

  const openai = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'OpenAI-Safety-Identifier': 'callfocus-web-v1'
    },
    body: form
  });

  const responseBody = await openai.text();
  return new Response(responseBody, {
    status: openai.status,
    headers: {
      'Content-Type': openai.headers.get('Content-Type') || 'application/sdp',
      'Cache-Control': 'no-store'
    }
  });
}
