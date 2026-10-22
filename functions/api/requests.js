const ALLOWED_SERVICE_SLUGS = new Set([
  'dental-chair-installation',
  'equipment-installation',
  'compressor-installation',
  'dental-suction-installation',
  'underfloor-piping',
  'preventive-maintenance',
  'equipment-relocation',
  'repair-technical-support',
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  if (!env.DB) {
    return json({ error: 'Request storage is not configured. Please try again later or contact YR Proservice directly.' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ error: 'Please submit the form using the website.' }, 415);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ error: 'The submitted form is too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'The submitted form could not be read. Please check the fields and try again.' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'The submitted form could not be read. Please check the fields and try again.' }, 400);
  }

  const requestType = cleanString(body.requestType, 30);
  if (!['service', 'quotation', 'dental_chair'].includes(requestType)) {
    return json({ error: 'This request type is not supported.' }, 400);
  }

  const name = cleanString(body.name, 120);
  const company = cleanString(body.clinic, 160);
  const phone = cleanString(body.phone, 50);
  const email = cleanString(body.email, 254).toLowerCase();
  const serviceSlug = cleanString(body.service, 80);
  const timing = cleanString(body.timing, 160);
  const location = cleanString(body.location, 200);
  const productSelection = cleanString(body.product, 8000);
  const message = cleanString(body.message, 5000) || (requestType === 'quotation' ? 'Quotation request submitted without additional message.' : '');

  if (!name || !email || (requestType === 'service' && (!phone || !serviceSlug || !message))) {
    return json({ error: 'Please complete all required fields.' }, 400);
  }
  if (!validEmail(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (requestType === 'service' && !ALLOWED_SERVICE_SLUGS.has(serviceSlug)) {
    return json({ error: 'Please select a valid service.' }, 400);
  }
  if ((requestType === 'quotation' || requestType === 'dental_chair') && !productSelection) {
    return json({ error: 'Please include a product selection or describe your quotation requirements.' }, 400);
  }

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll('-', '');
  const randomPart = crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  const referencePrefix = requestType === 'service' ? 'YRS' : requestType === 'quotation' ? 'YRQ' : 'YRC';
  const reference = `${referencePrefix}-${datePart}-${randomPart}`;
  const id = crypto.randomUUID();
  const details = JSON.stringify(
    requestType === 'service'
      ? { source: 'website-service-request' }
      : requestType === 'quotation'
        ? { source: 'website-quotation-request', location, productSelection }
        : { source: 'website-dental-chair-request', location, productSelection }
  );
  const storedPhone = phone || 'Not provided';
  const storedMessage = requestType === 'service'
    ? message
    : [
        message || (requestType === 'dental_chair' ? 'Dental chair request submitted without additional requirements.' : 'Quotation request submitted without additional message.'),
        location ? `Location: ${location}` : '',
        productSelection ? `${requestType === 'dental_chair' ? 'Dental Chair Models' : 'Products / Chairs'}: ${productSelection}` : ''
      ].filter(Boolean).join('\n');

  try {
    await env.DB.prepare(`
      INSERT INTO requests
        (id, reference, request_type, status, customer_name, company, phone, email, service_slug, preferred_timing, message, details_json)
      VALUES (?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, reference, requestType, name, company || null, storedPhone, email, requestType === 'service' ? serviceSlug : null, timing || null, storedMessage, details).run();
  } catch (error) {
    console.error(`Unable to save YR Proservice ${requestType} request`, error);
    return json({ error: 'We could not save your request just now. Your details have not been confirmed as received. Please try again or contact YR Proservice directly.' }, 500);
  }

  const successMessage = requestType === 'service'
    ? 'Your service request has been saved.'
    : requestType === 'quotation'
      ? 'Your quotation request has been saved.'
      : 'Your dental chair request has been saved.';

  return json({ ok: true, reference, message: successMessage }, 201);
}
