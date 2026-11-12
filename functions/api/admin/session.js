import {
  adminJson,
  adminSessionCookie,
  clearAdminSessionCookie,
  ensureAdminSessionTable,
  getAdminSessionHash,
  requireAdmin,
} from "../../_utils/admin-auth.js";

const SESSION_TTL_SECONDS = 90;

function makeSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const row = await context.env.DB.prepare(
    "SELECT expires_at FROM admin_session_lock WHERE id = 1 LIMIT 1",
  ).first();
  return adminJson({
    ok: true,
    authorized: true,
    expiresAt: row?.expires_at ?? null,
  });
}

export async function onRequestPost(context) {
  // Cloudflare Access verifies the administrator identity. The lock itself is
  // acquired atomically below, before any other Admin API is allowed.
  const auth = await requireAdmin(context, { skipSessionLock: true });
  if (!auth.ok) return auth.response;
  const { DB } = context.env;
  if (!DB)
    return adminJson({ error: "Admin session storage is not configured." }, 503);

  try {
    await ensureAdminSessionTable(DB);
    const now = Math.floor(Date.now() / 1000);
    const existingHash = await getAdminSessionHash(context.request);
    const token = existingHash ? "" : makeSessionToken();
    const sessionHash = existingHash || await (async () => {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token),
      );
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    })();

    const result = await DB.prepare(`
      INSERT INTO admin_session_lock (id, session_hash, admin_email, expires_at, updated_at)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        session_hash = excluded.session_hash,
        admin_email = excluded.admin_email,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      WHERE admin_session_lock.expires_at <= ?
         OR admin_session_lock.session_hash = ?
    `).bind(
      sessionHash,
      auth.email,
      now + SESSION_TTL_SECONDS,
      now,
      now,
      sessionHash,
    ).run();

    if (!result.meta?.changes) {
      return adminJson({
        ok: false,
        code: "ADMIN_SESSION_IN_USE",
        error: "Admin is already active on another device. Only one device can use the Admin area at a time. Log out from the active device or wait up to 90 seconds for its session to expire.",
      }, 409);
    }

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    if (token) headers.set("Set-Cookie", adminSessionCookie(token));
    return new Response(JSON.stringify({
      ok: true,
      authorized: true,
      expiresAt: now + SESSION_TTL_SECONDS,
    }), { status: 200, headers });
  } catch (error) {
    console.error("Admin session acquisition failed", error);
    return adminJson({ error: "Unable to start an Admin session right now." }, 503);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const now = Math.floor(Date.now() / 1000);
  try {
    const result = await context.env.DB.prepare(`
      UPDATE admin_session_lock
      SET expires_at = ?, updated_at = ?
      WHERE id = 1 AND session_hash = ? AND expires_at > ?
    `).bind(
      now + SESSION_TTL_SECONDS,
      now,
      auth.sessionHash,
      now,
    ).run();
    if (!result.meta?.changes)
      return adminJson({ error: "Your Admin session has expired. Sign in again." }, 401);
    return adminJson({ ok: true, expiresAt: now + SESSION_TTL_SECONDS });
  } catch (error) {
    console.error("Admin session heartbeat failed", error);
    return adminJson({ error: "Unable to renew the Admin session." }, 503);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context, { skipSessionLock: true });
  if (!auth.ok) return auth.response;
  const sessionHash = await getAdminSessionHash(context.request);
  try {
    if (context.env.DB && sessionHash) {
      await ensureAdminSessionTable(context.env.DB);
      await context.env.DB.prepare(
        "DELETE FROM admin_session_lock WHERE id = 1 AND session_hash = ?",
      ).bind(sessionHash).run();
    }
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Set-Cookie": clearAdminSessionCookie(),
    });
    return new Response(JSON.stringify({ ok: true, loggedOut: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Admin logout failed", error);
    return adminJson({ error: "Unable to release the Admin session. It will expire automatically within 90 seconds." }, 503);
  }
}
