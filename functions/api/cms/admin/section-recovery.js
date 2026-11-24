import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const MAX_BODY_BYTES = 150_000;
const PAGE_SIZE = 10;

function clean(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseExpectedDraft(body) {
  const expectedDraftId = body.expectedDraftId === null || body.expectedDraftId === undefined
    ? null
    : typeof body.expectedDraftId === "string" && body.expectedDraftId.length <= 80
      ? body.expectedDraftId || null
      : undefined;
  const expectedDraftCreatedAt = body.expectedDraftCreatedAt === null || body.expectedDraftCreatedAt === undefined
    ? null
    : typeof body.expectedDraftCreatedAt === "string" && body.expectedDraftCreatedAt.length <= 64
      ? body.expectedDraftCreatedAt || null
      : undefined;
  if (expectedDraftId === undefined || expectedDraftCreatedAt === undefined ||
      (expectedDraftId && !expectedDraftCreatedAt) ||
      (!expectedDraftId && expectedDraftCreatedAt)) {
    return null;
  }
  return { expectedDraftId, expectedDraftCreatedAt };
}

async function purgeExpiredPayloads(db, enabled) {
  if (enabled !== "true") return;
  await db.prepare(`
    UPDATE cms_page_section_recovery
    SET status = CASE WHEN status = 'active' THEN 'discarded' ELSE status END,
      resolved_at = CASE WHEN status = 'active'
        THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE resolved_at END,
      resolved_by = CASE WHEN status = 'active' THEN 'retention' ELSE resolved_by END,
      section_json = '{}'
    WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND section_json <> '{}'
  `).run();
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const search = new URL(request.url).searchParams;
  const pageKey = clean(search.get("pageKey"), 60);
  if (!pageKey) return adminJson({ error: "A page key is required." }, 400);
  const cursorCreatedAt = search.get("cursorCreatedAt");
  const cursorId = search.get("cursorId");
  const hasCursor = cursorCreatedAt !== null || cursorId !== null;
  const parsedCursorDate = cursorCreatedAt ? Date.parse(cursorCreatedAt) : NaN;
  if (hasCursor &&
      (!cursorCreatedAt ||
       !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cursorCreatedAt) ||
       !Number.isFinite(parsedCursorDate) ||
       new Date(parsedCursorDate).toISOString() !== cursorCreatedAt ||
       !cursorId || cursorId.length > 80)) {
    return adminJson({ error: "Invalid removed-section page cursor." }, 400);
  }
  try {
    await purgeExpiredPayloads(env.DB, env.CMS_RECOVERY_RETENTION_ENABLED);
    const result = await env.DB.prepare(`
      SELECT id, page_key, draft_id, draft_created_at, original_index,
        section_json, status, created_at, expires_at, resolved_at
      FROM cms_page_section_recovery
      WHERE page_key = ? AND status = 'active'
        AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ${hasCursor ? "AND (created_at < ? OR (created_at = ? AND id < ?))" : ""}
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(
      pageKey,
      ...(hasCursor ? [cursorCreatedAt, cursorCreatedAt, cursorId] : []),
      PAGE_SIZE + 1
    ).all();
    const rows = result.results || [];
    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);
    const entries = pageRows.map((row) => {
      let section;
      try { section = JSON.parse(row.section_json); } catch {
        throw new Error("A removed-section entry contains invalid JSON.");
      }
      if (!isRecord(section)) {
        throw new Error("A removed-section entry contains invalid section data.");
      }
      return {
        id: row.id,
        pageKey: row.page_key,
        draftId: row.draft_id,
        draftCreatedAt: row.draft_created_at,
        originalIndex: row.original_index,
        section,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };
    });
    const lastRow = pageRows[pageRows.length - 1];
    return adminJson({
      ok: true,
      entries,
      hasMore,
      nextCursor: hasMore ? { createdAt: lastRow.created_at, id: lastRow.id } : null,
      pageSize: PAGE_SIZE,
      retentionDays: 30,
    });
  } catch (error) {
    console.error("CMS section recovery list failed", error);
    return adminJson({ error: "Unable to load removed sections." }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return adminJson({ error: "Submit JSON data." }, 415);
  }
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return adminJson({ error: "Recovery request is too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return adminJson({ error: "Invalid JSON body." }, 400);
  }
  if (!isRecord(body)) return adminJson({ error: "Invalid recovery request." }, 400);

  const action = clean(body.action, 24);
  const pageKey = clean(body.pageKey, 60);
  const entryId = clean(body.entryId, 80);
  const expected = parseExpectedDraft(body);
  if (!["remove", "prepare_restore", "discard"].includes(action) || !pageKey) {
    return adminJson({ error: "A supported recovery action and page key are required." }, 400);
  }
  if (!expected) return adminJson({ error: "Invalid expected draft snapshot." }, 400);

  let conflictSnapshot = null;
  try {
    const now = new Date().toISOString();
    await purgeExpiredPayloads(env.DB, env.CMS_RECOVERY_RETENTION_ENABLED);
    const page = await env.DB.prepare("SELECT id, published_version_id FROM cms_pages WHERE page_key = ? LIMIT 1")
      .bind(pageKey).first();
    if (!page) return adminJson({ error: "CMS page not found." }, 404);
    const draft = await env.DB.prepare(`
      SELECT id, created_at, content_json
      FROM cms_page_versions
      WHERE page_id = ? AND state = 'draft'
      LIMIT 1
    `).bind(page.id).first();
    if ((draft?.id || null) !== expected.expectedDraftId ||
        (draft?.created_at || null) !== expected.expectedDraftCreatedAt) {
      return adminJson({ error: "This page draft changed in another session. Reload the page before changing section recovery." }, 409);
    }

    conflictSnapshot = {
      pageId: page.id,
      action,
      entryId,
      expectedDraftId: expected.expectedDraftId,
      expectedDraftCreatedAt: expected.expectedDraftCreatedAt,
      sectionId: action === "remove" && isRecord(body.section) ? clean(body.section.id, 100) : null,
    };
    const actor = auth.email || null;
    if (action === "remove") {
      if (!isRecord(body.section) ||
          typeof body.section.id !== "string" ||
          !body.section.id.trim() ||
          body.section.id.length > 100 ||
          !Number.isInteger(body.originalIndex) ||
          body.originalIndex < 0 ||
          body.originalIndex > 80) {
        return adminJson({ error: "A valid removed section and original position are required." }, 400);
      }
      const activeEntry = await env.DB.prepare(`
        SELECT id
        FROM cms_page_section_recovery
        WHERE page_key = ? AND status = 'active'
          AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          AND json_extract(section_json, '$.id') = ?
        LIMIT 1
      `).bind(pageKey, body.section.id).first();
      if (activeEntry) {
        return adminJson({
          error: "This section already has an active recovery entry. Use the existing recovery entry instead of moving the section again.",
        }, 409);
      }
      const id = clean(body.entryId, 80) || crypto.randomUUID();
      const sectionJson = JSON.stringify(body.section);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      let savedContentJson = draft?.content_json || null;
      if (!draft) {
        if (!page.published_version_id) {
          return adminJson({ error: "The current saved page could not be verified before removing this section." }, 409);
        }
        const published = await env.DB.prepare(`
          SELECT content_json
          FROM cms_page_versions
          WHERE id = ? AND page_id = ? AND state = 'published'
          LIMIT 1
        `).bind(page.published_version_id, page.id).first();
        if (!published) {
          return adminJson({ error: "The current published page could not be verified before removing this section." }, 409);
        }
        savedContentJson = published.content_json;
      }
      let savedContent;
      try { savedContent = JSON.parse(savedContentJson); } catch {
        return adminJson({ error: "The current saved page contains invalid JSON. Reload it before removing a section." }, 409);
      }
      if (!isRecord(savedContent) || !Array.isArray(savedContent.sections) ||
          savedContent.sections.filter((section) => section?.id === body.section.id).length !== 1) {
        return adminJson({ error: "This section is not present exactly once in the current saved page. Reload it before removing the section." }, 409);
      }
      const results = await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO cms_page_section_recovery (
            id, page_key, draft_id, draft_created_at, original_index,
            section_json, status, created_by, created_at, expires_at
          )
          SELECT ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?
          WHERE (
            (? IS NULL AND ? IS NULL AND NOT EXISTS (
              SELECT 1 FROM cms_page_versions
              WHERE page_id = ? AND state = 'draft'
            ) AND EXISTS (
              SELECT 1 FROM cms_pages
              WHERE id = ? AND published_version_id IS ?
            ))
            OR EXISTS (
              SELECT 1 FROM cms_page_versions
              WHERE id = ? AND page_id = ? AND state = 'draft' AND created_at = ?
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM cms_page_section_recovery
            WHERE page_key = ? AND status = 'active'
              AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              AND json_extract(section_json, '$.id') = ?
          )
        `).bind(
          id, pageKey, expected.expectedDraftId, expected.expectedDraftCreatedAt,
          body.originalIndex, sectionJson, actor, now, expiresAt,
          expected.expectedDraftId, expected.expectedDraftCreatedAt, page.id,
          page.id, page.published_version_id || null,
          expected.expectedDraftId, page.id, expected.expectedDraftCreatedAt,
          pageKey, body.section.id
        ),
        env.DB.prepare(`
          INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
          SELECT ?, ?, CASE WHEN changes() = 1 THEN 'remove_section_recovery' END, 'page', ?, ?
        `).bind(
          crypto.randomUUID(), actor, page.id,
          JSON.stringify({ pageKey, entryId: id, sectionId: body.section.id })
        ),
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The section or page draft changed before recovery could be recorded. Reload the page and try again." }, 409);
      }
      if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The recovery entry may have been recorded, but its audit record could not be confirmed. Reload the page before retrying." }, 500);
      }
      return adminJson({
        ok: true,
        entry: {
          id, pageKey, draftId: expected.expectedDraftId,
          draftCreatedAt: expected.expectedDraftCreatedAt,
          originalIndex: body.originalIndex, section: body.section,
          createdAt: now, expiresAt,
        },
      }, 201);
    }

    if (!entryId) return adminJson({ error: "A recovery entry ID is required." }, 400);
    const entry = await env.DB.prepare(`
      SELECT id, section_json, status, expires_at,
        expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS is_unexpired
      FROM cms_page_section_recovery
      WHERE id = ? AND page_key = ?
      LIMIT 1
    `).bind(entryId, pageKey).first();
    if (!entry) return adminJson({ error: "Recovery entry not found for this page." }, 404);
    if (entry.status !== "active" || Number(entry.is_unexpired) !== 1) {
      return adminJson({ error: "This recovery entry has expired or was already resolved." }, 410);
    }

    let section;
    try { section = JSON.parse(entry.section_json); } catch {
      return adminJson({ error: "This recovery entry has invalid section data." }, 409);
    }
    if (!isRecord(section) || typeof section.id !== "string" || !section.id) {
      return adminJson({ error: "This recovery entry has invalid section data." }, 409);
    }

    if (action === "prepare_restore") {
      let savedContentJson = draft?.content_json || null;
      if (!draft && page.published_version_id) {
        const published = await env.DB.prepare(`
          SELECT content_json
          FROM cms_page_versions
          WHERE id = ? AND page_id = ? AND state = 'published'
          LIMIT 1
        `).bind(page.published_version_id, page.id).first();
        if (!published) {
          return adminJson({ error: "The current published page could not be verified. Reload it before restoring a section." }, 409);
        }
        savedContentJson = published.content_json;
      }
      if (savedContentJson) {
        let currentContent;
        try { currentContent = JSON.parse(savedContentJson); } catch {
          return adminJson({ error: "The current saved page contains invalid JSON. Reload it before restoring a section." }, 409);
        }
        if (!isRecord(currentContent) || !Array.isArray(currentContent.sections)) {
          return adminJson({ error: "The current saved page content is invalid. Reload it before restoring a section." }, 409);
        }
        if (currentContent.sections.some((item) => item?.id === section.id)) {
          return adminJson({ error: "This section is already present in the current page draft." }, 409);
        }
      }
      return adminJson({ ok: true, section });
    }

    const expectedId = expected.expectedDraftId;
    const expectedCreatedAt = expected.expectedDraftCreatedAt;
    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE cms_page_section_recovery
        SET status = 'discarded', resolved_at = ?, resolved_by = ?, section_json = '{}'
        WHERE id = ? AND page_key = ? AND status = 'active'
          AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          AND (
            (? IS NULL AND ? IS NULL AND NOT EXISTS (
              SELECT 1 FROM cms_page_versions
              WHERE page_id = ? AND state = 'draft'
            ))
            OR EXISTS (
              SELECT 1 FROM cms_page_versions
              WHERE id = ? AND page_id = ? AND state = 'draft' AND created_at = ?
            )
          )
      `).bind(
        now, actor, entryId, pageKey,
        expectedId, expectedCreatedAt, page.id,
        expectedId, page.id, expectedCreatedAt
      ),
      env.DB.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, CASE WHEN changes() = 1 THEN 'discard_section_recovery' END, 'page', ?, ?
      `).bind(
        crypto.randomUUID(), actor, page.id,
        JSON.stringify({ pageKey, entryId })
      ),
    ]);
    if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "This recovery entry or page draft changed. Reload the page before discarding it." }, 409);
    }
    if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The recovery entry may have been discarded, but its audit record could not be confirmed. Reload the page before retrying." }, 500);
    }
    return adminJson({ ok: true, resolved: true, status: "discarded" });
  } catch (error) {
    console.error("CMS section recovery action failed", error);
    if (
      conflictSnapshot &&
      typeof error?.message === "string" &&
      /NOT NULL constraint failed:\s*cms_audit_log\.action/i.test(error.message)
    ) {
      try {
        const latestDraft = await env.DB.prepare(`
          SELECT id, created_at FROM cms_page_versions
          WHERE page_id = ? AND state = 'draft' LIMIT 1
        `).bind(conflictSnapshot.pageId).first();
        const draftChanged =
          (latestDraft?.id || null) !== conflictSnapshot.expectedDraftId ||
          (latestDraft?.created_at || null) !== conflictSnapshot.expectedDraftCreatedAt;
        let recoveryConflict = false;
        if (conflictSnapshot.action === "remove" && conflictSnapshot.sectionId) {
          const duplicate = await env.DB.prepare(`
            SELECT id FROM cms_page_section_recovery
            WHERE page_key = ? AND status = 'active'
              AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              AND json_extract(section_json, '$.id') = ?
            LIMIT 1
          `).bind(pageKey, conflictSnapshot.sectionId).first();
          recoveryConflict = Boolean(duplicate);
        } else if (conflictSnapshot.action === "discard") {
          const currentEntry = await env.DB.prepare(
            "SELECT status FROM cms_page_section_recovery WHERE id = ? AND page_key = ? LIMIT 1"
          ).bind(conflictSnapshot.entryId, pageKey).first();
          recoveryConflict = !currentEntry || currentEntry.status !== "active";
        }
        if (recoveryConflict && conflictSnapshot.action === "remove") {
          return adminJson({
            error: "This section already has an active recovery entry. Use the existing recovery entry instead of moving the section again.",
          }, 409);
        }
        if (draftChanged) {
          return adminJson({ error: "The page draft changed in another session. Reload the page before trying again." }, 409);
        }
        if (recoveryConflict) {
          return adminJson({ error: "This recovery entry was already resolved. Reload the page before trying again." }, 409);
        }
      } catch (verificationError) {
        console.error("CMS section recovery conflict verification failed", verificationError);
      }
    }
    return adminJson({ error: "Unable to update the removed-section recovery entry." }, 500);
  }
}
