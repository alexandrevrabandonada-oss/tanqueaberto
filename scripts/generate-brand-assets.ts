import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const publicRoot = path.join(process.cwd(), "public");
const root = path.join(publicRoot, "brand", "bomba-aberta");
const sourceRoot = path.join(publicRoot, "brand");

const iconDir = path.join(root, "icon");
const logoDir = path.join(root, "logo");
const emblemDir = path.join(root, "emblem");

const sources = {
  icon: path.join(sourceRoot, "mark-symbol.svg"),
  logo: path.join(sourceRoot, "mark-horizontal.svg"),
  emblem: path.join(sourceRoot, "mark-vertical.svg"),
  logoOg: path.join(sourceRoot, "og-preview.svg")
};

async function ensureDirs() {
  await mkdir(iconDir, { recursive: true });
  await mkdir(logoDir, { recursive: true });
  await mkdir(emblemDir, { recursive: true });
}

async function readSvg(file: string) {
  return readFile(file, "utf8");
}

function stripBackground(svg: string) {
  return svg.replace(/^\s*<rect[^>]*width="\d+"[^>]*height="\d+"[^>]*fill="#050505"\s*\/>\s*/m, "");
}

async function writeAsset(file: string, contents: string | Buffer) {
  await writeFile(file, contents);
}

async function renderPngBuffer(svg: string, width: number, height: number) {
  return sharp(Buffer.from(svg))
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function renderPng(svg: string, output: string, width: number, height: number) {
  const buffer = await renderPngBuffer(svg, width, height);
  await writeAsset(output, buffer);
  return buffer;
}

function createIco(images: Array<{ size: number; data: Buffer }>) {
  const count = images.length;
  const directory = Buffer.alloc(6 + count * 16);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(count, 4);

  let offset = directory.length;
  images.forEach((image, index) => {
    const entryOffset = 6 + index * 16;
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(image.data.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    offset += image.data.length;
  });

  return Buffer.concat([directory, ...images.map((image) => image.data)]);
}

async function main() {
  await ensureDirs();

  const iconSvg = await readSvg(sources.icon);
  const logoSvg = await readSvg(sources.logo);
  const emblemSvg = await readSvg(sources.emblem);
  const logoOgSvg = await readSvg(sources.logoOg);

  const logoTransparentSvg = stripBackground(logoSvg);
  const emblemTransparentSvg = stripBackground(emblemSvg);

  await writeAsset(path.join(iconDir, "bomba-aberta-icon.svg"), iconSvg);
  await writeAsset(path.join(logoDir, "bomba-aberta-logo-horizontal.svg"), logoTransparentSvg);
  await writeAsset(path.join(logoDir, "bomba-aberta-logo-horizontal-dark.svg"), logoSvg);
  await writeAsset(path.join(logoDir, "bomba-aberta-logo-og.svg"), logoOgSvg);
  await writeAsset(path.join(emblemDir, "bomba-aberta-emblem.svg"), emblemTransparentSvg);
  await writeAsset(path.join(emblemDir, "bomba-aberta-emblem-dark.svg"), emblemSvg);

  const icon1024 = await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-master-1024.png"), 1024, 1024);
  const icon512 = await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-512.png"), 512, 512);
  const icon192 = await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-192.png"), 192, 192);
  const maskable512 = await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-maskable-512.png"), 512, 512);
  const maskable192 = await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-maskable-192.png"), 192, 192);
  const appleTouch = await renderPng(iconSvg, path.join(iconDir, "apple-touch-icon.png"), 180, 180);
  const favicon48 = await renderPng(iconSvg, path.join(iconDir, "favicon-48.png"), 48, 48);
  const favicon32 = await renderPng(iconSvg, path.join(iconDir, "favicon-32.png"), 32, 32);
  const favicon16 = await renderPng(iconSvg, path.join(iconDir, "favicon-16.png"), 16, 16);

  await renderPng(logoSvg, path.join(logoDir, "bomba-aberta-logo-horizontal-dark.png"), 1200, 420);
  await renderPng(logoOgSvg, path.join(logoDir, "bomba-aberta-logo-og.png"), 1200, 630);
  await renderPng(emblemSvg, path.join(emblemDir, "bomba-aberta-emblem-dark.png"), 840, 980);
  await renderPng(emblemTransparentSvg, path.join(emblemDir, "bomba-aberta-emblem-transparent.png"), 840, 980);

  await writeAsset(path.join(publicRoot, "favicon.svg"), iconSvg);
  await writeAsset(path.join(publicRoot, "favicon-16.png"), favicon16);
  await writeAsset(path.join(publicRoot, "favicon-32.png"), favicon32);
  await writeAsset(path.join(publicRoot, "favicon-48.png"), favicon48);
  await writeAsset(path.join(publicRoot, "icon-192.png"), icon192);
  await writeAsset(path.join(publicRoot, "icon-512.png"), icon512);
  await writeAsset(path.join(publicRoot, "icon-master-1024.png"), icon1024);
  await writeAsset(path.join(publicRoot, "maskable-icon-192.png"), maskable192);
  await writeAsset(path.join(publicRoot, "maskable-icon-512.png"), maskable512);
  await writeAsset(path.join(publicRoot, "apple-touch-icon.png"), appleTouch);
  await writeAsset(path.join(publicRoot, "favicon.ico"), createIco([
    { size: 16, data: favicon16 },
    { size: 32, data: favicon32 },
    { size: 48, data: favicon48 }
  ]));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
