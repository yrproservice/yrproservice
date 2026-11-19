# YR Proservice — Phase G Media Administration Handover

Updated: 19 November 2026

## Repository safety checkpoint

- Repository: `yrproservice/yrproservice`
- Working branch: `cms-development`
- Latest source checkpoint before this continuation: `b6ac454ecd4bfb0871c1b6247613376ab977cbbe`.
- Latest Phase G continuation checkpoint recorded below: `ff045d8c4b02f1259fa71695aed6a98341396073` (gallery replacement target stability); this handover update will be committed immediately after it.
- Pull request: [#2 — Build YR Proservice Visual CMS foundation](https://github.com/yrproservice/yrproservice/pull/2)
- PR status: Open, Draft, unmerged (must remain Draft and unmerged without explicit user approval).
- Production: untouched; do not merge or deploy.
- Preview-only D1/R2 CMS workflow remains the intended target.

GitHub compare at this checkpoint reported `cms-development` as 676 commits ahead of `main`, 0 behind. Review the full branch history and PR diff before any future merge; do not infer that the branch is safe to merge from a mergeable flag alone.

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

## Existing safeguards and limits retained

- Media library list: maximum 300 loaded records.
- R2 storage checks: on-demand only.
- Orphan scan: read-only, batch-limited, session-only and potentially partial.
- Media activity history: selected item only, maximum 50 events.
- Reference report: maximum 50 displayed revisions per content group.
- Archiving is blocked while saved content or revision history contains the media URL.
- Archived R2 objects are retained for recovery; restore checks object availability.
- No automatic bulk replacement, historical-revision rewriting, or object deletion was introduced.

## Verification boundary

No tests, builds, screenshots, visual checks, image processing, deployments, or database migrations were run in this continuation. Source-level inspection only was performed after the edits.

Defer all testing, builds, screenshots, image work, and final visual/functional checks until Phase H, as instructed.

## Next work

Continue Phase G by reviewing the complete media replacement journey in the authenticated Preview CMS, without running it as a test now:
- Confirm that the product editor and Visual Editor replacement pickers make the selected media URL clear before saving.
- Ensure the current draft/published record can be updated without changing unrelated media references.
- Keep historical revisions immutable and explain why those references continue to block archiving.
- Review lifecycle audit entries and recovery messaging in Phase H verification.

Do not start Phase H until the remaining CMS implementation work is complete and the user explicitly directs the final verification stage.
