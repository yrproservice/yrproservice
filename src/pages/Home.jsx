import React from 'react';
import { Link } from '../components/Layout';
import { products } from '../data/products';

const brands = ['morita.png','mocom.png','melag.jfif','durr.png','cattani.jfif','cingol.jfif','westcode.png','ems.jfif','fussen.png','nishika.png','vrn.png','baolai.png','xline.png'];
const featured = products.filter(p => ['signo-t100','mocom-m10','westcode-m-l530-straight-handpiece','morita-lubrina-2'].includes(p.slug));
const provide = [
  ['01','Dental Equipment','Dental chairs, handpieces, machines and essential equipment for modern clinics.','▣','/products'],
  ['02','Installation','Professional setup and installation support for dental equipment and clinic systems.','⌁','/services/dental-chair-installation'],
  ['03','Technical Service','Repair, preventive maintenance and practical troubleshooting support.','⚙','/services/repair-technical-support'],
  ['04','Clinic Support','Guidance from equipment selection through ongoing technical support.','✦','/quote'],
];

export default function Home({ navigate }) {
  return <main className="bp-home">
    <section className="bp-home-hero">
      <img src="/assets/hero-operatory.jpg" alt="Modern dental operatory" className="bp-hero-image" />
      <div className="bp-hero-overlay" />
      <div className="bp-hero-lines" aria-hidden="true" />
      <div className="container bp-hero-content">
        <div className="bp-hero-copy">
          <p className="bp-eyebrow bp-eyebrow-light">YR PROSERVICE · DENTAL EQUIPMENT & SUPPORT</p>
          <h1>Complete Dental<br/><span>Solutions for Your Clinic</span></h1>
          <p>Quality equipment. Professional service. Long-term support.</p>
          <div className="bp-actions"><Link to="/products" navigate={navigate} className="bp-btn bp-btn-primary">Explore Products <b>→</b></Link><Link to="/services" navigate={navigate} className="bp-btn bp-btn-outline">Our Services</Link></div>
          <div className="bp-hero-proof"><span>Dental equipment</span><i>•</i><span>Installation</span><i>•</i><span>Technical support</span></div>
        </div>
      </div>
      <div className="bp-hero-cards container">
        <div><strong>01</strong><h3>Trusted Products</h3><p>Established dental equipment brands selected for clinic use.</p></div>
        <div><strong>02</strong><h3>Technical Know-how</h3><p>Practical knowledge for installation, maintenance and support.</p></div>
        <div><strong>03</strong><h3>One Reliable Partner</h3><p>Equipment supply and technical support through one team.</p></div>
      </div>
    </section>

    <section className="bp-section bp-provide">
      <div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">WHAT WE PROVIDE</p><h2>Complete Dental Solutions<br/>for Your Practice</h2></div><p>From essential equipment to technical support, we help clinics plan, equip and maintain their dental environment.</p></div>
        <div className="bp-provide-grid">{provide.map(([n,title,text,icon,to]) => <article key={n} className="bp-provide-card"><div className="bp-icon">{icon}</div><span>{n}</span><h3>{title}</h3><p>{text}</p><Link to={to} navigate={navigate}>Explore <b>→</b></Link></article>)}</div>
      </div>
    </section>

    <section className="bp-home-editorial">
      <div className="container bp-editorial-grid">
        <div className="bp-editorial-copy"><p className="bp-eyebrow">A CLOSER LOOK</p><h2>Equipment should fit the way your clinic works.</h2><p>Browse individual products, compare the information available and use the dedicated detail pages before deciding what you want included in your quotation.</p><Link to="/products" navigate={navigate} className="bp-text-link">Browse the catalogue <b>→</b></Link></div>
        <div className="bp-editorial-feature"><img src="/assets/product-delivery.jpg" alt="Dental equipment delivery and setup"/><div><span>01</span><strong>From selection to support</strong><p>Products, installation and technical service connected in one workflow.</p></div></div>
      </div>
    </section>

    <section className="bp-featured">
      <div className="container"><div className="bp-section-head bp-head-light"><div><p className="bp-eyebrow bp-eyebrow-light">FEATURED PRODUCTS</p><h2>Equipment for Modern Clinics</h2></div><Link to="/products" navigate={navigate} className="bp-outline-light">View All Products →</Link></div>
        <div className="bp-product-grid">{featured.map(p => <article className="bp-product-card" key={p.slug}><Link to={`/products/${p.slug}`} navigate={navigate}><div className="bp-product-img"><img src={p.img} alt={p.name}/></div><div className="bp-product-body"><small>{p.brand || 'YR Proservice'}</small><h3>{p.name}</h3><p>{p.summary}</p><span>View Details →</span></div></Link></article>)}</div>
      </div>
    </section>

    <section className="bp-brands">
      <div className="container"><div className="bp-section-head"><div><p className="bp-eyebrow">OUR BRANDS</p><h2>Trusted Brands We Carry</h2></div><p>We work with established manufacturers and equipment brands across the dental field.</p></div><div className="bp-brand-grid">{brands.map(file => <div className="bp-brand-card" key={file}><img src={`/brand logo/fitted/${file.replace(/\.[^.]+$/, '.png')}`} alt="Dental equipment brand"/></div>)}</div></div>
    </section>

    <section className="bp-services-strip">
      <div className="container"><div className="bp-services-banner"><img src="/assets/services-technician.jpg" alt="Dental equipment technical service"/><div className="bp-services-copy"><p className="bp-eyebrow bp-eyebrow-light">OUR SERVICES</p><h2>Technical support that keeps your clinic moving.</h2><p>Installation, maintenance, repair and practical technical support for dental equipment.</p><Link to="/services" navigate={navigate} className="bp-btn bp-btn-primary">View Services →</Link></div></div></div>
    </section>

    <section className="bp-why"><div className="container"><div className="bp-section-head"><div><p className="bp-eyebrow">WHY YR PROSERVICE</p><h2>Built Around Your Practice</h2></div><p>Our approach connects equipment, technical knowledge and responsive support.</p></div><div className="bp-why-grid"><div><b>01</b><h3>Reliable equipment</h3><p>Products from established dental brands and practical clinic solutions.</p></div><div><b>02</b><h3>Professional support</h3><p>Technical assistance that considers installation and real working conditions.</p></div><div><b>03</b><h3>Long-term relationship</h3><p>Support doesn't stop when the equipment is delivered.</p></div></div></div></section>

    <section className="bp-final-cta"><div className="container"><div><p className="bp-eyebrow bp-eyebrow-light">READY TO GET STARTED?</p><h2>Let's Build a Better Dental Practice Together.</h2><p>Tell us what your clinic needs and our team can help you plan the next step.</p></div><div className="bp-actions"><Link to="/products" navigate={navigate} className="bp-btn bp-btn-white">Explore Products →</Link><Link to="/services" navigate={navigate} className="bp-btn bp-btn-outline-white">Explore Services</Link></div></div></section>
  </main>;
}
