import sharp from "sharp";
import { writeFileSync } from "fs";

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512 },
];

async function createIcon(size) {
  const padding = Math.round(size * 0.22);
  const textSize = Math.round(size * 0.38);

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#0a0a0a"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      font-family="system-ui, sans-serif" font-weight="700"
      font-size="${textSize}px" fill="white">IM</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

for (const { name, size } of sizes) {
  const buf = await createIcon(size);
  writeFileSync(`public/icons/${name}`, buf);
  console.log(`Created public/icons/${name} (${size}x${size})`);
}
