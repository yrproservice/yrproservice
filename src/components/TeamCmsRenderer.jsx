import React from "react";

const SECTION_LABELS = {
  hero: "Hero banner",
  story: "Our approach",
  process: "How we work",
  capabilities: "What we do",
  people: "Our team",
  cta: "Final call to action"
};

function sectionStyle(design, key) {
  const value = design?.sections?.[key] || {};
  return {
    backgroundColor: value.backgroundColor || undefined,
    textAlign: value.textAlign || undefined,
    ...(value.textColor ? { "--team-section-text": value.textColor } : {}),
    ...(value.accentColor ? { "--team-section-accent": value.accentColor } : {})
  };
}

function TeamSection({ sectionKey, data, design, navigate }) {
  const custom = design?.sections?.[sectionKey] || {};
  const style = sectionStyle(design, sectionKey);
  if (sectionKey === "hero") {
    const hero = data.hero || {};
    return <section className="about-editorial-hero team-pattern-hero team-cms-section team-cms-hero" style={style} data-layout={hero.layout || "split-right"}>
      <div className="about-orbit orbit-one" /><div className="about-orbit orbit-two" />
      <div className="container about-editorial-grid">
        <div className="about-editorial-copy">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1>{hero.title} <span>{hero.highlight}</span></h1>
          <p className="about-editorial-lead">{hero.lead}</p>
          <div className="about-editorial-meta">{(hero.meta || []).map((item, index) => <span key={index}><b>{item.number}</b> {item.label}</span>)}</div>
        </div>
        <div className="about-editorial-image" style={{height: hero.imageHeight ? `${hero.imageHeight}px` : undefined}}>
          <img src={hero.imageUrl} alt={hero.imageAlt || ""} style={{objectPosition: hero.imagePosition || "center"}} />
          <div className="about-image-label"><span>{hero.imageLabel}</span><b>{hero.imageSubLabel}</b></div>
        </div>
      </div>
    </section>;
  }
  if (sectionKey === "story") {
    const story = data.story || {};
    return <section className="about-story team-cms-section" style={style}>
      <div className="container about-story-grid">
        <div className="about-story-number">{story.number}</div>
        <div><p className="eyebrow">{story.eyebrow}</p><h2>{story.title}</h2><p className="about-story-lead">{story.lead}</p></div>
        <div className="about-story-note"><span>{story.noteLabel}</span><strong>{story.noteTitle}</strong><p>{story.noteText}</p></div>
      </div>
    </section>;
  }
  if (sectionKey === "process") {
    const process = data.process || {};
    return <section className="about-process team-pattern-process team-cms-section" style={style}>
      <div className="container">
        <div className="about-process-heading"><div><p className="eyebrow">{process.eyebrow}</p><h2>{process.title}</h2></div><p>{process.description}</p></div>
        <div className="about-process-line">{(process.steps || []).map((step, index) => <article key={index} className="about-process-item"><div className="process-dot">{step.number}</div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </div>
    </section>;
  }
  if (sectionKey === "capabilities") {
    const capabilities = data.capabilities || {};
    return <section className="about-capabilities team-cms-section" style={style}>
      <div className="container">
        <div className="about-capability-intro"><div><p className="eyebrow">{capabilities.eyebrow}</p><h2>{capabilities.title}</h2></div><p>{capabilities.description}</p></div>
        <div className="about-capability-list">{(capabilities.items || []).map((item, index) => <article key={index}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b>↗</b></article>)}</div>
      </div>
    </section>;
  }
  if (sectionKey === "people") {
    const people = data.people || {};
    return <section className="about-people team-pattern-people team-cms-section" style={style}>
      <div className="container">
        <div className="about-people-heading"><p className="eyebrow">{people.eyebrow}</p><h2>{people.title}</h2><p>{people.description}</p></div>
        <div className="about-people-grid">{(people.items || []).map((item, index) => <article className={`about-person person-${index + 1}`} key={index}><div className="about-person-image"><img src={item.image} alt={item.imageAlt || ""} /></div><div className="about-person-copy"><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div>
      </div>
    </section>;
  }
  const cta = data.cta || {};
  return <section className="about-final team-cms-section" style={style}>
    <div className="container about-final-inner">
      <div><p className="eyebrow">{cta.eyebrow}</p><h2>{cta.title}</h2><p>{cta.body}</p></div>
      <div className="about-final-actions"><button className="button" onClick={() => navigate?.(cta.quoteUrl || "/quote")}>{cta.quoteButton}</button><button className="button secondary" onClick={() => navigate?.(cta.servicesUrl || "/services")}>{cta.servicesButton}</button></div>
    </div>
  </section>;
}

export default function TeamCmsRenderer({ content, navigate }) {
  const section = content?.sections?.find((item) => item?.type === "team-page");
  const data = section?.content || content || {};
  const design = section?.design || content?.design || {};
  const defaultOrder = ["hero", "story", "process", "capabilities", "people", "cta"];
  const order = Array.isArray(content?.sectionOrder) ? content.sectionOrder.filter((key) => defaultOrder.includes(key)) : defaultOrder;
  const orderedKeys = [...order, ...defaultOrder.filter((key) => !order.includes(key))];
  const global = design.global || {};
  const pageStyle = {
    "--team-heading-font": global.headingFont || "Montserrat",
    "--team-body-font": global.bodyFont || "Inter",
    "--team-heading-scale": Number(global.headingScale || 1),
    "--team-body-size": `${Number(global.bodySize || 16)}px`
  };
  return <main className="team-cms-page" style={pageStyle}>
    {orderedKeys.map((key, index) => <div className="team-cms-order-item" key={key} style={{order: index}}><TeamSection sectionKey={key} data={data} design={design} navigate={navigate} /></div>)}
  </main>;
}

export { SECTION_LABELS };
