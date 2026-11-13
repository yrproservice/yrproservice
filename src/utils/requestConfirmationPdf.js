const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 92;
const BLUE = "#0B4A88";
const CYAN = "#00C2FF";
const TEXT = "#1F2937";
const MUTED = "#687280";

function wrapText(context, value, maxWidth) {
  const words = String(value || "—").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

function buildPageCanvas(pageNumber, totalPages) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const context = canvas.getContext("2d");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.fillStyle = BLUE;
  context.fillRect(0, 0, PAGE_WIDTH, 250);
  context.fillStyle = CYAN;
  context.fillRect(0, 246, PAGE_WIDTH, 8);
  context.fillStyle = "#FFFFFF";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("YR PROSERVICE", MARGIN, 88);
  context.font = "400 22px Arial, sans-serif";
  context.fillText("DENTAL EQUIPMENT & TECHNICAL SERVICES", MARGIN, 132);
  context.font = "700 46px Arial, sans-serif";
  context.fillText("Request Confirmation", MARGIN, 208);
  context.fillStyle = MUTED;
  context.font = "400 18px Arial, sans-serif";
  context.fillText("YR Proservice | Request confirmation", PAGE_WIDTH - MARGIN - 390, PAGE_HEIGHT - 48);
  context.fillStyle = MUTED;
  context.fillRect(MARGIN, PAGE_HEIGHT - 78, PAGE_WIDTH - MARGIN * 2, 1);
  return { canvas, context, y: 320 };
}

function makePdf(jpegPages) {
  const encoder = new TextEncoder();
  const objects = [];
  const pageRefs = [];
  const imageRefs = [];
  const contentRefs = [];
  let nextId = 3;
  for (let i = 0; i < jpegPages.length; i += 1) {
    imageRefs.push(nextId++);
    contentRefs.push(nextId++);
    pageRefs.push(nextId++);
  }
  const kids = pageRefs.map((id) => `${id} 0 R`).join(" ");
  objects[1] = encoder.encode("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = encoder.encode(`<< /Type /Pages /Kids [${kids}] /Count ${jpegPages.length} >>`);
  jpegPages.forEach((page, index) => {
    const imageId = imageRefs[index];
    const contentId = contentRefs[index];
    const pageId = pageRefs[index];
    objects[imageId] = {
      binary: page.bytes,
      prefix: encoder.encode(
        `<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
      ),
      suffix: encoder.encode("\nendstream"),
    };
    const stream = encoder.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ");
    objects[contentId] = {
      binary: stream,
      prefix: encoder.encode(`<< /Length ${stream.length} >>\nstream\n`),
      suffix: encoder.encode("\nendstream"),
    };
    objects[pageId] = encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });

  const chunks = [encoder.encode("%PDF-1.4\n%YRPS\n")];
  const offsets = [0];
  let byteLength = chunks[0].length;
  for (let id = 1; id < nextId; id += 1) {
    offsets[id] = byteLength;
    chunks.push(encoder.encode(`${id} 0 obj\n`));
    byteLength += chunks[chunks.length - 1].length;
    const object = objects[id];
    if (object && object.prefix) {
      chunks.push(object.prefix, object.binary, object.suffix);
      byteLength += object.prefix.length + object.binary.length + object.suffix.length;
    } else {
      const bytes = object || encoder.encode("null");
      chunks.push(bytes);
      byteLength += bytes.length;
    }
    chunks.push(encoder.encode("\nendobj\n"));
    byteLength += 8;
  }
  const xrefOffset = byteLength;
  let xref = `xref\n0 ${nextId}\n0000000000 65535 f \n`;
  for (let id = 1; id < nextId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  const output = new Uint8Array(chunks.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of chunks) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function downloadRequestConfirmationPdf(data) {
  if (!data || !data.reference) return;
  const pages = [];
  let page = buildPageCanvas(1, 1);

  function ensureSpace(height) {
    if (page.y + height > PAGE_HEIGHT - 130) {
      pages.push(page.canvas);
      page = buildPageCanvas(pages.length + 1, 1);
    }
  }

  function sectionHeading(label) {
    ensureSpace(70);
    page.context.fillStyle = BLUE;
    page.context.font = "700 25px Arial, sans-serif";
    page.context.fillText(label.toUpperCase(), MARGIN, page.y);
    page.y += 28;
    page.context.fillStyle = CYAN;
    page.context.fillRect(MARGIN, page.y, 170, 5);
    page.y += 30;
  }

  function field(label, value) {
    const ctx = page.context;
    const labelWidth = 255;
    ctx.font = "700 20px Arial, sans-serif";
    const valueLines = wrapText(ctx, value || "—", PAGE_WIDTH - MARGIN * 2 - labelWidth - 20);
    const lineHeight = 30;
    const height = Math.max(42, valueLines.length * lineHeight + 10);
    ensureSpace(height);
    ctx.fillStyle = MUTED;
    ctx.font = "700 19px Arial, sans-serif";
    ctx.fillText(label, MARGIN, page.y);
    ctx.fillStyle = TEXT;
    ctx.font = "400 20px Arial, sans-serif";
    valueLines.forEach((line, index) => {
      ctx.fillText(line, MARGIN + labelWidth, page.y + index * lineHeight);
    });
    page.y += height;
  }

  function paragraph(label, value) {
    sectionHeading(label);
    const ctx = page.context;
    ctx.fillStyle = TEXT;
    ctx.font = "400 20px Arial, sans-serif";
    const lines = wrapText(ctx, value || "—", PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      ensureSpace(34);
      ctx.fillText(line, MARGIN, page.y);
      page.y += 31;
    }
    page.y += 16;
  }

  sectionHeading("Reference details");
  field("Reference number", data.reference);
  field("Request type", data.requestType === "service" ? "Service request" : data.requestType === "dental_chair" ? "Dental chair request" : "Quotation request");
  field("Submitted", data.submittedAt ? new Date(data.submittedAt).toLocaleString() : new Date().toLocaleString());
  page.y += 14;
  sectionHeading("Customer details");
  field("Name", data.name);
  field("Company / Clinic", data.clinic);
  field("Email", data.email);
  field("Phone", data.phone);
  if (data.requestType === "service") {
    field("Service required", data.serviceTitle || data.service);
    field("Preferred date / timing", data.timing);
  } else {
    field("Location", data.location);
  }
  if (data.requestType !== "service") {
    paragraph(data.requestType === "dental_chair" ? "Selected dental chairs" : "Products / chair selection", data.product);
  }
  paragraph(data.requestType === "service" ? "Service details / message" : "Additional message / requirements", data.message);
  ensureSpace(100);
  page.context.fillStyle = MUTED;
  page.context.font = "400 17px Arial, sans-serif";
  page.context.fillText("This document confirms receipt of your request. It is not a priced quotation or tax invoice.", MARGIN, page.y + 18);
  pages.push(page.canvas);

  const jpegPages = pages.map((canvas) => {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes };
  });
  const pdf = makePdf(jpegPages);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `YR-Proservice-${data.reference}-Confirmation.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
