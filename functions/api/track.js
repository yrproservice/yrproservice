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

  await db.prepare("DELETE FROM request_tracking_attempts WHERE created_at < ?").bind(now - 86400).run();

  if (!ipHash && !emailHash) return true;

  const insertSql = ipHash && emailHash
    ? `
      INSERT INTO request_tracking_attempts (id, ip_hash, email_hash, created_at)
      SELECT ?, ?, ?, ?
      WHERE
        (SELECT COUNT(*) FROM request_tracking_attempts
          WHERE ip_hash = ? AND created_at > ?) < 30
        AND
        (SELECT COUNT(*) FROM request_tracking_attempts
          WHERE email_hash = ? AND created_at > ?) < 10
    `
    : ipHash
      ? `
        INSERT INTO request_tracking_attempts (id, ip_hash, email_hash, created_at)
        SELECT ?, ?, NULL, ?
        WHERE (SELECT COUNT(*) FROM request_tracking_attempts
          WHERE ip_hash = ? AND created_at > ?) < 30
      `
      : `
        INSERT INTO request_tracking_attempts (id, ip_hash, email_hash, created_at)
        SELECT ?, NULL, ?, ?
        WHERE (SELECT COUNT(*) FROM request_tracking_attempts
          WHERE email_hash = ? AND created_at > ?) < 10
      `;
  const statement = db.prepare(insertSql);
  const result = ipHash && emailHash
    ? await statement.bind(
        crypto.randomUUID(), ipHash, emailHash, now,
        ipHash, windowStart, emailHash, windowStart,
      ).run()
    : ipHash
      ? await statement.bind(
          crypto.randomUUID(), ipHash, now, ipHash, windowStart,
        ).run()
      : await statement.bind(
          crypto.randomUUID(), emailHash, now, emailHash, windowStart,
        ).run();

  // The limit checks and attempt insertion share one SQLite statement, so
  // overlapping requests cannot all pass a stale pre-insert count.
  return Number(result.meta?.changes) === 1;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin tracking requests are not allowed." }, 403);
  }
  if ((request.headers.get("Sec-Fetch-Site") || "").toLowerCase() === "cross-site") {
    return json({ error: "Cross-origin tracking requests are not allowed." }, 403);
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

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Please submit tracking details using the website form." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8192) {
    return json({ error: "The tracking request is too large." }, 413);
  }

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 8192) {
      return json({ error: "The tracking request is too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Enter a valid reference number and email address." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Enter a valid reference number and email address." }, 400);
  }

  const reference = clean(body.reference, 40).toUpperCase();
  const email = clean(body.email, 254).toLowerCase();
  if (!reference || !email || !validEmail(email)) {
    return json({
      error: "Enter a valid reference number and the email address used for the request.",
    }, 400);
  }

  try {
    const allowed = await checkTrackingRateLimit(env.DB, request, email);
    if (!allowed) {
      return json({ error: "Too many tracking attempts. Please wait 15 minutes before trying again." }, 429, { "Retry-After": "900" });
    }
  } catch (error) {
    console.error("Unable to apply request tracking rate limit", error);
    return json({ error: "Request tracking is temporarily unavailable. Please try again later." }, 503);
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
