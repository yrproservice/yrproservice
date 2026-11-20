import React from "react";
import { getDocumentFieldKeys, moveRow, updateDocumentRow } from "./productEditorData";

export default function DocumentManager({ documents = [], onChange, disabled = false }) {
  const rows = Array.isArray(documents) ? documents : [];

  function update(index, field, value) {
    const next = rows.slice();
    next[index] = updateDocumentRow(next[index], field, value);
    onChange(next);
  }

  return (
    <section className="cms-editor-section" aria-label="Product documents">
      <div className="cms-editor-section-heading">
        <div><h3>Documents</h3><p>Paths and URLs are stored exactly as entered.</p></div>
        <button type="button" className="admin-secondary-button" disabled={disabled} onClick={() => onChange([...rows, { label: "", url: "" }])}>
          Add document
        </button>
      </div>
      {rows.map((document, index) => {
        const fields = document && typeof document === "object" && !Array.isArray(document)
          ? getDocumentFieldKeys(document)
          : null;

        return (
          <div className="cms-editor-row" key={index}>
            {fields ? (
              <div className="cms-editor-row-fields">
                <label>
                  Document name
                  <input value={String(document[fields.label] ?? "")} disabled={disabled} onChange={(event) => update(index, "label", event.target.value)} />
                </label>
                <label>
                  Path or URL
                  <input value={String(document[fields.location] ?? "")} disabled={disabled} onChange={(event) => update(index, "location", event.target.value)} />
                </label>
              </div>
            ) : (
              <label className="cms-editor-row-raw">
                {typeof document === "string" ? "Path or URL" : "Document JSON (row type preserved)"}
                <input
                  value={typeof document === "string" ? document : JSON.stringify(document)}
                  disabled={disabled} onChange={(event) => update(index, "location", event.target.value)}
                />
              </label>
            )}
            <div className="cms-editor-row-actions">
              <button type="button" aria-label={`Move document ${index + 1} up`} disabled={disabled || index === 0} onClick={() => onChange(moveRow(rows, index, -1))}>↑</button>
              <button type="button" aria-label={`Move document ${index + 1} down`} disabled={disabled || index === rows.length - 1} onClick={() => onChange(moveRow(rows, index, 1))}>↓</button>
              <button type="button" aria-label={`Delete document ${index + 1}`} disabled={disabled} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Delete</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
