export function removeSectionFromContent(content, sectionId, entryId, pageKey) {
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  const originalIndex = sections.findIndex((section) => section.id === sectionId);
  if (originalIndex < 0) {
    return { content, entry: null, nextSelectedId: "" };
  }

  const section = JSON.parse(JSON.stringify(sections[originalIndex]));
  const entry = { id: entryId, pageKey, section, originalIndex };
  const remaining = sections
    .filter((item) => item.id !== sectionId)
    .map((item, index) => ({ ...item, order: index + 1 }));

  return {
    content: { ...content, sections: remaining },
    entry,
    nextSelectedId: remaining[Math.min(originalIndex, remaining.length - 1)]?.id || "",
  };
}

export function restoreSectionToContent(content, entry, pageKey) {
  if (!entry || entry.pageKey !== pageKey) return content;
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  if (sections.some((section) => section.id === entry.section?.id)) return content;

  const restored = [...sections];
  const index = Math.max(0, Math.min(entry.originalIndex, restored.length));
  restored.splice(index, 0, JSON.parse(JSON.stringify(entry.section)));

  return {
    ...content,
    sections: restored.map((section, order) => ({ ...section, order: order + 1 })),
  };
}
