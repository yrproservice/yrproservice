import test from "node:test";
import assert from "node:assert/strict";
import {
  removeSectionFromContent,
  restoreSectionToContent,
} from "../src/utils/sectionRecovery.js";

function makeContent() {
  return {
    design: {
      global: { headingFont: "Montserrat" },
      sections: {
        "section-b": { backgroundColor: "#eaf6fd", textColor: "#1f2937" },
      },
    },
    sections: [
      { id: "section-a", type: "hero", order: 1, content: { heading: "First" }, layout: { variant: "split" } },
      { id: "section-b", type: "editorial", order: 2, visible: false, content: { heading: "Keep exact content", nested: { value: 7 } }, layout: { variant: "stacked", custom: true } },
      { id: "section-c", type: "cta", order: 3, content: { heading: "Last" } },
    ],
  };
}

test("moving a section to recovery preserves its complete data and styling reference", () => {
  const content = makeContent();
  const originalSection = content.sections[1];
  const result = removeSectionFromContent(content, "section-b", "recovery-1", "home");

  assert.deepEqual(result.entry, {
    id: "recovery-1",
    pageKey: "home",
    section: originalSection,
    originalIndex: 1,
  });
  assert.notEqual(result.entry.section, originalSection);
  assert.deepEqual(result.content.sections.map((section) => [section.id, section.order]), [
    ["section-a", 1],
    ["section-c", 2],
  ]);
  assert.deepEqual(result.content.design, content.design);
  assert.equal(result.content.design.sections["section-b"].backgroundColor, "#eaf6fd");
  assert.equal(result.nextSelectedId, "section-c");
  assert.equal(content.sections.length, 3, "source content remains unchanged");
});

test("restoring a removed section returns its original ID, data, style key and position", () => {
  const content = makeContent();
  const removed = removeSectionFromContent(content, "section-b", "recovery-2", "home");
  const restored = restoreSectionToContent(removed.content, removed.entry, "home");

  assert.deepEqual(restored.sections.map((section) => section.id), [
    "section-a",
    "section-b",
    "section-c",
  ]);
  assert.deepEqual(restored.sections[1], content.sections[1]);
  assert.deepEqual(restored.design, content.design);
  assert.equal(restored.design.sections["section-b"].textColor, "#1f2937");
  assert.deepEqual(content.sections.map((section) => section.id), [
    "section-a",
    "section-b",
    "section-c",
  ]);
});

test("recovery rejects entries for another page and does not duplicate an existing section", () => {
  const content = makeContent();
  const removed = removeSectionFromContent(content, "section-b", "recovery-3", "home");

  assert.equal(restoreSectionToContent(removed.content, removed.entry, "services"), removed.content);
  assert.equal(restoreSectionToContent(content, removed.entry, "home"), content);
});

test("recovery transitions remain compatible with undo and redo content snapshots", () => {
  const original = makeContent();
  const removed = removeSectionFromContent(original, "section-b", "recovery-4", "home");
  const undoSnapshot = restoreSectionToContent(removed.content, removed.entry, "home");
  const redoSnapshot = removeSectionFromContent(undoSnapshot, "section-b", "recovery-5", "home");

  assert.deepEqual(undoSnapshot.sections.map((section) => section.id), ["section-a", "section-b", "section-c"]);
  assert.deepEqual(redoSnapshot.content.sections.map((section) => section.id), ["section-a", "section-c"]);
  assert.equal(redoSnapshot.entry.section.id, "section-b");
  assert.deepEqual(redoSnapshot.content.design.sections["section-b"], original.design.sections["section-b"]);
});
