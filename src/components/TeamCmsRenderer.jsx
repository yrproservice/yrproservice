import React from "react";

export default function TeamCmsRenderer({ content, navigate }) {
  const data = content?.sections ? content.sections[0]?.content : content;
  const hero = data?.hero || {};
  const story = data?.story || {};
  const process = data?.process || {};
  const capabilities = data?.capabilities || {};
  const people = data?.people || {};
  const cta = data?.cta || {};

  return (
    <>
      <section className="about-editorial-hero team-pattern-hero">
        <div className="about-orbit orbit-one" />
        <div className="about-orbit orbit-two" />
        <div className="container about-editorial-grid">
          <div className="about-editorial-copy">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1>{hero.title} <span>{hero.highlight}</span></h1>
            <p className="about-editorial-lead">{hero.lead}</p>
            <div className="about-editorial-meta">
              {(hero.meta || []).map((item, index) => (
                <span key={index}><b>{item.number}</b> {item.label}</span>
              ))}
            </div>
          </div>
          <div className="about-editorial-image">
            <img src={hero.imageUrl} alt={hero.imageAlt || ""} />
            <div className="about-image-label">
              <span>{hero.imageLabel}</span>
              <b>{hero.imageSubLabel}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="about-story">
        <div className="container about-story-grid">
          <div className="about-story-number">{story.number}</div>
          <div>
            <p className="eyebrow">{story.eyebrow}</p>
            <h2>{story.title}</h2>
            <p className="about-story-lead">{story.lead}</p>
          </div>
          <div className="about-story-note">
            <span>{story.noteLabel}</span>
            <strong>{story.noteTitle}</strong>
            <p>{story.noteText}</p>
          </div>
        </div>
      </section>

      <section className="about-process team-pattern-process">
        <div className="container">
          <div className="about-process-heading">
            <div>
              <p className="eyebrow">{process.eyebrow}</p>
              <h2>{process.title}</h2>
            </div>
            <p>{process.description}</p>
          </div>
          <div className="about-process-line">
            {(process.steps || []).map((step, index) => (
              <article key={index} className="about-process-item">
                <div className="process-dot">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-capabilities">
        <div className="container">
          <div className="about-capability-intro">
            <div>
              <p className="eyebrow">{capabilities.eyebrow}</p>
              <h2>{capabilities.title}</h2>
            </div>
            <p>{capabilities.description}</p>
          </div>
          <div className="about-capability-list">
            {(capabilities.items || []).map((item, index) => (
              <article key={index}>
                <span>0{index + 1}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
                <b>↗</b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-people team-pattern-people">
        <div className="container">
          <div className="about-people-heading">
            <p className="eyebrow">{people.eyebrow}</p>
            <h2>{people.title}</h2>
            <p>{people.description}</p>
          </div>
          <div className="about-people-grid">
            {(people.items || []).map((item, index) => (
              <article className={`about-person person-${index + 1}`} key={index}>
                <div className="about-person-image"><img src={item.image} alt={item.imageAlt || ""} /></div>
                <div className="about-person-copy">
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-final">
        <div className="container about-final-inner">
          <div>
            <p className="eyebrow">{cta.eyebrow}</p>
            <h2>{cta.title}</h2>
            <p>{cta.body}</p>
          </div>
          <div className="about-final-actions">
            <button className="button" onClick={() => navigate?.(cta.quoteUrl || "/quote")}>{cta.quoteButton}</button>
            <button className="button secondary" onClick={() => navigate?.(cta.servicesUrl || "/services")}>{cta.servicesButton}</button>
          </div>
        </div>
      </section>
    </>
  );
}
