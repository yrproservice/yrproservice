import React from 'react';

const capabilities = [
  { title: 'Dental Equipment Supply', text: 'A focused catalogue of dental equipment, accessories and clinic essentials for day-to-day operations.' },
  { title: 'Installation & Setup', text: 'Practical support for equipment installation, operatory setup and coordination of site requirements.' },
  { title: 'Technical Service', text: 'Repair, maintenance and troubleshooting support to help clinics keep equipment in service.' },
  { title: 'After-Sales Support', text: 'Ongoing assistance for product enquiries, service requests and equipment-related follow-up.' },
];

const teamFunctions = [
  { image: '/assets/team-1.jpg', title: 'Technical Support', text: 'Equipment guidance, troubleshooting and practical technical assistance.' },
  { image: '/assets/team-2.jpg', title: 'Installation & Service', text: 'Installation coordination, servicing and on-site technical support.' },
  { image: '/assets/team-3.jpg', title: 'Customer Support', text: 'Quotations, product enquiries and coordination with dental clinics.' },
  { image: '/assets/team-4.jpg', title: 'Project Coordination', text: 'Planning and coordination for dental equipment and clinic requirements.' },
];

const milestones = [
  ['01', 'Understand', 'We start with the clinic requirement, space, equipment and practical workflow.'],
  ['02', 'Plan', 'Equipment, installation needs and technical requirements are coordinated before work begins.'],
  ['03', 'Deliver', 'Products and technical work are carried through with attention to setup and usability.'],
  ['04', 'Support', 'After installation, we remain available for service, maintenance and equipment enquiries.'],
];

export default function Team({ navigate }) {
  return (
    <>
      <section className="about-editorial-hero team-pattern-hero">
        <div className="about-orbit orbit-one" />
        <div className="about-orbit orbit-two" />
        <div className="container about-editorial-grid">
          <div className="about-editorial-copy">
            <p className="eyebrow">About YR Proservice</p>
            <h1>Behind every operatory is a system that needs to <span>work.</span></h1>
            <p className="about-editorial-lead">
              YR Proservice supports dental clinics with equipment supply, installation,
              technical service and ongoing after-sales support.
            </p>
            <div className="about-editorial-meta">
              <span><b>01</b> Equipment</span>
              <span><b>02</b> Installation</span>
              <span><b>03</b> Technical support</span>
            </div>
          </div>
          <div className="about-editorial-image">
            <img src="/assets/about-team.jpg" alt="YR Proservice dental equipment team" />
            <div className="about-image-label"><span>YR PROSERVICE</span><b>DENTAL EQUIPMENT</b></div>
          </div>
        </div>
      </section>

      <section className="about-story">
        <div className="container about-story-grid">
          <div className="about-story-number">01</div>
          <div>
            <p className="eyebrow">Our approach</p>
            <h2>More than supplying equipment.</h2>
            <p className="about-story-lead">
              Our work connects products with the practical requirements of a working dental clinic.
              From selecting equipment to installation, maintenance and repair, we focus on making
              equipment projects easier to coordinate and simpler to maintain after installation.
            </p>
          </div>
          <div className="about-story-note">
            <span>THE YR APPROACH</span>
            <strong>Equipment + technical support + follow-through</strong>
            <p>One connected workflow for the equipment behind your practice.</p>
          </div>
        </div>
      </section>

      <section className="about-process team-pattern-process">
        <div className="container">
          <div className="about-process-heading">
            <div>
              <p className="eyebrow">How we work</p>
              <h2>From requirement to ongoing support.</h2>
            </div>
            <p>Our role can begin before an equipment purchase and continue after installation.</p>
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
              <h2>Built around real clinic needs.</h2>
            </div>
            <p>Our capabilities connect equipment supply with the practical technical support required throughout its working life.</p>
          </div>
          <div className="about-capability-list">
            {capabilities.map((item, index) => (
              <article key={item.title}>
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
            <p className="eyebrow">Our team</p>
            <h2>People behind the service.</h2>
            <p>Different functions work together to support equipment, service and customer requirements.</p>
          </div>
          <div className="about-people-grid">
            {teamFunctions.map((item, index) => (
              <article className={`about-person person-${index + 1}`} key={item.title}>
                <div className="about-person-image"><img src={item.image} alt="" /></div>
                <div className="about-person-copy"><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-final">
        <div className="container about-final-inner">
          <div><p className="eyebrow">Let's work together</p><h2>Planning a dental equipment project?</h2><p>Talk to YR Proservice about products, installation, technical support or your clinic requirements.</p></div>
          <div className="about-final-actions">
            <button className="button" onClick={() => navigate('/quote')}>Request a Quote</button>
            <button className="button secondary" onClick={() => navigate('/services')}>View Services</button>
          </div>
        </div>
      </section>
    </>
  );
}
