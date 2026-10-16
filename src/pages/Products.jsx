import React, { useMemo, useState } from 'react';
import { products } from '../data/products';
import { useCart } from '../components/CartContext';
import { useChairRequests } from '../components/ChairRequestContext';
import { Link } from '../components/Layout';

export default function Products({ navigate }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [brand, setBrand] = useState('All');
  const [addedSlug, setAddedSlug] = useState('');
  const { addToCart } = useCart();
  const { addChair } = useChairRequests();

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], []);
  const brands = useMemo(() => ['All', ...new Set(products.map(p => p.brand || 'Other'))], []);
  const filtered = useMemo(() => products.filter(p =>
    (category === 'All' || p.category === category) &&
    (brand === 'All' || (p.brand || 'Other') === brand) &&
    `${p.name} ${p.brand || ''} ${p.summary || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [search, category, brand]);
  const chairs = products.filter(p => p.purchaseType === 'quote');
  const showcaseChair = chairs.find(p => p.slug === 'signo-t100') || chairs[0];
  const spotlight = products.filter(p => ['mocom-m10','signo-t100','cingol-x3'].includes(p.slug));

  function handleAction(product) {
    if (product.purchaseType === 'quote') {
      addChair(product);
      navigate('/dental-chair-request');
      return;
    }
    addToCart(product);
    setAddedSlug(product.slug);
    window.setTimeout(() => setAddedSlug(current => current === product.slug ? '' : current), 1400);
  }

  return <main className="bp-products">
    <section className="products-showroom-hero">
      <div className="container products-showroom-grid">
        <div><p className="bp-eyebrow">YR PROSERVICE · PRODUCT SHOWROOM</p><h1>Equipment worth<br/><span>looking closer at.</span></h1><p>Explore dental chairs, handpieces and clinic equipment with dedicated product information and a clear quotation path.</p><div className="products-hero-stats"><span><b>{products.length}</b> products</span><span><b>{chairs.length}</b> chair models</span><span><b>{new Set(products.map(p=>p.brand)).size}</b> brands</span></div></div>
        <div className="products-hero-image"><img src={showcaseChair?.img} alt={showcaseChair?.name || 'Dental chair'}/><div className="products-hero-label"><small>{showcaseChair?.brand}</small><strong>{showcaseChair?.name}</strong><Link to={`/products/${showcaseChair?.slug}`} navigate={navigate}>View featured chair →</Link></div></div>
      </div>
    </section>

    <section className="bp-catalog"><div className="container">
      <div className="catalog-intro-v7"><div><p className="bp-eyebrow">THE SHOWROOM</p><h2>Choose by what you need.</h2></div><p>Start with a category, narrow by brand, then open a product detail to see the information available before adding it to your request.</p></div>
      <div className="bp-filter-tabs">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="bp-toolbar"><label className="catalog-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, brands or types..." aria-label="Search products"/></label><select value={brand} onChange={e => setBrand(e.target.value)}><option value="All">All Brands</option>{brands.slice(1).map(item => <option key={item}>{item}</option>)}</select><span>{filtered.length} products</span></div>

      <div className="spotlight-row">{spotlight.map((p,index)=><Link key={p.slug} to={`/products/${p.slug}`} navigate={navigate} className={`spotlight-card spotlight-${index+1}`}><div><p className="bp-eyebrow">{p.brand}</p><h3>{p.name}</h3><span>{p.brandLine}</span></div><img src={p.img} alt={p.name}/><b>Explore →</b></Link>)}</div>

      <div className="bp-catalog-grid">{filtered.map(product => <article className="bp-catalog-card" key={product.slug}>
        <Link to={`/products/${product.slug}`} navigate={navigate} className="bp-catalog-main-link">
          <div className="bp-catalog-image"><img src={product.img} onError={event => { event.currentTarget.src = '/favicon.png'; event.currentTarget.onerror = null; }} alt={product.name}/><span className="bp-image-badge">{product.purchaseType === 'quote' ? 'Request' : 'Catalogue'}</span></div>
          <div className="bp-catalog-body"><small>{product.brand || 'YR Proservice'}</small><h3>{product.name}</h3><span className="bp-product-type">{product.brandLine || product.category}</span><p>{product.summary}</p></div>
        </Link>
        <div className="bp-card-actions"><Link to={`/products/${product.slug}`} navigate={navigate} className="bp-card-detail">View Details <span>→</span></Link><button type="button" className="bp-card-action-primary" onClick={() => handleAction(product)}>{product.purchaseType === 'quote' ? 'Request Chair' : addedSlug === product.slug ? 'Added ✓' : 'Add to Cart'}</button></div>
      </article>)}</div>

      {!filtered.length && <div className="bp-empty"><h2>No products found</h2><p>Try another product name, brand or category.</p><button className="button" onClick={() => { setSearch(''); setCategory('All'); setBrand('All'); }}>Reset Catalogue</button></div>}
      <div className="bp-catalog-bottom"><div><p className="bp-eyebrow">NEED A HAND?</p><h2>Not sure which product fits?</h2><p>Send your clinic requirement through the quotation route and let us help narrow down the equipment.</p></div><Link to="/quote" navigate={navigate} className="bp-btn bp-btn-primary">Ask for Product Guidance →</Link></div>
    </div></section>
  </main>;
}
