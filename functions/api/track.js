function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashValue(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function checkTrackingRateLimit(db, request, email) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 15 * 60;
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = ip ? await hashValue(ip) : "";
  const emailHash = validEmail(email) ? await hashValue(email.toLowerCase()) : "";

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS request_tracking_attempts (
      id TEXT PRIMARY KEY,
      ip_hash TEXT,
      email_hash TEXT,
      created_at INTEGER NOT NULL
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_request_tracking_ip_time ON request_tracking_attempts(ip_hash, created_at)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_request_tracking_email_time ON request_tracking_attempts(email_hash, created_at)").run();
  await db.prepare("DELETE FROM request_tracking_attempts WHERE created_at < ?").bind(now - 86400).run();

  const [ipCount, emailCount] = await Promise.all([
    ipHash
      ? db.prepare("SELECT COUNT(*) AS count FROM request_tracking_attempts WHERE ip_hash = ? AND created_at > ?").bind(ipHash, windowStart).first()
      : Promise.resolve({ count: 0 }),
    emailHash
      ? db.prepare("SELECT COUNT(*) AS count FROM request_tracking_attempts WHERE email_hash = ? AND created_at > ?").bind(emailHash, windowStart).first()
      : Promise.resolve({ count: 0 }),
  ]);
  if ((ipCount?.count || 0) >= 30 || (emailCount?.count || 0) >= 10) return false;

  await db.prepare("INSERT INTO request_tracking_attempts (id, ip_hash, email_hash, created_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), ipHash || null, emailHash || null, now).run();
  return true;
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }
  if (!env.DB) {
    return json(
      {
        error:
          "Request tracking is temporarily unavailable. Please try again later.",
      },
      503,
    );
  }

  const url = new URL(request.url);
  const reference = clean(url.searchParams.get("reference"), 40).toUpperCase();
  const email = clean(url.searchParams.get("email"), 254).toLowerCase();
  try {
    const allowed = await checkTrackingRateLimit(env.DB, request, email);
    if (!allowed) {
      return json({ error: "Too many tracking attempts. Please wait 15 minutes before trying again." }, 429, { "Retry-After": "900" });
    }
  } catch (error) {
    console.error("Unable to apply request tracking rate limit", error);
    return json({ error: "Request tracking is temporarily unavailable. Please try again later." }, 503);
  }
  if (!reference || !email || !validEmail(email)) {
    return json(
      {
        error:
          "Enter a valid reference number and the email address used for the request.",
      },
      400,
    );
  }

  try {
    const row = await env.DB.prepare(
      `
      SELECT reference, request_type, status, created_at
      FROM requests
      WHERE reference = ? AND lower(email) = ?
      LIMIT 1
    `,
    )
      .bind(reference, email)
      .first();

    if (!row) {
      return json(
        {
          error:
            "We could not find a request matching those details. Check the reference and email address and try again.",
        },
        404,
      );
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
    console.error("Unable to look up YR Proservice request status", error);
    return json(
      {
        error:
          "We could not check the request status right now. Please try again later.",
      },
      500,
    );
  }
}
