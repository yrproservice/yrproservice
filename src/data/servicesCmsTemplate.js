import { services } from "./services";

export const servicesCmsTemplate = {
  sections: [{
    id: "services-page",
    type: "services-page",
    visible: true,
    order: 1,
    content: {
      hero: {
        eyebrow: "YR Proservice · Technical Services",
        title: "Dental Equipment Services",
        lead: "From clinic planning and equipment installation to emergency repair, preventive maintenance and safety support, we help keep your dental practice operating smoothly.",
        imageUrl: "/assets/services-technician.jpg",
        imageAlt: "Dental equipment technical service",
        badgeTitle: "Technical Support",
        badgeText: "Installation · Maintenance · Repair"
      },
      intro: {
        eyebrow: "What we do",
        title: "Practical technical support for your dental clinic.",
        body: "Our services cover the key stages of your equipment journey — from planning a treatment room and installing equipment to keeping systems maintained, repaired and properly documented."
      },
      listing: {
        eyebrow: "Our services",
        title: "Technical services for dental practices",
        description: "Explore each service to see what is included and send us an enquiry when you are ready.",
        items: services.map((service) => ({ ...service, points: [...service.points] }))
      },
      process: {
        eyebrow: "How we work",
        title: "A clear process from enquiry to service completion.",
        steps: [
          { number: "01", title: "Tell us what you need", text: "Share your clinic, equipment and service requirement with our team." },
          { number: "02", title: "Review and plan", text: "We review the requirement and determine the appropriate service approach." },
          { number: "03", title: "Carry out the work", text: "Our technical team performs the agreed work with attention to safety and function." },
          { number: "04", title: "Test and handover", text: "We check the completed work and explain the service outcome to you." }
        ]
      },
      cta: {
        eyebrow: "Need dental equipment support?",
        title: "Let's keep your practice running.",
        body: "Whether you need planning, repair, maintenance or compliance support, tell us what you need and our team can review the requirement with you.",
        serviceButton: "Request a Service",
        serviceUrl: "/service-request",
        quoteButton: "Request a Quotation",
        quoteUrl: "/quote"
      }
    },
    layout: { variant: "original-services-layout" }
  }]
};

export function getServicesCmsContent(content) {
  const incoming = content?.sections?.find((section) => section?.type === "services-page")?.content;
  if (!incoming || typeof incoming !== "object") return null;
  const base = servicesCmsTemplate.sections[0].content;
  const items = Array.isArray(incoming.listing?.items) ? incoming.listing.items : base.listing.items;
  const steps = Array.isArray(incoming.process?.steps) ? incoming.process.steps : base.process.steps;
  return {
    hero: { ...base.hero, ...(incoming.hero || {}) },
    intro: { ...base.intro, ...(incoming.intro || {}) },
    listing: { ...base.listing, ...(incoming.listing || {}), items },
    process: { ...base.process, ...(incoming.process || {}), steps },
    cta: { ...base.cta, ...(incoming.cta || {}) }
  };
}
