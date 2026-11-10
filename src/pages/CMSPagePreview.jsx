import React, { useEffect, useState } from "react";
import HomeCmsRenderer from "../components/HomeCmsRenderer";
import GenericCmsRenderer from "../components/GenericCmsRenderer";

export default function CMSPagePreview() {
  const [content, setContent] = useState(null);
  const [title, setTitle] = useState("CMS Draft Preview");
  const [pageKey, setPageKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const key = new URLSearchParams(window.location.search).get("key") || "";
    if (!key) {
      setError("A page key is required to preview a saved draft.");
      setLoading(false);
      return () => { active = false; };
    }
    fetch(`/api/cms/admin/preview?key=${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load the saved draft.");
        return result.page;
      })
      .then((page) => {
        if (!active) return;
        setPageKey(page.pageKey || key);
        setContent(page.content);
        setTitle(page.title || "CMS Draft Preview");
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load the saved draft.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="cms-full-preview">
      <div className="cms-full-preview-bar">
        <div><strong>{title}</strong><span>Saved draft preview · Not published</span></div>
        <button type="button" className="admin-secondary-button" onClick={() => window.close()}>
          Close preview
        </button>
      </div>
      {loading ? <div className="cms-full-preview-message">Loading saved draft…</div>
        : error ? <div className="cms-full-preview-message">{error}</div>
        : content ? (pageKey === "home" ? <HomeCmsRenderer content={content} navigate={(to) => { window.location.href = to; }} /> : <GenericCmsRenderer content={content} navigate={(to) => { window.location.href = to; }} />)
        : <div className="cms-full-preview-message">No preview content is available.</div>}
    </div>
  );
}
