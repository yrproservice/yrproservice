import { adminJson, requireAdmin } from "../../_utils/admin-auth.js";

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
  // This endpoint confirms the caller's Access identity and lets the SPA exit
  // its local Admin workspace. It does not revoke Cloudflare Access tokens.
  return adminJson({
    ok: true,
    workspaceClosed: true,
    accessSessionActive: true,
  });
}
