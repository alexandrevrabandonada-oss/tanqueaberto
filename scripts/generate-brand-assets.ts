import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = path.join(process.cwd(), "public", "brand", "bomba-aberta");
const sourceRoot = path.join(process.cwd(), "public", "brand");

const iconDir = path.join(root, "icon");
const logoDir = path.join(root, "logo");
const emblemDir = path.join(root, "emblem");

const sources = {
  icon: path.join(sourceRoot, "mark-symbol.svg"),
  logo: path.join(sourceRoot, "mark-horizontal.svg"),
  emblem: path.join(sourceRoot, "mark-vertical.svg"),
  emblemOg: path.join(sourceRoot, "og-preview.svg")
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
  return svg
    .replace(/^\s*<rect width="(?:\d+)" height="(?:\d+)" rx="(?:\d+)" fill="#090909"\/>\s*/m, "")
    .replace(/^\s*<circle cx="(?:\d+)" cy="(?:\d+)" r="(?:\d+)" fill="#090909"\/>\s*/m, "");
}

async function writeAsset(file: string, contents: string) {
  await writeFile(file, contents, "utf8");
}

async function renderPng(svg: string, output: string, width: number, height: number) {
  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
}

async function main() {
  await ensureDirs();

  const iconSvg = await readSvg(sources.icon);
  const logoSvg = await readSvg(sources.logo);
  const emblemSvg = await readSvg(sources.emblem);
  const emblemOgSvg = await readSvg(sources.emblemOg);

  const logoTransparentSvg = stripBackground(logoSvg);
  const emblemTransparentSvg = stripBackground(emblemSvg);

  await writeAsset(path.join(iconDir, "bomba-aberta-icon.svg"), iconSvg);
  await writeAsset(path.join(logoDir, "bomba-aberta-logo-horizontal.svg"), logoTransparentSvg);
  await writeAsset(path.join(logoDir, "bomba-aberta-logo-horizontal-dark.svg"), logoSvg);
  await writeAsset(path.join(emblemDir, "bomba-aberta-emblem.svg"), emblemTransparentSvg);
  await writeAsset(path.join(emblemDir, "bomba-aberta-emblem-dark.svg"), emblemSvg);
  await writeAsset(path.join(emblemDir, "bomba-aberta-emblem-og.svg"), emblemOgSvg);

  await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-master-1024.png"), 1024, 1024);
  await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-512.png"), 512, 512);
  await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-192.png"), 192, 192);
  await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-maskable-512.png"), 512, 512);
  await renderPng(iconSvg, path.join(iconDir, "bomba-aberta-icon-maskable-192.png"), 192, 192);
  await renderPng(iconSvg, path.join(iconDir, "apple-touch-icon.png"), 180, 180);
  await renderPng(iconSvg, path.join(iconDir, "favicon-32.png"), 32, 32);
  await renderPng(iconSvg, path.join(iconDir, "favicon-16.png"), 16, 16);

  await renderPng(logoSvg, path.join(logoDir, "bomba-aberta-logo-horizontal-dark.png"), 1200, 420);
  await renderPng(emblemSvg, path.join(emblemDir, "bomba-aberta-emblem-dark.png"), 840, 980);
  await renderPng(emblemTransparentSvg, path.join(emblemDir, "bomba-aberta-emblem-transparent.png"), 840, 980);
  await renderPng(emblemOgSvg, path.join(emblemDir, "bomba-aberta-emblem-og.png"), 1200, 630);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
