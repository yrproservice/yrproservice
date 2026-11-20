import React, { useEffect, useState } from "react";
import TeamCmsRenderer from "../components/TeamCmsRenderer";
import { getTeamCmsContent, teamCmsTemplate } from "../data/teamCmsTemplate";

export default function Team({ navigate }) {
  const [content, setContent] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/pages?key=team", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.ok && result.page?.content?.sections?.some((section) => section.type === "team-page")) {
          setContent(result.page.content);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return <TeamCmsRenderer content={getTeamCmsContent(content || teamCmsTemplate)} navigate={navigate} />;
}
