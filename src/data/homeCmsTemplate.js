export const homeCmsTemplate = {
  sections: [
    {
      id: "home-hero",
      type: "hero",
      visible: true,
      order: 1,
      layout: { variant: "split" },
      content: {
        eyebrow: "YR PROSERVICE · DENTAL EQUIPMENT & SUPPORT",
        heading: "Complete Dental",
        headingHighlight: "Solutions for Your Clinic",
        description: "Quality equipment. Professional service. Long-term support.",
        imageUrl: "/assets/hero-operatory.jpg",
        imageAlt: "Modern dental operatory",
        buttonText: "Explore Products",
        buttonUrl: "/products",
        secondaryButtonText: "Our Services",
        secondaryButtonUrl: "/services",
        proofItems: ["Dental equipment", "Installation", "Technical support"],
        trustCards: [
          { number: "01", heading: "Trusted Products", description: "Established dental equipment brands selected for clinic use." },
          { number: "02", heading: "Technical Know-how", description: "Practical knowledge for installation, maintenance and support." },
          { number: "03", heading: "One Reliable Partner", description: "Equipment supply and technical support through one team." }
        ]
      }
    },
    {
      id: "home-provide",
      type: "feature-grid",
      visible: true,
      order: 2,
      layout: { variant: "standard" },
      content: {
        eyebrow: "WHAT WE PROVIDE",
        heading: "Complete Dental Solutions for Your Practice",
        description: "From essential equipment to technical support, we help clinics plan, equip and maintain their dental environment.",
        items: [
          { number: "01", heading: "Dental Equipment", description: "Dental chairs, handpieces, machines and essential equipment for modern clinics.", icon: "▣", url: "/products" },
          { number: "02", heading: "Installation", description: "Professional setup and installation support for dental equipment and clinic systems.", icon: "⌁", url: "/services/dental-chair-installation" },
          { number: "03", heading: "Technical Service", description: "Repair, preventive maintenance and practical troubleshooting support.", icon: "⚙", url: "/services/repair-technical-support" },
          { number: "04", heading: "Clinic Support", description: "Guidance from equipment selection through ongoing technical support.", icon: "✦", url: "/quote" }
        ]
      }
    },
    {
      id: "home-editorial",
      type: "editorial",
      visible: true,
      order: 3,
      layout: { variant: "split" },
      content: {
        eyebrow: "A CLOSER LOOK",
        heading: "Equipment should fit the way your clinic works.",
        description: "Browse individual products, compare the information available and use the dedicated detail pages before deciding what you want included in your quotation.",
        imageUrl: "/assets/product-delivery.jpg",
        imageAlt: "Dental equipment delivery and setup",
        imageNumber: "01",
        imageTitle: "From selection to support",
        imageDescription: "Products, installation and technical service connected in one workflow.",
        buttonText: "Browse the catalogue",
        buttonUrl: "/products"
      }
    },
    {
      id: "home-featured",
      type: "product-grid",
      visible: true,
      order: 4,
      layout: { variant: "standard" },
      content: {
        eyebrow: "FEATURED PRODUCTS",
        heading: "Equipment for Modern Clinics",
        buttonText: "View All Products",
        buttonUrl: "/products",
        productSlugs: ["signo-t100", "mocom-m10", "westcode-m-l530-straight-handpiece", "morita-lubrina-2"]
      }
    },
    {
      id: "home-brands",
      type: "brand-grid",
      visible: true,
      order: 5,
      layout: { variant: "standard" },
      content: {
        eyebrow: "OUR BRANDS",
        heading: "Trusted Brands We Carry",
        description: "We work with established manufacturers and equipment brands across the dental field.",
        items: ["morita.png", "mocom.png", "melag.jfif", "durr.png", "cattani.jfif", "cingol.jfif", "westcode.png", "ems.jfif", "fussen.png", "nishika.png", "vrn.png", "baolai.png", "xline.png"]
      }
    },
    {
      id: "home-services",
      type: "services-banner",
      visible: true,
      order: 6,
      layout: { variant: "banner" },
      content: {
        eyebrow: "OUR SERVICES",
        heading: "Technical support that keeps your clinic moving.",
        description: "Installation, maintenance, repair and practical technical support for dental equipment.",
        imageUrl: "/assets/services-technician.jpg",
        imageAlt: "Dental equipment technical service",
        buttonText: "View Services",
        buttonUrl: "/services"
      }
    },
    {
      id: "home-why",
      type: "benefits-grid",
      visible: true,
      order: 7,
      layout: { variant: "standard" },
      content: {
        eyebrow: "WHY YR PROSERVICE",
        heading: "Built Around Your Practice",
        description: "Our approach connects equipment, technical knowledge and responsive support.",
        items: [
          { number: "01", heading: "Reliable equipment", description: "Products from established dental brands and practical clinic solutions." },
          { number: "02", heading: "Professional support", description: "Technical assistance that considers installation and real working conditions." },
          { number: "03", heading: "Long-term relationship", description: "Support doesn't stop when the equipment is delivered." }
        ]
      }
    },
    {
      id: "home-cta",
      type: "cta",
      visible: true,
      order: 8,
      layout: { variant: "split" },
      content: {
        eyebrow: "READY TO GET STARTED?",
        heading: "Let's Build a Better Dental Practice Together.",
        description: "Tell us what your clinic needs and our team can help you plan the next step.",
        buttonText: "Explore Products",
        buttonUrl: "/products",
        secondaryButtonText: "Explore Services",
        secondaryButtonUrl: "/services"
      }
    }
  ]
};
