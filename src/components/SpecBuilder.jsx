import React from "react";
import { moveRow, splitSpecificationString, updateSpecificationRow } from "./productEditorData";

function SpecificationFields({ row, onChange }) {
  if (typeof row === "string") {
    const parts = splitSpecificationString(row);
    return (
      <div className="cms-editor-row-fields">
        <label>
          Specification
          <input
            value={parts.label}
            placeholder="Name"
            onChange={(event) => onChange("label", event.target.value)}
          />
        </label>
        <label>
          Value
          <input
            value={parts.value}
            onChange={(event) => onChange("value", event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (row && typeof row === "object" && !Array.isArray(row)) {
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(row, key);
    const labelKey = ["label", "name", "key", "title"].find(hasOwn) || "label";
    const valueKey = ["value", "detail", "text", "description"].find(hasOwn) || "value";
    return (
      <div className="cms-editor-row-fields">
        <label>
          Specification
          <input
            value={String(row[labelKey] ?? "")}
            onChange={(event) => onChange("label", event.target.value)}
          />
        </label>
        <label>
          Value
          <input
            value={String(row[valueKey] ?? "")}
            onChange={(event) => onChange("value", event.target.value)}
          />
        </label>
      </div>
    );
  }

  return (
    <label className="cms-editor-row-raw">
      Specification JSON (row type preserved)
      <input
        value={JSON.stringify(row)}
        onChange={(event) => onChange("raw", event.target.value)}
      />
    </label>
  );
}

export default function SpecBuilder({ specifications = [], onChange }) {
  const rows = Array.isArray(specifications) ? specifications : [];
  const update = (index, field, value) => {
    const next = rows.slice();
    next[index] = updateSpecificationRow(next[index], field, value);
    onChange(next);
  };

  return (
    <section className="cms-editor-section" aria-label="Product specifications">
      <div className="cms-editor-section-heading">
        <div><h3>Specifications</h3><p>Unchanged entries retain their original format.</p></div>
        <button type="button" className="admin-secondary-button" onClick={() => onChange([...rows, ""])}>
          Add specification
        </button>
      </div>
      {rows.map((row, index) => (
        <div className="cms-editor-row" key={index}>
          <SpecificationFields row={row} onChange={(field, value) => update(index, field, value)} />
          <div className="cms-editor-row-actions">
            <button type="button" aria-label={`Move specification ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveRow(rows, index, -1))}>↑</button>
            <button type="button" aria-label={`Move specification ${index + 1} down`} disabled={index === rows.length - 1} onClick={() => onChange(moveRow(rows, index, 1))}>↓</button>
            <button type="button" aria-label={`Delete specification ${index + 1}`} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}
