export const teamCmsTemplate = {
  sections: [{
    id: "team-page",
    type: "team-page",
    visible: true,
    order: 1,
    content: {
      hero: {
        eyebrow: "About YR Proservice",
        title: "Behind every operatory is a system that needs to",
        highlight: "work.",
        lead: "YR Proservice supports dental clinics with equipment supply, installation, technical service and ongoing after-sales support.",
        meta: [
          { number: "01", label: "Equipment" },
          { number: "02", label: "Installation" },
          { number: "03", label: "Technical support" }
        ],
        imageUrl: "/assets/about-team.jpg",
        imageAlt: "YR Proservice dental equipment team",
        imageLabel: "YR PROSERVICE",
        imageSubLabel: "DENTAL EQUIPMENT"
      },
      story: {
        number: "01",
        eyebrow: "Our approach",
        title: "More than supplying equipment.",
        lead: "Our work connects products with the practical requirements of a working dental clinic. From selecting equipment to installation, maintenance and repair, we focus on making equipment projects easier to coordinate and simpler to maintain after installation.",
        noteLabel: "THE YR APPROACH",
        noteTitle: "Equipment + technical support + follow-through",
        noteText: "One connected workflow for the equipment behind your practice."
      },
      process: {
        eyebrow: "How we work",
        title: "From requirement to ongoing support.",
        description: "Our role can begin before an equipment purchase and continue after installation.",
        steps: [
          { number: "01", title: "Understand", text: "We start with the clinic requirement, space, equipment and practical workflow." },
          { number: "02", title: "Plan", text: "Equipment, installation needs and technical requirements are coordinated before work begins." },
          { number: "03", title: "Deliver", text: "Products and technical work are carried through with attention to setup and usability." },
          { number: "04", title: "Support", text: "After installation, we remain available for service, maintenance and equipment enquiries." }
        ]
      },
      capabilities: {
        eyebrow: "What we do",
        title: "Built around real clinic needs.",
        description: "Our capabilities connect equipment supply with the practical technical support required throughout its working life.",
        items: [
          { title: "Dental Equipment Supply", text: "A focused catalogue of dental equipment, accessories and clinic essentials for day-to-day operations." },
          { title: "Installation & Setup", text: "Practical support for equipment installation, operatory setup and coordination of site requirements." },
          { title: "Technical Service", text: "Repair, maintenance and troubleshooting support to help clinics keep equipment in service." },
          { title: "After-Sales Support", text: "Ongoing assistance for product enquiries, service requests and equipment-related follow-up." }
        ]
      },
      people: {
        eyebrow: "Our team",
        title: "People behind the service.",
        description: "Different functions work together to support equipment, service and customer requirements.",
        items: [
          { image: "/assets/team-1.jpg", imageAlt: "", title: "Technical Support", text: "Equipment guidance, troubleshooting and practical technical assistance." },
          { image: "/assets/team-2.jpg", imageAlt: "", title: "Installation & Service", text: "Installation coordination, servicing and on-site technical support." },
          { image: "/assets/team-3.jpg", imageAlt: "", title: "Customer Support", text: "Quotations, product enquiries and coordination with dental clinics." },
          { image: "/assets/team-4.jpg", imageAlt: "", title: "Project Coordination", text: "Planning and coordination for dental equipment and clinic requirements." }
        ]
      },
      cta: {
        eyebrow: "Let's work together",
        title: "Planning a dental equipment project?",
        body: "Talk to YR Proservice about products, installation, technical support or your clinic requirements.",
        quoteButton: "Request a Quote",
        quoteUrl: "/quote",
        servicesButton: "View Services",
        servicesUrl: "/services"
      }
    },
    layout: { variant: "original-team-layout" }
  }]
};

export function getTeamCmsContent(content) {
  const teamSection = content?.sections?.find((section) => section?.type === "team-page");
  const incoming = teamSection?.content;
  if (!incoming || typeof incoming !== "object") return null;
  const base = teamCmsTemplate.sections[0].content;
  const mergeItems = (group, key) => Array.isArray(incoming[group]?.[key]) ? incoming[group][key] : base[group][key];
  return {
    hero: { ...base.hero, ...(incoming.hero || {}), meta: mergeItems("hero", "meta") },
    story: { ...base.story, ...(incoming.story || {}) },
    process: { ...base.process, ...(incoming.process || {}), steps: mergeItems("process", "steps") },
    capabilities: { ...base.capabilities, ...(incoming.capabilities || {}), items: mergeItems("capabilities", "items") },
    people: { ...base.people, ...(incoming.people || {}), items: mergeItems("people", "items") },
    cta: { ...base.cta, ...(incoming.cta || {}) },
    design: teamSection?.design || {},
    sectionOrder: Array.isArray(content?.sectionOrder) ? content.sectionOrder : ["hero", "story", "process", "capabilities", "people", "cta"]
  };
}
