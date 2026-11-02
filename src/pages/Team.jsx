import React from "react";

const capabilities = [
  {
    title: "Dental Clinic Setup",
    text: "We support the planning and setup of dental clinics, including equipment requirements and practical clinic solutions.",
  },
  {
    title: "Dental Equipment Supply",
    text: "We provide dental equipment, dental X-ray units, lab equipment and supporting materials for clinics and healthcare facilities.",
  },
  {
    title: "Installation & Commissioning",
    text: "Our team supports installation, site coordination and equipment handover so the system is ready for use.",
  },
  {
    title: "Service & Technical Support",
    text: "We deliver repair, maintenance and technical support for dental chairs, x-ray systems, compressors, suction units and related equipment.",
  },
];

const teamFunctions = [
  {
    title: "Sales & Technical Support",
    text: "Supporting dental clinics with product guidance, technical advice and practical solutions for equipment needs.",
  },
  {
    title: "Installation & Service",
    text: "Coordinating installation work and ongoing technical service for dental chair, x-ray and supporting equipment.",
  },
  {
    title: "Account & Administration",
    text: "Managing customer enquiries, quotations, documentation and operational coordination for project delivery.",
  },
  {
    title: "Project Coordination",
    text: "Helping organize equipment requirements, site preparation and project documentation for smooth implementation.",
  },
];

const milestones = [
  [
    "01",
    "Understand",
    "We look at the clinic's workflow, space and the type of equipment needed before recommending anything.",
  ],
  [
    "02",
    "Plan",
    "We coordinate the equipment, installation needs and site requirements before the work starts.",
  ],
  [
    "03",
    "Deliver",
    "The required products and technical work are arranged with attention to setup, usability and smooth handover.",
  ],
  [
    "04",
    "Support",
    "We remain available for service, maintenance and follow-up after installation so clinics can keep operating smoothly.",
  ],
];

const corporateProfileHref = "/yr-proservice-corporate-profile.pdf";

export default function Team({ navigate }) {
  return (
    <>
      <section className="about-editorial-hero team-pattern-hero">
        <div className="about-orbit orbit-one" />
        <div className="about-orbit orbit-two" />
        <div className="container about-editorial-grid">
          <div className="about-editorial-copy">
            <p className="eyebrow">About YR Proservice</p>
            <h1>
              Sales & service for the
              <span> dental world.</span>
            </h1>
            <p className="about-editorial-lead">
              YR Proservice Sdn Bhd is a company specialising in the dental
              industry. Established in 2014 to provide the best and most
              comprehensive services and solutions for dental clinics in the
              government sector, private sector and organisations that need
              support with dental healthcare or programme planning.
            </p>
            <div className="about-editorial-meta">
              <span>
                <b>01</b> Dental clinic setup
              </span>
              <span>
                <b>02</b> Equipment supply
              </span>
              <span>
                <b>03</b> Technical support
              </span>
            </div>
          </div>
          <div className="about-editorial-illustration" aria-hidden="true">
            <div className="about-visual-card about-visual-card-main">
              <span>YR PROSERVICE</span>
              <strong>DENTAL EQUIPMENT</strong>
            </div>
            <div className="about-visual-card about-visual-card-accent">
              <small>Established</small>
              <b>Since 2014</b>
            </div>
          </div>
        </div>
      </section>

      <section className="about-story">
        <div className="container about-story-grid">
          <div className="about-story-number">01</div>
          <div>
            <p className="eyebrow">Our approach</p>
            <h2>Practical support for dental clinics and healthcare facilities.</h2>
            <p className="about-story-lead">
              We provide services and solutions for dental clinic setup, dental
              equipment and dental X-ray. We also supply dental equipment,
              dental X-ray units, laboratory equipment and materials to support
              clinic operations and project delivery.
            </p>
          </div>
          <div className="about-story-note">
            <span>OUR FOCUS</span>
            <strong>Quality products, efficient service and dependable support</strong>
            <p>
              We are dedicated to helping clients achieve successful and cost-
              effective implementation of innovative dental technology.
            </p>
          </div>
        </div>
      </section>

      <section className="about-process team-pattern-process">
        <div className="container">
          <div className="about-process-heading">
            <div>
              <p className="eyebrow">How we work</p>
              <h2>From planning to after-sales support.</h2>
            </div>
            <p>
              We support clinics through equipment planning, installation,
              servicing and long-term operational assistance.
            </p>
          </div>
          <div className="about-process-line">
            {milestones.map(([number, title, text]) => (
              <article key={number} className="about-process-item">
                <div className="process-dot">{number}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-capabilities">
        <div className="container">
          <div className="about-capability-intro">
            <div>
              <p className="eyebrow">What we do</p>
              <h2>Supporting dental practice needs across the full workflow.</h2>
            </div>
            <p>
              Our work covers clinic setup, equipment supply, installation and
              servicing across both public and private healthcare settings.
            </p>
          </div>
          <div className="about-capability-list">
            {capabilities.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <b>↗</b>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-profile-download">
        <div className="container">
          <div className="about-profile-panel">
            <div>
              <p className="eyebrow">Company overview</p>
              <h2>Download our corporate profile.</h2>
              <p>
                For a fuller overview of YR Proservice, our company background,
                services and the dental projects we support, please view our
                corporate profile.
              </p>
            </div>
            <a
              href={corporateProfileHref}
              target="_blank"
              rel="noreferrer"
              className="bp-btn bp-btn-primary"
            >
              Download PDF
            </a>
          </div>
        </div>
      </section>

      <section className="about-people team-pattern-people">
        <div className="container">
          <div className="about-people-heading">
            <p className="eyebrow">Our team</p>
            <h2>People working across the service.</h2>
            <p>
              Different parts of the business come together to support equipment,
              customer enquiries and the day-to-day needs of dental clinics.
            </p>
          </div>
          <div className="about-people-grid">
            {teamFunctions.map((item, index) => (
              <article
                className={`about-person person-${index + 1}`}
                key={item.title}
              >
                <div className="about-person-badge">0{index + 1}</div>
                <div className="about-person-copy">
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
            <p className="eyebrow">Let’s talk</p>
            <h2>Planning a dental equipment project?</h2>
            <p>
              Whether you need equipment, installation help or technical support,
              we can discuss the best fit for your clinic.
            </p>
          </div>
          <div className="about-final-actions">
            <button className="button" onClick={() => navigate("/quote")}>
              Request a Quote
            </button>
            <button
              className="button secondary"
              onClick={() => navigate("/services")}
            >
              View Services
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
