import { adminJson, clearAdminSessionCookie, requireAdmin } from "../../_utils/admin-auth.js";

export async function onRequestGet(context) {
  const accessReturn = new URL(context.request.url).searchParams.get("access_return") === "1";
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (accessReturn) {
    return new Response(null, {
      status: 303,
      headers: {
        "Location": "/admin?entry=1",
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  return adminJson({ ok: true, authorized: true });
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  return adminJson({ ok: true, authorized: true });
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  return adminJson({ ok: true, authorized: true });
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Set-Cookie": clearAdminSessionCookie(),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  return new Response(JSON.stringify({ ok: true, loggedOut: true }), { status: 200, headers });
}
