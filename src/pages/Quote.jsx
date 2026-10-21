import React,{useMemo,useState} from 'react';
import {useCart} from '../components/CartContext';
import {useChairRequests} from '../components/ChairRequestContext';
import {Link} from '../components/Layout';

export default function Quote({navigate}){
  const {items}=useCart();
  const {items:chairItems}=useChairRequests();
  const [sent,setSent]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [reference,setReference]=useState('');
  const initial=new URLSearchParams(window.location.search).get('product')||'';
  const [product,setProduct]=useState(initial);
  const selected=useMemo(()=>{
    const lines=[...items.map(i=>`${i.name} (Qty: ${i.quantity})`),...chairItems.map(i=>`${i.name} (Chair request · Qty: ${i.quantity})`)];
    return product || lines.join('\n');
  },[items,chairItems,product]);
  async function submit(e){
    e.preventDefault();
    if(submitting) return;
    setSubmitting(true);
    setError('');
    const form=e.currentTarget;
    const f=new FormData(e.currentTarget);
    const payload={
      requestType:'quotation',
      name:String(f.get('name')||'').trim(),
      clinic:String(f.get('clinic')||'').trim(),
      email:String(f.get('email')||'').trim(),
      phone:String(f.get('phone')||'').trim(),
      location:String(f.get('location')||'').trim(),
      product:String(f.get('product')||'').trim(),
      message:String(f.get('message')||'').trim(),
    };
    if(!payload.product&&!payload.message){
      setError('Please select a product or chair, or describe your quotation requirements.');
      setSubmitting(false);
      return;
    }
    try{
      const response=await fetch('/api/requests',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.ok||!result.reference){
        throw new Error(result.error||'We could not submit your quotation request. Please try again.');
      }
      setReference(result.reference);
      setSent(true);
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(submitError){
      setError(submitError.message||'Unable to reach the request service. Please check your connection and try again.');
    }finally{
      setSubmitting(false);
    }
  }
  if(sent)return <main className="bp-quote"><div className="container bp-success"><p className="bp-eyebrow">QUOTATION REQUEST</p><h1>Your quotation request has been received.</h1><p>Your request has been saved successfully. Please keep this reference number for your records.</p><p className="bp-quote-reference"><strong>Reference: {reference}</strong></p><div className="bp-actions"><Link to="/products" navigate={navigate} className="bp-btn bp-btn-primary">Continue Shopping</Link><Link to="/cart" navigate={navigate} className="bp-btn bp-btn-outline-blue">Back to Cart</Link></div></div></main>;
  return <main className="bp-quote"><section className="bp-quote-top"><div className="container"><p className="bp-eyebrow bp-eyebrow-light">REQUEST A QUOTATION</p><h1>Tell Us What Your Clinic Needs</h1><p>This is the final quotation step after selecting products or dental chairs.</p></div></section><section className="container bp-quote-grid"><form className="bp-form" onSubmit={submit}><div className="bp-form-row"><label>Name *<input required name="name" placeholder="Your name"/></label><label>Email *<input required type="email" name="email" placeholder="Email address"/></label></div><div className="bp-form-row"><label>Company / Clinic<input name="clinic" placeholder="Clinic name"/></label><label>Phone<input name="phone" placeholder="Phone number"/></label></div><div className="bp-form-row"><label>Location<input name="location" placeholder="City / State"/></label><label>Product / Chair Selection<textarea name="product" rows="4" value={selected} onChange={e=>setProduct(e.target.value)} placeholder="Your selected products will appear here..."/></label></div><label>Message / Requirements<textarea name="message" rows="6" placeholder="Tell us more about your requirements..."/></label>{error && <p role="alert" aria-live="polite">{error}</p>}<button className="bp-btn bp-btn-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting Request…' : 'Submit Quotation Request →'}</button></form><aside className="bp-quote-help"><img src="/assets/about-team.jpg" alt="YR Proservice team"/><div><p className="bp-eyebrow">NEED HELP?</p><h3>Our team can help clarify the requirement.</h3><p>For product and service questions, use this quotation route. For other enquiries, call or email our team using the contact details in the page footer.</p><strong><a href="tel:+601116080623">011-1608 0623</a></strong><strong><a href="mailto:yr.proservice@gmail.com">yr.proservice@gmail.com</a></strong></div></aside></section></main>;
}
