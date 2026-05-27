const sharp = require(
  require("module").createRequire(require.resolve("next")).resolve("sharp"),
);
const fs = require("fs");
const path = require("path");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512 },
];

async function createIcon(name, size) {
  const r = Math.round(size * 0.15);
  const textSize = Math.round(size * 0.38);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      font-family="system-ui, sans-serif" font-weight="700"
      font-size="${textSize}px" fill="white">IM</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = path.join(__dirname, "..", "public", "icons", name);
  fs.writeFileSync(out, buf);
  console.log("Created " + out);
}

Promise.all(sizes.map((s) => createIcon(s.name, s.size))).catch(console.error);
