function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed.' }, 405);
  }
  if (!env.DB) {
    return json({ error: 'Request tracking is temporarily unavailable. Please try again later.' }, 503);
  }

  const url = new URL(request.url);
  const reference = clean(url.searchParams.get('reference'), 40).toUpperCase();
  const email = clean(url.searchParams.get('email'), 254).toLowerCase();
  if (!reference || !email || !validEmail(email)) {
    return json({ error: 'Enter a valid reference number and the email address used for the request.' }, 400);
  }

  try {
    const row = await env.DB.prepare(`
      SELECT reference, request_type, status, created_at
      FROM requests
      WHERE reference = ? AND lower(email) = ?
      LIMIT 1
    `).bind(reference, email).first();

    if (!row) {
      return json({ error: 'We could not find a request matching those details. Check the reference and email address and try again.' }, 404);
    }
    return json({
      ok: true,
      request: {
        reference: row.reference,
        requestType: row.request_type,
        status: row.status,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('Unable to look up YR Proservice request status', error);
    return json({ error: 'We could not check the request status right now. Please try again later.' }, 500);
  }
}
