# YR Proservice — Phase G Media Administration Handover

Updated: 19 November 2026

## Repository safety checkpoint

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Previous handover-era checkpoint: `88e2cf0ec8ab1564a4935059c3d7ac77d7eb0071`.
- Latest functional source checkpoint reviewed in this continuation: `747d536c53f1086687e6e0156e61e31db84e6ea6` (Product, Settings, Services, Team and Visual Design Studio tab navigation safeguards, with stable dirty-state reporting). Recovery-document-only commits may advance the branch tip beyond this functional source checkpoint.
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

Additional implementation detail:
- The parent callback is memoized with `useCallback`, and the dirty-state setter returns the existing state object when the reported value is unchanged. This avoids repeated parent updates caused by recreating inline callbacks during rendering.

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

## Additional Phase G continuation — remaining page-design tab navigation protection (19 November 2026)

A source-only review of the CMS workspace mounts found six additional embedded Visual Design Studio instances that were not yet reporting unsaved state to the parent CMS tab navigator: shared site chrome, Product Cart, Dental Chair Request, Quotation Request, Service Request, and Track My Request.

The existing PageVisualDesignManager already exposes an optional dirty-state callback and reports the selected page key with its current unsaved state. The CMS parent now wires that callback to all six instances and checks the active workspace's page-design keys before allowing a tab change.

- Leaving Settings now also prompts when the shared header/footer design has unsaved changes, in addition to the existing settings JSON/key guard.
- Leaving Cart, Dental Chair Request, Quotation Request, Service Request, or Track My Request now prompts when that workspace's visual design has unsaved changes.
- The existing Products and Services page-design safeguards remain in place.
- No design values were saved or published. No page content, product data, media objects, API contracts, database schema, Preview published content, Production or deployment configuration was changed.

Commit:
- 1f64b01477bc4e9a9aa03f6b5f2dfcd65e6e3de5 — protect remaining CMS page design drafts during tab navigation.

Source inspection and targeted source edit only. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed. Runtime behaviour remains deferred to Phase H.

## Additional Phase G continuation — media metadata draft navigation protection (19 November 2026)

A further review of the Media Library found that filename and alt-text inputs keep local unsaved drafts until the administrator selects “Save descriptive metadata”. Switching to another CMS tab could unmount the Media Library and discard those edits without warning.

The CMS parent now derives a dirty-state flag from the currently loaded active media records and their filename/alt-text draft maps. Leaving the Media Library prompts before discarding any changed filename or alt-text value. Values that match the saved metadata do not trigger the prompt, and archived records remain outside this editing guard.

This protects only unsaved client-side metadata drafts. It does not write media metadata, alter media URLs or storage keys, add audit events, change API contracts or database schema, modify Preview published content, Production or deployment configuration.

Commit:
- 975caec5b59e489a65cb401d08bf81db68f3ebea — protect unsaved media metadata edits during CMS navigation.

Source inspection and targeted source edit only. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed. Runtime behaviour remains deferred to Phase H.

## Recovery checkpoint refresh — 19 November 2026

- Repository: yrproservice/yrproservice
- Working branch: cms-development
- Source implementation checkpoint: 975caec5b59e489a65cb401d08bf81db68f3ebea (media metadata navigation guard; includes the preceding page-design workspace safeguards).
- Branch head immediately before this documentation refresh: a438759ab6168226a8a47291566c3dffd591b1d0.
- PR #2: https://github.com/yrproservice/yrproservice/pull/2 — Open, Draft, unmerged; head matched cms-development; base main.
- Latest source-level review confirmed the six additional page-design callbacks and workspace-key guard, plus the Media Library filename/alt-text dirty-state guard.
- No tests, builds, screenshots, visual checks, image processing, deployments or migrations were run. No Production settings or content were changed.
- Resume by reviewing remaining source-only CMS workflows in small batches. Defer all runtime verification and image work until Phase H.

## Additional Phase G continuation — editor exit and product selection safeguards (19 November 2026)

A source-only review found several remaining ways to discard in-progress edits without changing CMS tabs:

- The Products workspace has two render paths (selected-product editor and catalogue workspace). The fallback catalogue workspace's Products listing and Product details Visual Design Studio instances were not wired to the parent dirty-state callback. Both now report their dirty state, so the existing Products tab guard covers either render path.
- Switching the selected product or starting a new product could replace the current product JSON draft without a confirmation. Product selection now no-ops when the same item is selected and asks before replacing a different product when the current JSON differs from its saved snapshot.
- Leaving CMS Management through its header links or browser navigation could unmount an editor without using the tab guard. The existing dirty-state checks are now shared through a current-tab leave confirmation, applied to both header exit links, and supplemented with a browser before-unload warning for unsaved changes in the active workspace. The static page-design key map is module-scoped so the effect does not depend on a newly allocated map each render.
- The Visual Website Editor had the same whole-workspace exit gap. Its Management Centre and Request Dashboard links now confirm against the existing page dirty-state check, and a before-unload warning covers browser navigation, reload or closing while page content or unapplied section JSON is dirty.

Commits:
- dc2835acba6f70ca1521b156485d104e6c636ca2 — keep product design dirty-state guard active in both editor layouts.
- 17efdf2915003fb71de762f175909a132279f6e8 — protect unsaved CMS edits when leaving the management workspace.
- e5ea4dd0d272c6ce13ffbfcc0ea7906b0d37f22a — protect unsaved product content when switching catalogue items.
- ade2a8b8997ac125818747bea14dddedef5ffb39 — keep CMS navigation dirty-state map stable outside component renders.
- efaf10d6ead3c55f9e01715c90e86737f72b7ea0 — protect unsaved visual editor changes when leaving the workspace.

Source-level checks confirmed the two Products editor render paths both report both page-design keys, CMS Management has its active-tab confirmation and browser-unload guard, product selection checks the saved JSON snapshot, and Visual Website Editor exit links and browser navigation use the page dirty-state guard. These are source checks only; no runtime behaviour has been verified.

No product content was changed or published. No media objects, database schema, API contracts, Preview published content, Production settings or deployment configuration were changed. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Additional Phase G continuation — media draft retention and product-content source review (19 November 2026)

A further source review examined ProductFormEditor, productEditorData, SpecBuilder and DocumentManager. The current structured editors use the existing product JSON as their source, preserve unexposed product properties through the merge helper, retain existing specification/document object key names and additional object properties, and restrict raw-row edits to the existing JSON value type. Array order/removal/addition remains explicit editor behaviour. Product image edits remain routed through the existing image-protection helper and the separate Preview draft workflow. No product content or catalogue data was modified in this review.

The media metadata dirty-state calculation was strengthened: it now evaluates the union of IDs with local filename/alt-text draft values, rather than only the currently loaded active media records. If a locally edited record is filtered out, archived, or absent from the capped loaded result, the CMS conservatively continues to treat its draft as unsaved and protects it during navigation. Saving metadata still clears that record's local draft entries.

Commit:
- 2f8510862a472611663f39a4369159f598c6fef3 — retain media metadata dirty-state protection for filtered records.

This was a source-level review and targeted edit only. It did not change product content, product schemas, media metadata, R2 objects, API contracts, database schema, Preview published content, Production or deployment configuration. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (latest)

- Repository: yrproservice/yrproservice
- Working branch: cms-development
- Latest functional source commit: 2f8510862a472611663f39a4369159f598c6fef3 (conservative media metadata dirty-state retention when a draft's record is filtered, archived, or absent from the capped loaded result).
- Latest branch head before this documentation refresh: c077a9e5b10eb653639cb617404f74fc2ab3d4ad.
- PR #2: https://github.com/yrproservice/yrproservice/pull/2 — Open, Draft, unmerged; PR head matched cms-development; base main.
- Source-level review covered CMS Management tab changes and whole-workspace exit, both Products render paths, product selection, Visual Website Editor exit, media metadata draft retention, and ProductFormEditor / productEditorData / SpecBuilder / DocumentManager shape-preservation paths.
- No tests, builds, screenshots, visual checks, image processing, deployments or migrations were run. Production and Preview published content were not changed.
- Resume on cms-development from the latest branch head. Continue source-only Phase G review in small batches; defer all runtime and image verification to Phase H.

## Additional Phase G continuation — destructive draft actions and local edit warnings (19 November 2026)

A source-only review found that deleting a saved Services, Team or page-design draft reloads the editor from saved content. If newer unsaved local edits existed, those edits would also be discarded, but the prior confirmation only described deleting the saved draft. The three editors now include the local unsaved edits in the confirmation message when applicable. No draft was deleted by this code change.

The product revision restore/delete flows also needed stronger coordination with the existing product-selection dirty guard. They now include current unsaved product JSON in the confirmation before the server-side restore/delete request. After confirmation, the refreshed product record is deliberately reloaded without a second prompt (including when it is the same selected product), preventing an already-completed server action from being followed by a stale local editor state or a second cancellation prompt. Product selection outside those confirmed refreshes retains its normal discard prompt.

The media-reference shortcut for settings now completes the CMS tab-leave guard before changing the selected setting key and editor JSON. This avoids partially switching settings behind the currently displayed tab if leaving that tab is cancelled due to another unsaved editor.

Commits:
- 9d5cce88aff311a62a7d698c87736cff79d0505e — warn before deleting Services draft with unsaved edits.
- 8011df3617871aebdb88dc6759b4dd29bb9c38f3 — warn before deleting Team draft with unsaved edits.
- 55ab1d6aa5cb7a77837fd644425669d6809e63ab — warn before deleting design draft with unsaved edits.
- 9e90189eac6bf6ffab4ccdabdacf1d59d229ce81 — guard product revision actions and order settings reference navigation safely.
- 0eb53ed27cd9562e89da403095e076239033d932 — avoid a second product discard prompt after confirmed draft deletion.
- c84cefba523bd073782cdff5d2c5cdc9add75ea0 — reload product after confirmed restore or draft deletion.

Source-level checks confirmed all three conditional delete warnings, pre-request product restore/delete confirmations, deliberate refreshed-product reload after confirmation, and safe settings-reference navigation ordering. No live draft or published record was modified by this work. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (destructive draft safeguards)

- Repository: yrproservice/yrproservice
- Working branch: cms-development
- Latest functional source checkpoint: c84cefba523bd073782cdff5d2c5cdc9add75ea0 (product reload after confirmed revision restore or draft deletion; includes conditional unsaved-edit warnings for Services, Team and Visual Design Studio draft deletion, and coordinated CMS product/settings revision actions).
- Branch head before this recovery-document refresh: 9c1e80671236eb5e3d5624ffdec9fe9079b62fa8.
- PR #2: https://github.com/yrproservice/yrproservice/pull/2 — Open, Draft, unmerged; PR head matched cms-development; base main.
- Source-level checks passed for the new destructive-action warnings, pre-request product confirmation, confirmed product reload without a second prompt, and settings-reference navigation order.
- No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed. Production and Preview published content remain untouched.
- Resume on cms-development from the branch head. Continue small source-only Phase G reviews; reserve runtime and image verification for Phase H.

## Additional Phase G continuation — media lifecycle and product archive safeguards (19 November 2026)

A source review of the Media Library lifecycle found two draft-safety and request-state edges. First, an active image could be archived while its filename or alt-text editor contained unsaved local changes. The archive handler now refuses to start until those metadata edits are saved or reverted, and also reports if the selected media record is no longer in the loaded library. This avoids moving a record out of the active list while leaving its descriptive edits stranded in a local draft.

Second, the Show archived media toggle previously made a direct asynchronous request without handling failure or distinguishing overlapping requests. The media list now uses a monotonically increasing request ID shared by normal refreshes and the archive-view toggle. Stale responses are ignored; if the current toggle request fails, the checkbox is restored to its previous value and an error is shown while the already loaded list remains intact.

The product archive confirmation now explicitly states when the current unsaved product edits will be included in the newly created archive draft. The archive remains a draft operation: the product is removed from the public catalogue only after that archive draft is separately published to Preview.

Commits:
- a0fad029bbcbfd600df8b80ded88fb6925c25ba9 — prevent archiving media with unsaved descriptive metadata.
- 3c7026b8b4ff2f3092de5f1b67cb2e627f60cc71 — guard media archive view against stale and failed requests.
- aeda44741a638a0f87c75313b36d00000dbadb9b — clarify unsaved product edits included in archive draft.

Source-level assertions confirmed the media archive block, request identity checks, failure recovery for the archive toggle, and product archive confirmation. These checks do not establish runtime behaviour. No media records, product records, R2 objects or published content were changed. No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (media lifecycle safeguards)

- Repository: yrproservice/yrproservice
- Working branch: cms-development
- Latest functional source checkpoint: aeda44741a638a0f87c75313b36d00000dbadb9b (media archive blocked while descriptive metadata is unsaved; archive-view requests are race/failure guarded; product archive confirmation explains inclusion of unsaved edits).
- Branch head before this recovery-document refresh: 6b25d24fa38d38b16fe065ed1be04c5e084e9ea6.
- PR #2 remains Open, Draft and unmerged, based on main. Confirm its head against the branch before resuming after an interruption.
- Source-level checks passed for media archive protection, shared request-ID handling across media refresh/toggle, toggle failure recovery, and product archive confirmation.
- No tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed. Production, Preview published content, product records, media records and R2 objects were not changed.
- Resume from the latest cms-development branch head. Continue small source-only Phase G reviews; defer all runtime and image verification to Phase H.

## Additional Phase G continuation — settings reference confirmation clarity (19 November 2026)

A source review of the Media Library reference shortcuts found that opening a referenced setting could show two consecutive discard confirmations when the Settings tab was already active: the shortcut's setting-specific confirmation was followed by the shared tab-leave guard, even though no tab change was occurring.

- The shortcut now invokes the shared tab-leave guard only when it actually needs to switch into the Settings tab.
- When already in Settings, the setting-specific confirmation is the only prompt before replacing the current editor content.
- When switching from another tab, the existing guard for that current tab remains in force.
- No settings, media, content, database schema, deployment configuration or Production data were changed.

Commit:
- `f34cc9146e20ff896e68cbf42263e023f7fd1a1f` — avoid duplicate confirmation when opening a settings media reference.

Source review only. No tests, builds, screenshots, image processing, visual checks, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026

- Latest branch: `cms-development`
- Latest source commit: `f34cc9146e20ff896e68cbf42263e023f7fd1a1f`
- PR #2: Open, Draft, unmerged; base `main`; head `cms-development`.
- Production remains untouched. Do not merge, deploy, or run migrations.
- Continue source-only Phase G review in small batches. Phase H remains the point for tests, builds, responsive/accessibility checks, screenshots, image processing and final Preview verification.
- If interrupted, resume by reading this handover first, confirming the current branch head and PR state, then inspect the next unreviewed CMS workflow before editing.

## Additional Phase G continuation — safe recovery after Services/Team draft deletion (19 November 2026)

A source review of the Services and Team managers found that, after a successful draft deletion, a failed follow-up request to reload the published page was silently treated as a reason to replace the editor with the original template. That could make a template look like the published baseline and invite an administrator to save unintended content.

Both managers now:
- Clear the deleted draft identifier immediately after the delete API confirms success.
- Reload the published page content explicitly and use it as the new editor baseline only when the response contains page content.
- If that reload fails or returns no page content, preserve the current editor contents, mark the manager as requiring a reload, and block further draft saves until the manager is reloaded.
- Show a clear message that the draft deletion succeeded but the published content could not be reloaded.
- Do not silently substitute the template after a successful deletion when the published-content refresh is unavailable.

Commits:
- `8b41b9f94cf36f0659da71d553007b847931ff02` — protect Services editor when deleted draft content cannot be reloaded.
- `636454fc3f57b812c305ad20101210caa3d23a37` — protect Team editor when deleted draft content cannot be reloaded.

Source-level inspection only. No tests, builds, screenshots, image processing, visual checks, deployments, migrations or data changes were performed.

A follow-up check extended the same save protection to initial content loading:

- If the Services or Team manager cannot load its starting content, it now enters the same reload-required state and blocks draft saves.
- A genuine “Page not found” response remains an allowed first-draft path; other load failures cannot leave the template accidentally saveable over existing content.

Commits:
- `b2c0669f4ffe1e202549fbc75c75852e5fc6fac2` — block Services draft saves when initial content loading fails.
- `cbe455cfa9215f00e725c9f04b0c607be8ebb5ab` — block Team draft saves when initial content loading fails.

## Additional Phase G continuation — prevent saving fallback templates after content-load failures (19 November 2026)

A further source-only review found that some managers could still expose Save while their initial data request had failed, leaving only an in-memory template/default value in the editor. Saving at that point could create a draft from fallback content instead of the current saved content.

Safeguards added:
- Services and Team now enter a reload-required state if their initial content/media loading sequence fails. Draft saving is blocked until the manager is reloaded. A genuine “Page not found” response remains a supported first-draft path.
- The Page Visual Design Studio tracks whether its initial settings load failed and blocks saving default design values until settings can be loaded successfully.
- CMS Management now requires a successful initial settings load before saving a setting draft. This prevents the default navigation JSON from being saved over existing settings when the initial settings request has not succeeded.
- These guards do not change existing published content or create drafts.

Commits:
- `b2c0669f4ffe1e202549fbc75c75852e5fc6fac2` — Services initial content-load failure guard.
- `cbe455cfa9215f00e725c9f04b0c607be8ebb5ab` — Team initial content-load failure guard.
- `bf957faabc2b7128637334b168d1513bd52ec059` — Visual Design Studio settings-load save guard.
- `e5f1a420791fdebe97205705a6bbb4712adbf662` — CMS setting save requires loaded settings.

Source-level review only. No tests, builds, screenshots, image processing, visual checks, deployments, migrations or data changes were performed.

## Recovery checkpoint refresh — 19 November 2026 (continued)

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Latest functional source commit in this continuation: `e5f1a420791fdebe97205705a6bbb4712adbf662`.
- Latest branch head before this checkpoint refresh: `5e9d1fa52bb9152b151378cc3c3b76bb69adbc8a`.
- PR #2: Open, Draft, unmerged; base `main`; head `cms-development`. The latest PR head was verified to match the branch before this documentation-only checkpoint update.
- Production remains untouched. No merge, deployment, migration or Preview publish was performed.
- Work completed in this continuation: removed duplicate Settings-reference discard prompts; prevented Services/Team draft deletion recovery from silently substituting templates when published content cannot be reloaded; blocked Services/Team saves after initial load failures; blocked Visual Design Studio saves if settings failed to load; required successfully loaded settings before saving CMS setting drafts.
- Source-only review and source assertions were performed. No tests, builds, screenshots, image processing, visual checks or runtime verification were performed.
- Resume by confirming branch head and PR state, reading this handover, then reviewing remaining unreviewed CMS data-loss paths. Keep changes small and targeted. Phase H remains the only stage for tests/builds/images/visual verification.

## Additional Phase G continuation — Visual Design Studio mutation/refresh separation (19 November 2026)

Source review found that a successful server-side save, publish or draft deletion could be followed by a failed settings-list refresh. The previous combined try/catch could then display a generic operation-failed message even though the server mutation had already succeeded. After deletion, the stale draft identifier could also remain in editor state.

Updated `src/pages/PageVisualDesignManager.jsx`:
- `loadSettings()` now marks settings as unavailable when its request fails; the existing save guard then blocks further saves until a successful reload.
- After a successful draft deletion, the local draft ID/version are cleared before attempting the refresh. If refresh fails, the UI reports that deletion succeeded and explicitly requires a reload before further edits.
- Successful save and Preview publish operations retain their success state if the subsequent settings refresh fails; the error message now distinguishes the completed mutation from the failed refresh.
- No page design, settings values, published content or database records were changed.

Commit:
- `c958f14654d4a39486a3d8022cc80e7cf368ca9b` — separate Visual Design Studio save actions from settings refresh failures.

Source-level assertions confirmed the success/failure messaging and delete-state ordering. No tests, builds, screenshots, image processing, visual checks, deployments or migrations were performed.

## Additional Phase G continuation — CMS mutation success and refresh-failure recovery (19 November 2026)

Source review found several CMS operations where the server mutation could succeed but the subsequent list refresh could fail inside the same try/catch. The UI could then report that the save/publish/restore/delete failed even though the server had already completed it. Some destructive draft operations could also leave stale editor selection active.

Updated `src/pages/CMSManagement.jsx`:
- Product draft save and archive-draft save now retain their success state and report a separate product-list refresh error if the follow-up refresh fails.
- Product Preview publish now reports successful publication separately from a failed product-list refresh; the editor selection is cleared before refreshing.
- Settings draft save and Preview publish similarly distinguish completed server actions from failed settings refreshes. A failed refresh marks settings unavailable so the existing settings save guard prevents further writes until a successful reload.
- Revision restore now reports when the restore succeeded but its editor/list refresh failed. If the currently selected product cannot be refreshed, that stale product selection is cleared. Failed settings refresh marks settings unavailable.
- Draft deletion clears the currently selected product editor before refreshing when its own draft was deleted. If a settings draft was deleted from the active settings editor, the local setting value is invalidated and settings saves are blocked until refresh succeeds. A failed post-delete refresh is reported as a completed deletion plus a reload requirement, rather than as a failed deletion.
- Product deletion refresh continues to select the refreshed product row (or clear the editor if no published/draft record remains), preserving the existing selection behaviour.

Commits:
- `dabfd1efe9b4486a16e9abb5b1e941ff525674af` — distinguish completed product/settings mutations from refresh failures.
- `0a98cd36c6d50a6e4779cdbd24ecb6c150dc2996` — protect revision restore and draft deletion from stale editor refresh state.
- `40bf819af923f2401a5102f715f7a3603aab8a54` — preserve product selection refresh after draft deletion.
- `8df6ead3f1b34a770985df8ce3df896a1cd29e13` — block stale product/settings editors after revision restore refresh failures.

Source-level review only. No tests, builds, screenshots, image processing, visual checks, deployments, migrations or data changes were performed.

## Recovery checkpoint refresh — 19 November 2026 (latest continuation)

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Latest functional source commit in this continuation: `8df6ead3f1b34a770985df8ce3df896a1cd29e13`.
- Latest documentation commit before this checkpoint refresh: `df442914fe42c38f834485ad7658a80980929db9`.
- PR #2 was checked after the source changes: Open, Draft, unmerged; base `main`; head `cms-development`. PR head matched `df442914fe42c38f834485ad7658a80980929b9` at the time of that check.
- Production remains untouched. No merge, deployment, Preview publish or migration was performed.
- Current continuation addressed: Visual Design Studio save/publish/delete refresh-failure handling; CMS Management product save/archive/publish and settings save/publish refresh-failure messaging; revision restore/delete stale-editor recovery.
- Source assertions confirmed the targeted guards and messages are present. This is not runtime verification.
- No tests, builds, screenshots, image processing, visual checks or deployments were run, as requested.
- If interrupted, resume by confirming the current branch head and PR #2 state, then read this handover. Continue source-only inspection in small batches; do not begin Phase H verification until the final stage.

## Additional Phase G continuation — media refresh recovery and Visual Editor page-load safeguards (19 November 2026)

A source-only review identified two more recovery edges:

- Media upload, archive and restore requests could succeed on the server, then be caught as generic operation failures if the follow-up Media Library refresh failed. The UI now reports the media mutation as successful and separately explains that the library refresh failed and the administrator must reload before continuing. Archive/restore usage-inspection state is cleared immediately after the successful archive action, independent of refresh outcome.
- The Visual Website Editor previously treated an empty page list after an initial load failure like a genuinely empty site. The Home-template and New-page actions could therefore be started before the existing page list had been loaded successfully.
- The Visual Editor now tracks whether its page list is ready. Creating a page, loading the Home template, saving a draft and publishing are guarded until the current page list loads successfully. The Home-template handler also refuses to start if a Home page already exists.
- Page-list requests now use request sequencing so a stale response cannot overwrite a newer successful result or reset the readiness state after a newer request has completed.

Commits:
- 491b1f1edb20153791fdf6d83ead437985e79168 — distinguish media upload/archive/restore success from Media Library refresh failures.
- 407c983be3b517c393cd548f2005dcede6a64d66 — require a successfully loaded page list before Visual Editor page mutations.
- 21d1ad85af4779da38b22819ce01ee186f9ab1f2 — ignore stale Visual Editor page-list refresh responses.

No media objects, media metadata, product/page content, published content, database schema, deployment configuration or Production data were changed by these source edits. Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (media and Visual Editor safeguards)

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Latest source checkpoint: `21d1ad85af4779da38b22819ce01ee186f9ab1f2`.
- PR #2 must remain Open, Draft and unmerged, targeting `main`. Confirm the PR head against the branch before resuming after an interruption.
- Production remains untouched. Do not merge, deploy, publish to Preview or run migrations.
- Latest continuation addressed media mutation/refresh separation and Visual Website Editor page-list readiness plus stale-response protection.
- Source-only review; no tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.
- Resume by confirming the branch head and PR state, then continue small source-only reviews of remaining CMS workflows. Keep Phase H as the final stage for runtime, image and visual verification.

## Additional Phase G continuation — Services and Team initial-loading interaction guards (19 November 2026)

A follow-up review found a narrow timing gap in the Services and Team managers. Their initial page-content and media requests already entered a reload-required state after a failure, but the editor controls were still interactive while those requests were pending. An administrator could edit the in-memory template before the real page content arrived, only for the successful initial response to replace those edits.

Both managers now:
- Track whether the current page content and media have completed their initial load.
- Ignore structured content and design updates until the load succeeds; a failed load remains blocked by the existing reload-required state.
- Disable Save, Publish, Delete Draft, and Restore Original Content actions until the editor is ready.
- Guard the save, publish, delete and reset handlers themselves, rather than relying only on disabled buttons.
- Continue to allow the established first-draft path when the server genuinely reports that the page does not yet exist and the media load succeeds.

Commits:
- f75c8eac77eccbff23a513ba5956c8e27a8cceee — prevent Services edits and draft actions before initial content/media load completes.
- 4f1b530568374095ed2cd53336de26affde42588 — prevent Team edits and draft actions before initial content/media load completes.
- 46ce784ed3f5a52b80a5f2046934e5ed498f3ed3 — add Services handler-level publish/delete readiness guards.
- 80fbdb2b5494e3a92b2d012cfc069a6951e7130f — add Team handler-level publish/delete readiness guards.

No Services or Team content, media, drafts, published pages, database schema, deployment configuration or Production data were changed by these source edits. Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (Services and Team load readiness)

- Working branch: `cms-development`
- Latest source work: Services and Team editors now block user edits and draft actions until the initial content/media load has completed successfully.
- PR #2 must remain Open, Draft and unmerged. Verify its head matches the branch before resuming.
- Production remains untouched. No Preview publishing, deployments, migrations or tests were performed.
- Continue source-only Phase G review in small batches. Defer all runtime, responsive, accessibility, security and image verification to Phase H.

## Additional Phase G continuation — product catalogue load readiness and import recovery (19 November 2026)

A source review of CMS Management found that the Product tab initially displayed an empty product list while its first API request was still pending. If that request failed, the Add Product and catalogue import actions could still be attempted against an incomplete view of existing records.

Updated `src/pages/CMSManagement.jsx`:
- Added a product-list readiness state. Product selection, Add Product, Save, Archive, Publish, revision restore, product-draft deletion and catalogue import are guarded until the product list has loaded successfully.
- The product list's refresh requests are sequenced. Older responses cannot overwrite newer product data or incorrectly restore readiness after a newer request.
- A failed post-mutation refresh leaves product actions blocked until the list is successfully reloaded, avoiding further work against stale product rows.
- Revision restore now uses the same sequenced product-list refresh before selecting the restored product draft.
- Catalogue import now distinguishes a completed import from a failed list refresh. If the import stops partway through, it reports how many drafts were created and still attempts a refresh. If all imports succeed but the refresh fails, the UI reports that all drafts were created and requires a reload. The partial-import recovery path also releases the busy state.
- Catalogue import is disabled while the list is unavailable or another CMS action is busy.

Commits:
- cfd46ce212272b8f0d78061ce143a1d3e0268dde — require a loaded product list before CMS product actions and sequence refresh requests.
- e08673212c6f2646070b493023c7fa47eddda362 — distinguish catalogue import outcomes from list-refresh failures.
- 2fc04e9eaaa8f4a6fc6873b957bc49e0b96f66d1 — ensure a partial import releases the busy state.
- 8713ca67ab37e0a6c19f1860eaf60dd0d9b5cf08 — disable catalogue import until the product list is ready.

No product records, product drafts, published catalogue content, media, database schema, deployment configuration or Production data were changed by these source edits. Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (product list readiness)

- Working branch: `cms-development`
- Latest product workflow source commit: `8713ca67ab37e0a6c19f1860eaf60dd0d9b5cf08`.
- Product list readiness and refresh sequencing are now shared by normal product actions, revision restore and catalogue import.
- PR #2 must remain Open, Draft and unmerged; confirm its head matches the branch after any interruption.
- Production remains untouched. No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.
- Resume by reading this handover, checking branch/PR state, and continuing small source-only reviews. Phase H remains the final verification stage.

## Latest recovery checkpoint — 19 November 2026

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Product workflow source commit: `8713ca67ab37e0a6c19f1860eaf60dd0d9b5cf08`.
- Latest recovery-document commit before this checkpoint refresh: `2a3b35cb572da922c27fcde483c63687386be7c3`.
- PR #2: Open, Draft, unmerged, targeting `main`. Its head was verified to match the branch after the source and documentation changes.
- Continue only on `cms-development`. Do not merge PR #2, deploy, publish content to Preview, change Production, or run migrations without explicit authorization.
- Recent source-only safeguards now cover media mutation/refresh separation; Visual Editor page-list readiness and request sequencing; Services and Team initial-load readiness; and Product list readiness, refresh sequencing, revision actions and partial catalogue-import recovery.
- No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were run in this continuation.
- On resumption: read this handover, verify the current branch and PR head, then continue the remaining source-only CMS workflow review in small batches. Defer all runtime, image, responsive, accessibility, security and final Preview verification to Phase H.

## Additional Phase G continuation — settings refresh sequencing and stale revision protection (19 November 2026)

A source-only review found that CMS Management's settings refresh did not have the same request sequencing used for the product list. Revision restore and draft deletion also fetched settings directly, bypassing the shared refresh path. After a refresh failure, some settings revision actions could still be invoked from stale rows.

Updated `src/pages/CMSManagement.jsx`:
- Settings-list requests now have a request sequence. Older responses cannot overwrite a newer result.
- Settings readiness is cleared while the current refresh is pending and remains false after a failed current request; only the latest successful response restores readiness.
- Settings revision restore and settings draft deletion now use the shared sequenced refresh path rather than direct uncoordinated fetches.
- Product draft deletion likewise uses the shared sequenced product refresh path.
- Settings revision restore, settings draft deletion and settings Preview publishing are blocked unless the settings list is current and successfully loaded.
- Existing successful mutation messages and post-mutation refresh recovery remain intact.

Commits:
- a051f6c45f61a268f452ffac24a012da258a0d13 — sequence settings refreshes and invalidate stale settings after load failures.
- 4c664fe6c747697aaf28e790635b844062bda14c — route revision and draft recovery through sequenced CMS list refreshes.
- db7033b9de56604601edf5b25c71af96160275b2 — guard settings revision and draft actions when settings are stale.

No settings, product drafts, published content, media, database schema, deployment configuration or Production data were changed by these source edits. Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (settings list sequencing)

- Working branch: `cms-development`
- Latest settings workflow source commit: `db7033b9de56604601edf5b25c71af96160275b2`.
- Settings refresh sequencing is now used by settings revision restore and draft deletion as well as ordinary refreshes; stale settings rows cannot trigger settings publish/restore/delete actions while readiness is false.
- PR #2 must remain Open, Draft and unmerged. Confirm its head matches the branch before resuming.
- Production remains untouched. No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.
- Continue small source-only reviews. Keep Phase H for final runtime, image and visual verification.

## Additional Phase G continuation — settings recovery paths use shared request sequencing (19 November 2026)

A deeper pass through revision and draft actions found two remaining direct settings-list fetches in CMS Management, plus direct product-list refresh in product draft deletion. Those paths could bypass the list request sequencing introduced earlier and reintroduce stale rows if requests overlapped.

Updated `src/pages/CMSManagement.jsx`:
- Settings revision restore now refreshes through the shared sequenced settings loader.
- Settings draft deletion now refreshes through the same loader and no longer independently marks stale settings ready.
- Product draft deletion now uses the shared sequenced product loader.
- Settings revision restore, settings draft deletion and settings Preview publishing have handler-level readiness guards.
- A superseded list refresh is reported as requiring a reload instead of being treated as a current editor refresh.

Commits:
- 4c664fe6c747697aaf28e790635b844062bda14c — route revision and draft recovery through sequenced CMS list refreshes.
- db7033b9de56604601edf5b25c71af96160275b2 — guard settings revision and draft actions when settings are stale.

The descriptive media metadata save path was also reviewed: it updates the matching loaded media record and clears only that record's local filename/alt-text drafts after a successful server response. No additional change was necessary in that path.

No product or settings records, media metadata, drafts, published content, database schema, deployment configuration or Production data were changed by this source review. Source inspection only; no tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (revision and draft refresh paths)

- Working branch: `cms-development`
- Latest source changes for this pass: `4c664fe6c747697aaf28e790635b844062bda14c` and `db7033b9de56604601edf5b25c71af96160275b2`.
- Product and settings revision/draft refreshes now use the shared sequenced loaders.
- PR #2 remains Open, Draft and unmerged; verify its head matches the branch before resuming.
- Production untouched. No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations.
- Continue small source-only reviews; defer Phase H runtime and visual verification until the final stage.

## Current interruption-safe checkpoint — 19 November 2026, 11:55 MYT

- Repository: `yrproservice/yrproservice`
- Active branch: `cms-development`
- Source checkpoint before this handover update: `db7033b9de56604601edf5b25c71af96160275b2`.
- Branch HEAD before this handover update: `fb3452da3079a5fdd633a8fd3fb30f1a06589033`.
- PR #2 was rechecked: Open, Draft, unmerged, base `main`; PR head matched branch HEAD.
- The latest CMS Management source review assertions passed for settings request sequencing, settings readiness invalidation, shared sequenced refresh use in product/settings draft deletion and settings revision restore, and settings publish/restore/delete readiness guards.
- No tests, builds, screenshots, image processing, visual checks, deployments, Preview publishing or migrations were performed.
- Production remains untouched. PR #2 must not be merged without explicit approval.
- Resume with a fresh branch/PR check, then continue remaining Phase G source-only review in small batches. Do not start Phase H verification until the user requests or approves the final stage.

## Additional Phase G continuation — Visual Design Studio initial settings readiness (19 November 2026)

A source-only review of `src/pages/PageVisualDesignManager.jsx` found that the manager guarded saves after a failed settings request, but did not distinguish an initial request that was still pending. The editor began with default design values and its controls could be used before the current saved/published settings arrived. A fast administrator action could therefore race the initial load.

Updated `src/pages/PageVisualDesignManager.jsx`:
- Added an explicit settings-ready state, initially false.
- Initial loading now keeps the editor blocked until the current settings request succeeds; a failed request leaves it blocked.
- The shared settings refresh path clears readiness while a refresh is pending and restores it only after a successful response.
- Design field updates, Reset controls, Save draft, Publish to Preview and Delete Draft have handler-level readiness guards.
- The corresponding toolbar actions are disabled while settings are unavailable or loading.
- Existing unsaved-change reporting and successful mutation/refresh-failure messaging are preserved.

Commit:
- b7a5f54ef0cdb18b2c8e31c8d209da38f87980ee — guard Visual Design Studio until settings finish loading.

Source-level assertions confirmed the readiness state, initial pending/failure behaviour, refresh invalidation, edit/reset/save/publish/delete handler guards and toolbar disabled states. These are source assertions only, not runtime tests.

No design values, settings records, drafts, published content, media, database schema, deployment configuration or Production data were changed by this source edit. No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.

## Recovery checkpoint refresh — 19 November 2026 (Visual Design Studio readiness)

- Working branch: `cms-development`
- Latest source change: `b7a5f54ef0cdb18b2c8e31c8d209da38f87980ee`.
- Visual Design Studio now blocks edits and draft actions until the initial settings load succeeds, including while the request is pending.
- PR #2 must remain Open, Draft and unmerged; verify its head matches the branch before resuming.
- Production remains untouched. No tests, builds, screenshots, visual checks, image processing, deployments, Preview publishing or migrations were performed.
- Continue remaining Phase G source-only CMS review in small batches. Keep Phase H for final runtime, image, responsive, accessibility, security and Preview verification.

