import React from "react";
import { products } from "../data/products";

export default function GenericCmsRenderer({ content, navigate }) {
  const sections=[...(content?.sections||[])].filter(s=>s.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  return <main className="cms-generic-page">{sections.map(section=>{
    const c=section.content||{}, key=section.id||section.type;
    const go=()=>c.buttonUrl&&navigate(c.buttonUrl);
    if(section.type==="hero")return <section className="cms-generic-hero" key={key}><div><small>{c.eyebrow}</small><h1>{c.heading} {c.headingHighlight}</h1><p>{c.description}</p>{c.buttonText&&<button onClick={go}>{c.buttonText}</button>}</div>{c.imageUrl&&<img src={c.imageUrl} alt={c.imageAlt||""}/>}</section>;
    if(section.type==="product-grid")return <section className="cms-generic-section" key={key}><small>{c.eyebrow}</small><h2>{c.heading||"Products"}</h2><div className="cms-generic-cards">{(c.productSlugs||[]).map(slug=>products.find(p=>p.slug===slug)).filter(Boolean).map(p=><article key={p.slug}><img src={p.img} alt={p.name}/><h3>{p.name}</h3><p>{p.summary}</p><button onClick={()=>navigate("/products/"+p.slug)}>View details</button></article>)}</div></section>;
    if(section.type==="brand-grid")return <section className="cms-generic-section" key={key}><small>{c.eyebrow}</small><h2>{c.heading}</h2><p>{c.description}</p><div className="cms-generic-brands">{(c.items||[]).map(x=><span key={x}>{String(x).replace(/\.[^.]+$/,"")}</span>)}</div></section>;
    const items=Array.isArray(c.items)?c.items:[];
    return <section className={"cms-generic-section cms-generic-"+section.type} key={key}><small>{c.eyebrow}</small><h2>{c.heading}</h2><p>{c.description}</p>{c.imageUrl&&<img className="cms-generic-image" src={c.imageUrl} alt={c.imageAlt||""}/ >}{items.length>0&&<div className="cms-generic-cards">{items.map((item,i)=><article key={item.id||item.slug||i}><strong>{item.number||item.title||item.heading}</strong><h3>{item.heading||item.title}</h3><p>{item.description||item.text}</p>{item.url&&<button onClick={()=>navigate(item.url)}>Explore</button>}</article>)}</div>}{c.buttonText&&<button onClick={go}>{c.buttonText}</button>}</section>;
  })}</main>;
}
