import { adminJson } from "../../../_utils/admin-auth.js";
export async function onRequestGet(context) {
  if (!context.env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const key = new URL(context.request.url).searchParams.get("key");
  try {
    if (key) {
      const row = await context.env.DB.prepare(`
        SELECT v.value_json FROM cms_site_settings s
        JOIN cms_site_setting_versions v ON v.id=s.published_version_id
        WHERE s.setting_key=? AND v.state='published' LIMIT 1
      `).bind(key).first();
      return row ? adminJson({ ok:true, setting:{ key, value:JSON.parse(row.value_json) } }) : adminJson({ ok:false, error:"Published setting not found." },404);
    }
    const rows = await context.env.DB.prepare(`
      SELECT s.setting_key, v.value_json FROM cms_site_settings s
      JOIN cms_site_setting_versions v ON v.id=s.published_version_id
      WHERE v.state='published'
    `).all();
    const settings = {};
    for (const row of rows.results || []) settings[row.setting_key] = JSON.parse(row.value_json);
    return adminJson({ ok:true, settings });
  } catch (error) {
    console.error("CMS public settings read failed", error);
    return adminJson({ error:"Unable to load published settings." },500);
  }
}
