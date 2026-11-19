# YR Proservice — Phase G Media Administration Handover

Updated: 19 November 2026

## Repository safety checkpoint

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Previous handover-era checkpoint: `88e2cf0ec8ab1564a4935059c3d7ac77d7eb0071`.
- Latest functional source checkpoint reviewed in this continuation: `d4b363ddaa86f844bb8e7030065b648fb56dc69e` (Product, Settings, Services, Team and Visual Design Studio tab navigation safeguards). Recovery-document-only commits may advance the branch tip beyond this functional source checkpoint.
- Pull request: [#2 — Build YR Proservice Visual CMS foundation](https://github.com/yrproservice/yrproservice/pull/2)
- PR status: verified 19 November 2026 as Open, Draft, and unmerged, targeting `main`. The PR tracks `cms-development`; this handover refresh is committed to that branch. It must remain Draft and unmerged without explicit user approval.
- Production: untouched; do not merge or deploy.
- Preview-only D1/R2 CMS workflow remains the intended target.

The latest GitHub compare showed `cms-development` ahead of `main` and 0 commits behind. The ahead count changes as recovery-document commits are added; it is a branch-history comparison only, not merge approval. Review the full branch history and PR diff before any future merge; do not infer that the branch is safe to merge from a mergeable flag alone.

## Phase G media work completed in this continuation

1. Added guided media-reference editor links:
   - Product references open the current product editor when the product is loaded.
   - Setting references open the current setting editor.
   - Page references open the Visual Editor for the administrator to select the named page.
   - The UI explicitly explains that opening the current editor does not rewrite a historical revision.

2. Clarified reference report scope:
   - Counts are conservative URL-text matches across saved revisions.
   - Exact field paths are displayed for returned records only when a stored string exactly matches the media URL.
   - The report is limited to 50 revisions per content group; counts cover all URL-text matches.
   - Historical references continue to block archiving. This is intentional preservation behaviour.

3. Fixed archived-media usage inspection:
   - Usage inspection now passes `includeDeleted=1` for archived items.
   - Added request sequencing so a slower prior usage response cannot overwrite a newer media selection.
   - Changing the active/archived library view invalidates a pending usage request.

4. Added media lifecycle audit events:
   - Archive actions attempt to write an `archive_media` event to the existing `cms_audit_log`.
   - Restore actions attempt to write a `restore_media` event.
   - These use the existing audit table; no migration was added.
   - Audit writes are best-effort. If an audit insert fails after the archive/restore operation, the operation remains applied and the UI reports that the audit event could not be recorded.

5. Expanded per-item media activity history:
   - All activity, filename changes, alt-text changes, and archive/restore events can be filtered.
   - CSV export includes lifecycle event details as well as metadata changes.
   - Event action names are shown in the history list.

## Relevant commits

- `23fcd3b8eec5cfa813ba0a955c2d3d90ff67b0f5` — guided media reference editor links.
- `71c94de234c16e50381410b0c1cbb434219c3a0a` — media reference workflow styling.
- `f2c09302ca0905cdea376020b6c8b0b26bd38f97` — archived-media usage inspection and stale-response protection.
- `f37d5f0f1e6049d0d7411173101c794a76153e63` — archive and restore audit events.
- `77942fdf3a60125148d2242a67a3946fb7737e97` — surface audit outcomes in the CMS.
- `56bd67395d00250984ea3b850cd6b90b5a5ab33` — include lifecycle events in media history and CSV export.

## Additional Phase G continuation — product and page image workflows (19 November 2026)

Latest code changes after the original handover:

- Product image picker now distinguishes replacement of the primary image from replacement of a selected gallery image.
- Selected-state highlighting follows the actual replacement target, so the currently selected gallery image is not confused with the primary image.
- The picker searches catalogue images by filename, brand, category and folder, and uploaded Preview media by filename, alt text, MIME type and storage key.
- Search result counts and no-match states are shown.
- Product editor guidance identifies whether the editor is using an existing draft, a published baseline with no draft, or a new product. It explains that changes remain draft-only until explicitly published to Preview.
- Homepage section media picker now explicitly says that selecting an image changes the current page draft only; published page content is unchanged until publishing to Preview.
- Added responsive-compatible search field styling for the product image picker.

Relevant commits:
- `a6d82978584b5025a13c6491eef063e4ba5ab3a4` — clarify product image replacement targets.
- `2429bdb187fec7c9e0867c4cb1a54cea654392cf` — label product draft and published editing state.
- `ad2fcbf98b44dc63ff93ddfda3c182c25fc88848` — clarify homepage image changes are draft-only.
- `bae933a31171f85345691a18577f15dbdd0bb2f4` — add searchable product image library.
- `cb23e9058c277da470d414e0c139bc1238aaf017` — style searchable product media picker.

These are source-level changes only. Do not treat them as visually or functionally verified until Phase H.

## Additional Phase G continuation — structured editor publish safeguards (19 November 2026)

A source review of the Services, Team and product managers found a draft-state edge case: Services and Team only marked changes as unsaved after a draft already existed, and their publish handlers did not reject unsaved editor changes. The product manager also allowed the saved draft to be published while the JSON editor contained newer unsaved edits.

Focused safeguards added:

- Services Manager initializes its saved-content comparison from the original content baseline, so first-time edits are detected before the first draft exists.
- Team Manager applies the same baseline comparison.
- Both Services and Team publish handlers now reject publishing when the current editor content differs from the saved draft, and the existing saved-draft preview remains unavailable while edits are unsaved.
- Product Manager records the exact JSON snapshot associated with the loaded/saved draft. Publishing is blocked in both the handler and button state while the editor JSON differs from that snapshot.
- Product save and archive-draft save both refresh the product's saved snapshot. Loading a product establishes the comparison baseline.
- These safeguards do not alter published content, page templates, product data, media objects, database schema or Production.

Commits:
- `696ecf011a89d9023c1847d99271223fe63950d5` — guard Services publishing against unsaved edits.
- `a194b28919feca75eaa39c42a93f9d94fd71890b` — guard Team publishing against unsaved edits.
- `95f21b245b177b4917b81be1f7c10471c43c8cad` — prevent publishing stale product drafts.

Source review only; no runtime tests were performed. The next review should cover the Settings editor's saved-draft baseline and the remaining structured content managers before Phase H.

## Additional Phase G continuation — settings and editor publish safeguards (19 November 2026)

A follow-up source review extended the stale-draft publishing protection to the product and settings managers:

- Product editor now stores the exact JSON snapshot associated with the loaded or most recently saved draft. The Publish to Preview action is disabled and guarded when the current JSON differs from that saved snapshot.
- Product save and archive-draft save both update the saved snapshot; loading an existing product establishes the baseline.
- Settings editor now compares parsed JSON values (rather than raw whitespace formatting) against the currently saved draft. If the selected setting has unsaved edits, its Publish to Preview action is disabled and the handler rejects the publish attempt.
- Added a readable warning style for the settings unsaved-edits message.
- No setting or product data was changed by these source edits. No database schema, media, Production or deployment configuration was changed.

Additional commits:
- `75985efe993b4fce153b91e3887368a0aaba0987` — guard settings publishing against unsaved edits.
- `1c6f2609082c2e6f48a96b5ed7015a88370c7479` — style unsaved settings warning.

Together with the prior Services, Team and product safeguards, the current Phase G continuation now protects draft publishing across Services, Team, products, the Visual Editor and settings. This remains a source-level review only; no tests or builds were run.

## Additional Phase G continuation — visual design and gallery-target safeguards (19 November 2026)

Two further edge cases were addressed after reviewing the Visual Design Studio and product gallery picker:

- Page Visual Design Studio now blocks its Publish to Preview handler and disables the publish button whenever the design controls contain unsaved changes. The saved draft remains available for preview only after the edits are saved.
- Product gallery replacement mode is cancelled when a gallery image is moved or removed. This prevents an index-based replacement target from silently shifting to a different image after the gallery order changes.
- These are editor-state safeguards only; they do not change stored content or images.

Additional commits:
- `125d31f68a5595c9e9aa56260602de1b09b5bd19` — guard visual design publishing against unsaved edits.
- `ff045d8c4b02f1259fa71695aed6a98341396073` — keep gallery replacement target stable during edits.

## Additional Phase G continuation — homepage publishing clarity (19 November 2026)

A source review of the combined Visual Website Editor confirmed that it already blocks publishing while page edits or invalid structured JSON remain unsaved. However, its primary action was labelled only “Publish”, and its confirmation/notice copy referred to the “public website” without clearly identifying the environment.

- The action now reads “Publish to Preview”.
- The confirmation explicitly says the revision goes to the isolated Preview website only and Production will not be changed.
- Save and publish notices explicitly identify Preview and Production boundaries.
- No publishing API, database binding, data or deployment configuration was changed; this is UI wording only.

Commit:
- `66f91a6f9ebb7ad85e183b92933c4044b2310580` — label homepage publish action as Preview-only.

The homepage Visual Editor already had a handler-level unsaved-change guard and disabled the publish action for unsaved/invalid edits; this review confirmed and retained that protection. Source-level review only; no tests, builds, screenshots or image processing were performed.

## Additional Phase G continuation — page image-reference inspection and media search (19 November 2026)

A focused source review of the homepage Visual Website Editor found that its image-reference inspection request did not have request sequencing. If an administrator opened the reference report for one image and then changed the selected section or image before the first request returned, the older response could populate the report for the newer selection. This is now guarded:

- Each image-usage inspection gets a monotonically increasing request ID.
- Only the latest request may populate the usage report, surface its error, or clear its loading state.
- Changing the selected section invalidates any pending usage request and clears the previous report.
- Changing or clearing the selected image invalidates any pending request and clears stale report/loading state.
- Closing an open usage report also invalidates its request.
- Uploaded Preview media search now includes original filename, alt text, MIME type and R2 object key. The input hint matches the fields searched.
- A no-match message is shown when the uploaded media list is non-empty but the current search has no matches.
- Catalogue media search remains filename/brand/category/folder based.

Commits:
- `09becaeeac61f19c232739f9e9904b42998ba114` — protect page media usage inspection from stale responses and improve media search.
- `a06b2bbb5cdd94b76bb1a6f08867531924a356dd` — invalidate page media usage when the selected section changes.

Source-level checks confirmed request sequencing, invalidation on section/image changes, expanded search fields and the no-match state. No runtime tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — product gallery replacement target safety (19 November 2026)

A focused review of the structured product editor found that gallery replacement is index-based. Normal gallery move/remove controls already clear the target, but editing product JSON through another field or the advanced JSON editor could change the gallery while leaving the previous index selected. That could make the picker appear to target a different gallery image.

The editor now:
- Clears the pending gallery replacement target whenever the product JSON changes, so the target cannot silently carry over to a changed gallery.
- Validates the gallery index before applying a gallery-image update, rejecting negative, non-integer or out-of-range targets.
- Keeps primary-image editing separate from gallery-image replacement.

Commit:
- `f44156cb15c1cbd22afbd8a1f72d497d3d0b0e06` — reset gallery replacement target after product edits.

This was a source-level review and implementation only. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — Services hero media picker (19 November 2026)

A review of the dedicated Services content manager found that its hero image accepted a manually entered URL but did not provide the same direct Preview Media Library selection available in the Team manager. The Services manager already loads the Preview media list, so no API or database change was needed.

The Services hero image control now:
- Keeps the editable image URL field, preserving support for existing website assets and manually supplied paths.
- Provides a searchable Preview Media Library picker.
- Searches uploaded filename, alt text, MIME type and object key.
- Shows selected-media state and an empty/no-match message.
- Uses the existing Team media-picker layout classes to avoid introducing a new visual pattern.
- Continues to edit the Services draft only; publishing safeguards remain in place.

Commit:
- `98ac30dca653c5957c7f2b8fe7b28bafcba69acf` — add searchable Preview media picker to Services editor.

Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — Team media picker search (19 November 2026)

The Team manager already offered direct Preview Media Library selection, but it displayed every loaded item without search. Its picker now has the same search fields and no-match handling as the Services picker:

- Search by original filename, alt text, MIME type and object key.
- Preserve manual URL entry for existing website assets.
- Identify the selected image with both visual selected styling and `aria-pressed`.
- Lazy-load picker thumbnails.
- Show a clear no-match message without removing the manual URL option.

Commit:
- `c845023346f9170a828c202a403ec74ac8d48ddc` — add searchable media library to Team image picker.

No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — media history request sequencing (19 November 2026)

A focused source review found that opening one media item's activity history and then selecting another could allow the earlier network response to replace the newer selection's history. The history inspector now uses a monotonically increasing request ID:

- Selecting a different media item starts a new request generation.
- Only the latest request can update the displayed history, report an error, or clear the loading state.
- Closing the currently open history panel invalidates its pending request and clears its loading state.
- The change is limited to client-side request state; it does not modify media metadata, audit events, archived objects, or historical revisions.

Commit:
- `03bc16022be14b7015f0efe8f2016b0bb4cc72f6` — prevent stale media history responses.

Source-level review only. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — homepage media search clarity (19 November 2026)

The Homepage Visual Editor's uploaded-media search already filters by filename, alt text, MIME type and storage key. Its placeholder previously named only filename, alt text and storage key. The placeholder now also names file type, so the visible guidance matches the existing search behavior. No search logic, data loading, API or storage behavior changed.

Commit:
- `7f3dd0b3e916c99c0217a07b28bd8c03f1a1c6eb` — clarify homepage media search fields.

Source-level review only; runtime verification remains deferred to Phase H.

## Existing safeguards and limits retained

- Media library list: maximum 300 loaded records.
- R2 storage checks: on-demand only.
- Orphan scan: read-only, batch-limited, session-only and potentially partial.
- Media activity history: selected item only, maximum 50 events.
- Reference report: maximum 50 displayed revisions per content group.
- Archiving is blocked while saved content or revision history contains the media URL.
- Archived R2 objects are retained for recovery; restore checks object availability.
- No automatic bulk replacement, historical-revision rewriting, or object deletion was introduced.

## Additional Phase G continuation — structured product-content editor review (19 November 2026)

A source-only review was continued across the structured product editor, specification builder, document manager, and CMS product/settings manager.

Confirmed from the current source:
- Product fields, specifications, documents, primary image, gallery, and advanced JSON all feed the same product JSON draft; saving creates a CMS draft, while publishing is separately guarded against edits made after that saved snapshot.
- Specification rows preserve their existing string/object shape when edited, and document rows preserve their supported string/object shape. The editor retains unknown product metadata through the product-data merge helper.
- Product selection resets the child editor instance, and gallery replacement selection is cleared when the product JSON changes.
- Settings image references are surfaced from the currently open setting JSON and can be sent to the saved-reference report; arbitrary settings JSON remains an advanced structured editor rather than an unsafe automatic image rewrite tool.
- The specification/document fallback controls for unusual non-string/non-object row types accept JSON text but only commit a value when it parses and retains the original row type. This conservative behavior avoids silently changing data shape; a more guided raw-value editor can be considered during a later scoped improvement if those data shapes are confirmed in actual product records.

No source change was made in this review because changing the raw-value editing interaction without confirming real catalogue data and later Phase H verification would introduce avoidable risk. No product records, specifications, documents, settings, media objects, or historical revisions were changed.

Current repository checkpoint was refreshed from GitHub:
- Branch: `cms-development`
- Branch head: `a1d293f5ca13fa8e6c425d2d62425e6f9cbaf631`
- PR #2: Open, Draft, unmerged; head matches the branch head; base is `main`
- Production and deployment state were not changed.

## Additional Phase G continuation — Settings editor navigation safeguards (19 November 2026)

A narrow source change closes a draft-navigation gap in the Site Settings editor.

Changes in `src/pages/CMSManagement.jsx`:
- Track the baseline setting key and JSON value currently loaded into the editor.
- Treat either changing the setting key or editing its JSON as unsaved work, even when the newly typed key has no existing draft row.
- Warn and require confirmation before the saved-settings list or a media-reference shortcut replaces unsaved editor content.
- Include an explicit unsaved-change warning when restoring or deleting a saved settings draft would replace the currently edited setting.
- Keep the editor baseline aligned after saving a setting draft, restoring a setting revision, or deleting a setting draft and reloading the selected setting.
- Explain beside the setting-key field that changing the key is an unsaved edit and saving creates a draft under the new key.

This is a client-side navigation and draft-state safeguard only. It does not change API contracts, database schema, stored settings, published content, or historical revisions. No settings were edited or saved during this source change.

## Additional Phase G continuation — Visual Website Editor navigation safeguards (19 November 2026)

A source review identified that the Visual Website Editor could replace the current page draft when an administrator selected another page, loaded the Home template, or started a new page. The section inspector could also replace unapplied structured JSON edits when a different section was selected.

Focused safeguards were added in `src/pages/CMSDashboard.jsx`:
- Confirm before opening a different page when the current page contains unsaved or unapplied changes.
- Confirm before loading the Home template or starting a new page when the current page contains unsaved or unapplied changes.
- Confirm before switching the selected section when its structured JSON contains unapplied edits.
- Ignore a click on the already selected page, avoiding an unnecessary reload.
- Disable page-list navigation while a page request is busy.

These changes only protect editor navigation state. They do not modify API contracts, stored page content, media objects, database schema, published Preview content, Production or deployment configuration. No page drafts were saved or published during this source change.

Commit:
- `c964818bedba334ec4ee6e668bebe63baa5aeab0` — protect unsaved page and section edits during editor navigation.

Source review only. Runtime behaviour remains unverified and is deferred to Phase H.

## Additional Phase G continuation — Settings tab navigation protection (19 November 2026)

A source review found that the Settings editor correctly detected unsaved JSON/key changes and protected its own save, publish, restore and delete actions, but leaving the Settings tab through the CMS tab navigation could unmount the editor without a discard prompt.

Focused navigation protection was added in `src/pages/CMSManagement.jsx`:
- Centralised CMS tab changes through `changeManagerTab`.
- When leaving Settings with unsaved changes, the administrator is asked to confirm discarding them.
- The guard also covers internal shortcuts that navigate from Settings to Products or Media, including product/media reference actions.
- Product reference navigation now confirms before changing the selected product, so cancelling the tab change does not first replace the product editor selection.
- Switching tabs when Settings has no unsaved changes remains unchanged.

These changes are client-side editor safeguards only. No settings, product content, media objects, API contracts, database schema, Preview published content, Production or deployment configuration were changed.

Commits:
- `15e926ef5f03ebea4463d537997ace5dffd2f2b4` — confirm unsaved settings before leaving CMS tab.
- `6b3b3261aec5886c46854d12a02110b86d435ef3` — confirm settings navigation before changing product selection.

Source review only. Runtime behaviour remains unverified and is deferred to Phase H.

## Additional Phase G continuation — Services and Team tab navigation protection (19 November 2026)

The Settings tab guard exposed the same class of potential data loss in the Services and Team editors: both components already track whether the current content differs from the saved draft, but their local state is discarded when the parent CMS switches tabs.

Focused parent/child state reporting was added:
- `ServicesManager` reports its current unsaved state to the CMS parent.
- `TeamManager` reports its current unsaved state to the CMS parent.
- The central CMS tab-navigation guard asks for confirmation before leaving Services or Team when unsaved edits are present.
- The existing draft-save and publish safeguards remain in place; this change only adds navigation protection.
- No content, media, API contracts, database schema, Preview published content, Production or deployment configuration was changed.

Commits:
- `31cef90439311f7481318f670cb45bae52fb20ef` — report unsaved Services edits to CMS navigation.
- `4f2a85a623b52e725ad2f307d6988cefafe969d9` — report unsaved Team edits to CMS navigation.
- `5bbd1f2022a7e735effe79196cb620b45ab86c9d` — protect unsaved Services and Team edits during tab navigation.

Source review only. Runtime behaviour remains unverified and is deferred to Phase H.

## Additional Phase G continuation — Product tab navigation protection (19 November 2026)

The central CMS tab guard was extended to the product editor. It compares the current product JSON with the exact saved JSON snapshot already maintained by the product manager. When the Product tab has a selected product and the JSON differs from its saved snapshot, leaving the tab now requires explicit discard confirmation.

This is client-side navigation protection only. It does not change product data, save or publish anything, or modify API contracts, database schema, media objects, Preview published content, Production or deployment configuration.

Commit:
- `82f8638d1d1d589e581e7a2e197db2d4d52eb33b` — protect unsaved product edits during CMS tab navigation.

Source review only. Runtime behaviour remains unverified and is deferred to Phase H.

## Additional Phase G continuation — Visual Design Studio navigation protection (19 November 2026)

The CMS tab-navigation safeguards now also cover unsaved design-control edits in the embedded Visual Design Studio panels:
- `PageVisualDesignManager` reports its dirty state and page-design key to the CMS parent.
- Leaving the Products tab prompts if either the Products listing or Product details design editor has unsaved changes.
- Leaving the Services tab prompts if its Service details design editor has unsaved changes.
- Existing page-design save, publish and preview restrictions remain unchanged.

These are client-side navigation safeguards only. No design settings were saved or published by these changes, and no API, database schema, media, Preview published content, Production or deployment configuration was changed.

Commits:
- `a349a4a76440c08cbb1f555e749ff166a64ef959` — report Visual Design Studio dirty state to CMS navigation.
- `d4b363ddaa86f844bb8e7030065b648fb56dc69e` — protect unsaved visual design edits during CMS tab navigation.

Source review only. Runtime behaviour remains unverified and is deferred to Phase H.

## Verification boundary

No tests, builds, screenshots, visual checks, image processing, deployments, or database migrations were run in this continuation. Source-level inspection only was performed after the edits.

Defer all testing, builds, screenshots, image work, and final visual/functional checks until Phase H, as instructed.

## Next work

Continue Phase G by reviewing the remaining structured content and media-selection workflows in source only, without running them as tests now:
- Confirm that the product editor and Visual Editor replacement pickers make the selected media URL clear before saving.
- Ensure the current draft/published record can be updated without changing unrelated media references.
- Keep historical revisions immutable and explain why those references continue to block archiving.
- Review lifecycle audit entries and recovery messaging in Phase H verification.

Do not start Phase H until the remaining CMS implementation work is complete and the user explicitly directs the final verification stage.
