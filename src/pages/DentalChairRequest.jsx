import React, { useMemo, useState } from 'react';
import { useChairRequests } from '../components/ChairRequestContext';
import { useCart } from '../components/CartContext';
import { Link } from '../components/Layout';

export default function DentalChairRequest({ navigate }) {
  const { items, removeChair, clearChairs, updateChairQuantity, modelCount, count } = useChairRequests();
  const { cartCount } = useCart();
  const [sent, setSent] = useState(false);
  const selectedProducts = useMemo(() => items.map(item => `${item.name} x${item.quantity || 1}`).join(', '), [items]);

  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = ['DENTAL CHAIR REQUEST', `Name: ${form.get('name')}`, `Clinic / Company: ${form.get('clinic') || '-'}`, `Email: ${form.get('email')}`, `Phone: ${form.get('phone') || '-'}`, `Location: ${form.get('location') || '-'}`, `Dental Chair Model(s): ${form.get('product') || '-'}`, `Requirements: ${form.get('message') || '-'}`];
    window.location.href = `mailto:yr.proservice@gmail.com?subject=${encodeURIComponent('YR Proservice Dental Chair Request')}&body=${encodeURIComponent(lines.join('\n'))}`;
    setSent(true);
  }

  if (sent) return <section className="request-centre"><div className="container center bp-success"><p className="bp-eyebrow">DENTAL CHAIR REQUEST</p><h1>Your chair enquiry is ready.</h1><p>The request has been prepared in your email application. Send the email to complete your enquiry.</p><div className="bp-actions" style={{justifyContent:'center'}}><button className="bp-btn bp-btn-primary" onClick={() => navigate('/cart')}>Back to Product Cart</button><Link to="/products" navigate={navigate} className="bp-btn bp-btn-outline-blue">Browse More Products</Link></div></div></section>;

  return <main className="request-centre"><div className="container">
    <div className="request-heading"><p className="bp-eyebrow">REQUEST CENTRE · DENTAL CHAIRS</p><h1>Dental Chair Requests</h1><p>Select the chair model and quantity you need, then send the clinic and installation details with your quotation request.</p></div>
    <div className="request-tabs"><Link to="/cart" navigate={navigate} className="request-tab">Product Cart <span>{cartCount}</span></Link><Link to="/dental-chair-request" navigate={navigate} className="request-tab active">Dental Chair Requests <span>{count}</span></Link></div>
    {!items.length ? <div className="chair-request-empty"><h2>No dental chairs selected</h2><p>Choose a dental chair from the product catalogue to add it to this dedicated request list.</p><Link to="/products" navigate={navigate} className="button">Browse Dental Chairs →</Link></div> : <div className="request-layout">
      <section className="request-list-card"><div className="request-list-heading"><h2>Selected dental chairs</h2><span>{modelCount} model{modelCount === 1 ? '' : 's'} · {count} chair{count === 1 ? '' : 's'}</span></div>
        {items.map(item => <div className="request-item" key={item.slug}><div className="request-item-image"><img src={item.img} alt={item.name}/></div><div className="request-item-info"><small>{item.brand} · {item.brandLine || item.category}</small><h3>{item.name}</h3><p>{item.summary}</p><div className="quantity-control"><button type="button" onClick={() => updateChairQuantity(item.slug, item.quantity - 1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => updateChairQuantity(item.slug, item.quantity + 1)}>+</button></div></div><button className="text-button request-remove" onClick={() => removeChair(item.slug)}>Remove</button></div>)}
        <div className="request-actions"><button className="text-button clear-action" onClick={clearChairs}>Clear Chair Requests</button></div><div className="browse-more-row"><Link to="/products" navigate={navigate} className="button secondary browse-more-button">← Browse More Dental Chairs</Link></div>
      </section>
      <aside className="bp-cart-summary request-form-card"><p className="bp-eyebrow bp-eyebrow-light">CHAIR QUOTATION</p><h2>Tell Us About Your Clinic</h2><Link to="/quote" navigate={navigate} className="bp-btn bp-btn-outline-blue request-quote-link">Continue to Quotation →</Link><form className="form" onSubmit={handleSubmit}><input type="hidden" name="product" value={selectedProducts} readOnly/><label>Full Name<input required name="name" placeholder="Dr. Ali"/></label><label>Clinic / Company<input name="clinic" placeholder="Smile Dental Clinic"/></label><label>Email<input required type="email" name="email" placeholder="name@example.com"/></label><label>Phone<input name="phone" placeholder="011-000 0000"/></label><label className="form-full">Location<input name="location" placeholder="City / State"/></label><label className="form-full">Installation / Requirements<textarea name="message" rows="5" placeholder="New clinic setup, number of operatories, installation requirements, etc."/></label><button className="bp-btn bp-btn-primary" type="submit">Prepare Chair Request →</button></form></aside>
    </div>}
  </div></main>;
}
