import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();
const userAgent = "YR-Proservice-Catalogue-Media-Import/1.0 (product image verification)";
const sources = [
  {
    slug: "cattani-ac-400-q",
    model: "AC 400 Q",
    urls: [
      "https://www.cattani.com.au/wp-content/uploads/2025/05/013450-main.png",
      "https://www.westcoastdental.com.au/wp-content/uploads/2023/08/AC400Q-WEB.jpg",
    ],
  },
  {
    slug: "cattani-ac-600-q",
    model: "AC 600 Q",
    urls: [
      "https://cattani.com.au/wp-content/uploads/2018/03/AC600Q_Front-1.png",
    ],
  },
];

function inspectImage(buffer) {
  if (buffer.length < 12_000) throw new Error("Image file is unexpectedly small.");
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { extension: "png", mime: "image/png", width, height };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      while (buffer[offset] === 0xff) offset += 1;
      const marker = buffer[offset++];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        return { extension: "jpg", mime: "image/jpeg", width, height };
      }
      offset += length;
    }
    throw new Error("JPEG dimensions could not be verified.");
  }
  throw new Error("Downloaded content is not a supported PNG or JPEG image.");
}

async function downloadExactImage(spec) {
  const errors = [];
  for (const url of spec.urls) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": userAgent, Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) throw new Error("Unexpected content type: " + (contentType || "(missing)"));
      const buffer = Buffer.from(await response.arrayBuffer());
      const details = inspectImage(buffer);
      if (details.width < 500 || details.height < 500) {
        throw new Error("Image resolution is too small: " + details.width + "x" + details.height);
      }
      return { ...spec, url, buffer, ...details };
    } catch (error) {
      errors.push(url + " — " + String(error));
    }
  }
  throw new Error("Could not retrieve a verifiable image for " + spec.model + ":\n" + errors.join("\n"));
}

function setProductImage(content, slug, fileName) {
  const start = content.indexOf('slug: "' + slug + '"');
  if (start < 0) throw new Error("Product record not found: " + slug);
  const end = content.indexOf("\n  },", start);
  if (end < 0) throw new Error("Product record boundary not found: " + slug);
  const block = content.slice(start, end);
  const match = block.match(/image:\s*"([^"]*)"/);
  if (!match) throw new Error("Image field not found for " + slug);
  if (match[1] && match[1] !== fileName) {
    throw new Error("Refusing to overwrite existing image for " + slug + ": " + match[1]);
  }
  const updated = block.replace(/image:\s*"[^"]*"/, 'image: "' + fileName + '"');
  return content.slice(0, start) + updated + content.slice(end);
}

function addCatalogMediaEntry(content, fileName) {
  const entry = [
    "  {",
    '    "src": "/catalog/cattani/images/' + fileName + '",',
    '    "file": "' + fileName + '",',
    '    "folder": "cattani/images",',
    '    "brand": "cattani",',
    '    "category": "images"',
    "  },",
  ].join("\n");
  if (content.includes('"file": "' + fileName + '"')) return content;
  const marker = '    "file": "ac-600.jpg",';
  const position = content.indexOf(marker);
  if (position < 0) throw new Error("Could not find the Cattani image insertion point in catalogMedia.js");
  const end = content.indexOf("\n  },", position) + "\n  },".length;
  return content.slice(0, end) + "\n" + entry + content.slice(end);
}

const downloaded = await Promise.all(sources.map(downloadExactImage));
let products = await readFile(join(root, "src/data/products.js"), "utf8");
let catalogue = await readFile(join(root, "src/data/catalogMedia.js"), "utf8");

for (const item of downloaded) {
  item.fileName = item.slug === "cattani-ac-400-q"
    ? "ac-400-q." + item.extension
    : "ac-600-q." + item.extension;
  products = setProductImage(products, item.slug, item.fileName);
  catalogue = addCatalogMediaEntry(catalogue, item.fileName);
}

for (const item of downloaded) {
  const target = join(root, "public/catalog/cattani/images", item.fileName);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, item.buffer);
  console.log("Verified", item.model, item.fileName, item.width + "x" + item.height, item.buffer.length + " bytes", "source:", item.url);
}

await writeFile(join(root, "src/data/products.js"), products);
await writeFile(join(root, "src/data/catalogMedia.js"), catalogue);
console.log("Both exact-model product records and the CMS static-media catalogue have been updated.");
