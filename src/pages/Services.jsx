import React, { useEffect, useState } from "react";
import ServicesCmsRenderer from "../components/ServicesCmsRenderer";
import { servicesCmsTemplate } from "../data/servicesCmsTemplate";

export default function Services({ navigate }) {
  const [content, setContent] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/pages?key=services", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.ok && result.page?.content?.sections?.some((section) => section.type === "services-page")) {
          setContent(result.page.content);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return <ServicesCmsRenderer content={content || servicesCmsTemplate} navigate={navigate} />;
}
