import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";
import { validatePageContent, validatePageRoute } from "../../../_utils/cms-content-validation.js";

const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/;
const MAX_CONTENT_BYTES = 100_000;

function clean(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (isRecord(value)) {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function withoutSectionOrder(section) {
  const payload = { ...section };
  delete payload.order;
  return payload;
}

function validPageInput(body) {
  const pageKey = clean(body.pageKey, 60);
  const title = clean(body.title, 120);
  const route = clean(body.route, 160);
  if (!KEY_PATTERN.test(pageKey)) return "Page key must use lowercase letters, numbers and hyphens.";
  if (!title) return "Page title is required.";
  const isExistingServicesRoute = pageKey === "services" && route === "/services";
  const routeError = pageKey === "home" && route === "/" || isExistingServicesRoute
    ? null
    : validatePageRoute(route);
  if (routeError) return routeError;
  const contentError = validatePageContent(body.content, pageKey === "team");
  if (contentError) return contentError;
  return null;
}

function getRecoveryEntryIds(body) {
  if (body.recoveryEntryIds === undefined) return { ids: [] };
  if (!Array.isArray(body.recoveryEntryIds) ||
      body.recoveryEntryIds.length > 80 ||
      !body.recoveryEntryIds.every((id) =>
        typeof id === "string" && id.length > 0 && id.length <= 80
      ) ||
      new Set(body.recoveryEntryIds).size !== body.recoveryEntryIds.length) {
    return { error: "Recovery entry IDs must be a unique array of valid IDs." };
  }
  return { ids: body.recoveryEntryIds };
}

function recoveryActiveGuard(recoveryEntryIds, pageKey) {
  if (!recoveryEntryIds.length) return { sql: "", binds: [] };
  const placeholders = recoveryEntryIds.map(() => "?").join(", ");
  return {
    sql: `
      AND (
        SELECT COUNT(*)
        FROM cms_page_section_recovery
        WHERE page_key = ? AND status = 'active'
          AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          AND id IN (${placeholders})
      ) = ?
    `,
    binds: [pageKey, ...recoveryEntryIds, recoveryEntryIds.length],
  };
}

async function validateRecoveryEntries(
  db, pageKey, recoveryEntryIds, content, currentContentJson
) {
  if (!recoveryEntryIds.length) return null;
  const placeholders = recoveryEntryIds.map(() => "?").join(", ");
  const result = await db.prepare(`
    SELECT id, section_json, status, expires_at
    FROM cms_page_section_recovery
    WHERE page_key = ? AND id IN (${placeholders})
  `).bind(pageKey, ...recoveryEntryIds).all();
  const rows = result.results || [];
  if (rows.length !== recoveryEntryIds.length) {
    return "A restored section no longer belongs to this page. Reload the page before saving.";
  }
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  let currentSections = [];
  if (currentContentJson) {
    try {
      const currentContent = JSON.parse(currentContentJson);
      if (!isRecord(currentContent) || !Array.isArray(currentContent.sections)) {
        return "The current saved page content is invalid. Reload it before restoring a section.";
      }
      currentSections = Array.isArray(currentContent?.sections) ? currentContent.sections : [];
    } catch {
      return "The current saved page content is invalid. Reload it before restoring a section.";
    }
  }
  for (const row of rows) {
    if (row.status !== "active" || row.expires_at <= new Date().toISOString()) {
      return "A restored section expired or was resolved in another session. Reload the page before saving.";
    }
    let restoredSection;
    try { restoredSection = JSON.parse(row.section_json); } catch {
      return "A restored section has invalid saved data and cannot be committed.";
    }
    if (!isRecord(restoredSection) || typeof restoredSection.id !== "string") {
      return "A restored section has invalid saved data and cannot be committed.";
    }
    if (currentSections.some((section) => section?.id === restoredSection.id)) {
      return "This section is already present in the current saved page. Reload the page before restoring it.";
    }
    const submittedSections = sections.filter((section) => section?.id === restoredSection.id);
    if (submittedSections.length !== 1 ||
        canonicalJson(withoutSectionOrder(submittedSections[0])) !==
          canonicalJson(withoutSectionOrder(restoredSection))) {
      return "The submitted page must contain the original recovered section. Save it before editing that section.";
    }
  }
  return null;
}

function addRecoveryResolutionStatements(db, statements, recoveryEntryIds, {
  pageKey, pageId, draftId, draftCreatedAt, contentJson, actor,
}) {
  for (const entryId of recoveryEntryIds) {
    statements.push(
      db.prepare(`
        UPDATE cms_page_section_recovery
        SET status = 'restored', resolved_at = ?, resolved_by = ?
        WHERE id = ? AND page_key = ? AND status = 'active'
          AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          AND EXISTS (
            SELECT 1 FROM cms_page_versions
            WHERE id = ? AND page_id = ? AND state = 'draft'
              AND created_at = ? AND content_json = ?
          )
      `).bind(
        new Date().toISOString(), actor, entryId, pageKey,
        draftId, pageId, draftCreatedAt, contentJson
      ),
      // A no-op resolution violates the audit action's NOT NULL constraint and rolls back the D1 batch.
      db.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, CASE WHEN changes() = 1 THEN 'restore_section_recovery' END, 'page', ?, ?
      `).bind(
        crypto.randomUUID(), actor, pageId,
        JSON.stringify({ pageKey, entryId })
      )
    );
  }
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "Submit JSON data.", status: 415 };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTENT_BYTES) return { error: "Page content is too large.", status: 413 };
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return { body };
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  try {
    const result = await env.DB.prepare(`
      SELECT p.id, p.page_key, COALESCE(d.title, pv.title, p.title) AS title,
        COALESCE(d.route, pv.route, p.route) AS route, p.published_version_id, p.updated_at,
        d.id AS draft_id, d.version_number AS draft_version, d.created_at AS draft_created_at, d.content_json AS draft_content,
        pv.version_number AS published_version
      FROM cms_pages p
      LEFT JOIN cms_page_versions d ON d.page_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_page_versions pv ON pv.id = p.published_version_id
      ORDER BY COALESCE(d.title, pv.title, p.title) COLLATE NOCASE
    `).all();
    return adminJson({ ok: true, pages: result.results || [] });
  } catch (error) {
    console.error("CMS page list failed", error);
    return adminJson({ error: "Unable to load CMS pages. Has the CMS migration been applied to this environment?" }, 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const parsed = await readBody(context.request);
  if (parsed.error) return adminJson({ error: parsed.error }, parsed.status);
  const body = parsed.body;
  const expectedDraftId = body.expectedDraftId === null || body.expectedDraftId === undefined
    ? null
    : typeof body.expectedDraftId === "string" && body.expectedDraftId.length <= 80
      ? body.expectedDraftId || null
      : undefined;
  const expectedDraftCreatedAt = body.expectedDraftCreatedAt === null || body.expectedDraftCreatedAt === undefined
    ? null
    : typeof body.expectedDraftCreatedAt === "string" && body.expectedDraftCreatedAt.length <= 64
      ? body.expectedDraftCreatedAt
      : undefined;
  if (expectedDraftId === undefined || expectedDraftCreatedAt === undefined ||
      (expectedDraftId && !expectedDraftCreatedAt)) {
    return adminJson({ error: "Invalid expected draft snapshot." }, 400);
  }
  const invalid = validPageInput(body);
  if (invalid) return adminJson({ error: invalid }, 400);
  const parsedRecoveryIds = getRecoveryEntryIds(body);
  if (parsedRecoveryIds.error) return adminJson({ error: parsedRecoveryIds.error }, 400);
  const recoveryEntryIds = parsedRecoveryIds.ids;

  const pageKey = clean(body.pageKey, 60);
  const title = clean(body.title, 120);
  const route = clean(body.route, 160);
  const content = JSON.stringify(body.content);
  const now = new Date().toISOString();
  const actor = auth.email || null;
  let conflictSnapshot = null;

  try {
    let page = await env.DB.prepare("SELECT id, published_version_id FROM cms_pages WHERE page_key = ? LIMIT 1")
      .bind(pageKey).first();
    if (!page && pageKey === "services" && route === "/services") {
      return adminJson({ error: "The existing Services page record could not be found. Reload the CMS page list before saving." }, 409);
    }
    const conflict = await env.DB.prepare(`
      SELECT p.id
      FROM cms_pages p
      LEFT JOIN cms_page_versions published ON published.id = p.published_version_id
      LEFT JOIN cms_page_versions draft ON draft.page_id = p.id AND draft.state = 'draft'
      WHERE (p.page_key = ? OR p.route = ? OR published.route = ? OR draft.route = ?)
        AND (? IS NULL OR p.id <> ?)
      LIMIT 1
    `).bind(pageKey, route, route, route, page?.id || null, page?.id || null).first();
    if (conflict) return adminJson({ error: "That page key or route is already assigned to another page." }, 409);

    if (!page) {
      if (recoveryEntryIds.length) {
        return adminJson({ error: "Recovery entries can only be committed to their existing CMS page." }, 409);
      }
      if (expectedDraftId || expectedDraftCreatedAt) return adminJson({ error: "The page changed or was removed. Reload the page list before saving." }, 409);
      const id = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_pages (id, page_key, title, route, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, pageKey, title, route, now),
        env.DB.prepare("INSERT INTO cms_page_versions (id, page_id, version_number, state, title, route, content_json, created_by, change_note, created_at) VALUES (?, ?, 1, 'draft', ?, ?, ?, ?, ?, ?)")
          .bind(versionId, id, title, route, content, actor, clean(body.changeNote, 240) || "Initial draft", now),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'page', ?, ?)")
          .bind(crypto.randomUUID(), actor, id, JSON.stringify({ pageKey, route }))
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[1]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The new page record or draft could not be confirmed. Reload the page list and inspect the item before retrying." }, 500);
      }
      if (Number(results?.[2]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The new page and draft may have been created, but the audit record could not be confirmed. Reload the page list and inspect the item before retrying." }, 500);
      }
      return adminJson({ ok: true, auditRecorded: true, pageId: id, draftId: versionId, draftCreatedAt: now, version: 1 }, 201);
    }

    const draft = await env.DB.prepare("SELECT id, version_number, created_at, content_json FROM cms_page_versions WHERE page_id = ? AND state = 'draft' LIMIT 1")
      .bind(page.id).first();
    conflictSnapshot = {
      pageKey,
      pageId: page.id,
      publishedVersionId: page.published_version_id || null,
      expectedDraftId,
      expectedDraftCreatedAt,
    };
    if ((draft?.id || null) !== expectedDraftId || (draft?.created_at || null) !== expectedDraftCreatedAt) {
      return adminJson({ error: "This page draft changed in another session. Reload it before saving again." }, 409);
    }
    let currentContentJson = draft?.content_json || null;
    if (recoveryEntryIds.length && !draft && page.published_version_id) {
      const published = await env.DB.prepare(`
        SELECT content_json
        FROM cms_page_versions
        WHERE id = ? AND page_id = ? AND state = 'published'
        LIMIT 1
      `).bind(page.published_version_id, page.id).first();
      if (!published) {
        return adminJson({ error: "The current published page could not be verified. Reload it before restoring a section." }, 409);
      }
      currentContentJson = published.content_json;
    }
    const recoveryError = await validateRecoveryEntries(
      env.DB, pageKey, recoveryEntryIds, body.content, currentContentJson
    );
    if (recoveryError) return adminJson({ error: recoveryError }, 409);
    const recoveryGuard = recoveryActiveGuard(recoveryEntryIds, pageKey);
    if (draft) {
      const statements = [
        env.DB.prepare(`
          UPDATE cms_page_versions
          SET title = ?, route = ?, content_json = ?, change_note = ?, created_by = ?, created_at = ?
          WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?
          ${recoveryGuard.sql}
        `).bind(
          title, route, content, clean(body.changeNote, 240) || "Updated draft",
          actor, now, draft.id, draft.created_at, draft.content_json,
          ...recoveryGuard.binds
        ),
        env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND changes() = 1 AND EXISTS (SELECT 1 FROM cms_page_versions WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?)")
          .bind(title, route, now, page.id, draft.id, now, content),
        // A failed draft or page update yields NULL for the required action column and rolls back the D1 batch.
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) SELECT ?, ?, CASE WHEN changes() = 1 AND EXISTS (SELECT 1 FROM cms_page_versions WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?) THEN 'update_draft' END, 'page', ?, ?")
          .bind(crypto.randomUUID(), actor, draft.id, now, content, page.id, JSON.stringify({ version: draft.version_number })),
      ];
      addRecoveryResolutionStatements(env.DB, statements, recoveryEntryIds, {
        pageKey, pageId: page.id, draftId: draft.id,
        draftCreatedAt: now, contentJson: content, actor,
      });
      const results = await env.DB.batch(statements);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
        return adminJson({
          error: recoveryEntryIds.length
            ? "The page draft or a recovery entry changed or expired. Nothing was saved; reload the page before trying again."
            : "This page draft changed in another session. Reload it before saving again.",
        }, 409);
      }
      if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The page record metadata update could not be confirmed. Reload the page and inspect its draft and route before retrying." }, 500);
      }
      if (Number(results?.[2]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The page draft audit record could not be confirmed. Reload the page before retrying; the draft update may have been applied." }, 500);
      }
      const resolvedRecoveryIds = [];
      for (let index = 0; index < recoveryEntryIds.length; index += 1) {
        const updateResult = results[3 + index * 2];
        const auditResult = results[4 + index * 2];
        if (Number(updateResult?.meta?.changes || 0) !== 1 ||
            Number(auditResult?.meta?.changes || 0) !== 1) {
          return adminJson({ error: "The draft was saved, but recovery completion could not be confirmed. Reload the page and recovery list before retrying." }, 500);
        }
        resolvedRecoveryIds.push(recoveryEntryIds[index]);
      }
      return adminJson({
        ok: true, auditRecorded: true, pageId: page.id,
        draftId: draft.id, draftCreatedAt: now, version: draft.version_number,
        resolvedRecoveryIds,
      });
    }

    const latest = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) AS version FROM cms_page_versions WHERE page_id = ?")
      .bind(page.id).first();
    const version = Number(latest?.version || 0) + 1;
    const versionId = crypto.randomUUID();
    const statements = [
      env.DB.prepare("UPDATE cms_page_versions SET state = state WHERE page_id = ? AND state = 'draft'").bind(page.id),
      env.DB.prepare(`
        INSERT INTO cms_page_versions (id, page_id, version_number, state, title, route, content_json, created_by, change_note, created_at)
        SELECT ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?
        WHERE changes() = 0
        ${recoveryGuard.sql}
        AND EXISTS (
          SELECT 1 FROM cms_pages
          WHERE id = ? AND published_version_id IS ?
        )
      `).bind(
        versionId, page.id, version, title, route, content, actor,
        clean(body.changeNote, 240) || "New draft", now,
        ...recoveryGuard.binds, page.id, page.published_version_id || null
      ),
      env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND changes() = 1")
        .bind(title, route, now, page.id),
      // A failed draft or page update yields NULL for the required action column and rolls back the D1 batch.
      env.DB.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, CASE WHEN changes() = 1 THEN 'create_draft' END, 'page', ?, ?
      `).bind(crypto.randomUUID(), actor, page.id, JSON.stringify({ version }))
    ];
    addRecoveryResolutionStatements(env.DB, statements, recoveryEntryIds, {
      pageKey, pageId: page.id, draftId: versionId,
      draftCreatedAt: now, contentJson: content, actor,
    });
    const results = await env.DB.batch(statements);
    if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
      return adminJson({
        error: recoveryEntryIds.length
          ? "The page or a recovery entry changed or expired. Nothing was saved; reload the page before trying again."
          : "A page draft was created in another session. Reload the page before saving again.",
      }, 409);
    }
    if (Number(results?.[3]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The new page draft audit record could not be confirmed. Reload the page list before retrying; the draft may have been created." }, 500);
    }
    const resolvedRecoveryIds = [];
    for (let index = 0; index < recoveryEntryIds.length; index += 1) {
      const updateResult = results[4 + index * 2];
      const auditResult = results[5 + index * 2];
      if (Number(updateResult?.meta?.changes || 0) !== 1 ||
          Number(auditResult?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The draft was saved, but recovery completion could not be confirmed. Reload the page and recovery list before retrying." }, 500);
      }
      resolvedRecoveryIds.push(recoveryEntryIds[index]);
    }
    return adminJson({ ok: true, pageId: page.id, draftId: versionId, draftCreatedAt: now, version, resolvedRecoveryIds }, 201);
  } catch (error) {
    console.error("CMS page draft save failed", error);
    if (
      conflictSnapshot &&
      typeof error?.message === "string" &&
      /NOT NULL constraint failed:\s*cms_audit_log\.action/i.test(error.message)
    ) {
      try {
        const latestPage = await env.DB.prepare(
          "SELECT id, published_version_id FROM cms_pages WHERE page_key = ? LIMIT 1"
        ).bind(conflictSnapshot.pageKey).first();
        const latestDraft = latestPage
          ? await env.DB.prepare(
              "SELECT id, created_at FROM cms_page_versions WHERE page_id = ? AND state = 'draft' LIMIT 1"
            ).bind(latestPage.id).first()
          : null;
        if (
          (latestPage?.id || null) !== conflictSnapshot.pageId ||
          (latestPage?.published_version_id || null) !== conflictSnapshot.publishedVersionId ||
          (latestDraft?.id || null) !== conflictSnapshot.expectedDraftId ||
          (latestDraft?.created_at || null) !== conflictSnapshot.expectedDraftCreatedAt
        ) {
          return adminJson({ error: "This page changed in another session. Nothing from this save was committed; reload the page before trying again." }, 409);
        }
      } catch (verificationError) {
        console.error("CMS page save conflict verification failed", verificationError);
      }
    }
    return adminJson({ error: "Unable to save page draft. Check that the CMS migration is applied and the page key/route are unique." }, 500);
  }
}
