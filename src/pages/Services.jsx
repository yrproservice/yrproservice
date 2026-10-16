import React from 'react';
import { Link } from '../components/Layout';
import { services } from '../data/services';

export default function Services({ navigate }) {
  return (
    <>
      <section className="services-hero services-pattern-page">
        <div className="container services-hero-grid">
          <div className="services-hero-copy">
            <p className="eyebrow">YR Proservice · Technical Services</p>
            <h1>Dental Equipment Services</h1>
            <p className="services-hero-lead">
              From clinic planning and equipment installation to emergency repair, preventive maintenance and safety support, we help keep your dental practice operating smoothly.
            </p>
          </div>
          <div className="services-hero-visual">
            <img src="/assets/services-technician.jpg" alt="Dental equipment technical service" />
            <div className="services-hero-badge">
              <strong>Technical Support</strong>
              <span>Installation · Maintenance · Repair</span>
            </div>
          </div>
        </div>
      </section>

      <section className="services-intro section">
        <div className="container services-intro-grid">
          <div>
            <p className="eyebrow">What we do</p>
            <h2>Practical technical support for your dental clinic.</h2>
          </div>
          <p>
            Our services cover the key stages of your equipment journey — from planning a treatment room and installing equipment to keeping systems maintained, repaired and properly documented.
          </p>
        </div>
      </section>

      <section className="services-list-section section light">
        <div className="container">
          <div className="section-heading services-heading">
            <p className="eyebrow">Our services</p>
            <h2>Technical services for dental practices</h2>
            <p>Explore each service to see what is included and send us an enquiry when you are ready.</p>
          </div>

          <div className="services-card-grid">
            {services.map((service) => (
              <article className="premium-service-card" key={service.slug}>
                <div className="premium-service-top">
                  <span className="service-number">{service.number}</span>
                  <span className="service-icon" aria-hidden="true">{service.icon}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <ul>
                  {service.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <Link to={`/services/${service.slug}`} navigate={navigate} className="service-view-button">View Service <span>↗</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="services-process section services-pattern-process">
        <div className="container">
          <div className="section-heading services-heading">
            <p className="eyebrow">How we work</p>
            <h2>A clear process from enquiry to service completion.</h2>
          </div>
          <div className="process-grid">
            {[
              ['01', 'Tell us what you need', 'Share your clinic, equipment and service requirement with our team.'],
              ['02', 'Review & plan', 'We review the requirement and determine the appropriate service approach.'],
              ['03', 'Carry out the work', 'Our technical team performs the agreed work with attention to safety and function.'],
              ['04', 'Test & handover', 'We check the completed work and explain the service outcome to you.']
            ].map(([number, title, text]) => (
              <div className="process-step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="services-cta-wrap section">
        <div className="container">
          <div className="services-cta">
            <div>
              <p className="eyebrow">Need dental equipment support?</p>
              <h2>Let's keep your practice running.</h2>
              <p>Whether you need planning, repair, maintenance or compliance support, tell us what you need and our team can review the requirement with you.</p>
            </div>
            <div className="services-cta-actions">
              <Link to="/service-request" navigate={navigate} className="button">Request a Service</Link>
              <Link to="/quote" navigate={navigate} className="button secondary">Request a Quotation</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
