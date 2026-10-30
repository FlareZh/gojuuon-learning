#!/usr/bin/env node
/**
 * One-time (or refresh) download of stroke-order GIFs from 小楠日语's
 * official pack linked on https://riyutool.com/50yintu-bishun/
 *
 * Pack URL: https://down.riyutool.com/download/50yintubishun.zip
 * Uses the page's「打包下载」zip — does not scrape per-file CDN URLs.
 *
 * Usage: node scripts/fetch-strokes.mjs
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { copyFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ZIP_URL = "https://down.riyutool.com/download/50yintubishun.zip";
const REFERER = "https://riyutool.com/50yintu-bishun/";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_HIRA = join(ROOT, "public/strokes/hiragana");
const OUT_KATA = join(ROOT, "public/strokes/katakana");

async function main() {
  const work = join(tmpdir(), `gojuuon-strokes-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const zipPath = join(work, "50yintubishun.zip");

  console.log("Downloading official pack…");
  const res = await fetch(ZIP_URL, {
    headers: {
      "User-Agent": "gojuuon-learning-stroke-fetch/1.0",
      Referer: REFERER,
    },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));
  const size = (await stat(zipPath)).size;
  console.log(`Saved ${zipPath} (${size} bytes)`);

  // Source pack uses Chinese Windows (GBK) zip entry names
  const extractDir = join(work, "extracted");
  mkdirSync(extractDir, { recursive: true });
  execFileSync(
    "python3",
    [
      "-c",
      `
import zipfile
from pathlib import Path
zf = zipfile.ZipFile(${JSON.stringify(zipPath)})
out = Path(${JSON.stringify(extractDir)})
for info in zf.infolist():
    name = info.filename.encode("cp437").decode("gbk")
    target = out / name
    if info.is_dir():
        target.mkdir(parents=True, exist_ok=True)
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    with zf.open(info) as src, open(target, "wb") as dst:
        dst.write(src.read())
print("ok")
`,
    ],
    { stdio: "inherit" },
  );

  const packRoot = join(extractDir, "五十音图笔顺动图");
  const kataRoot = join(packRoot, "片假名");
  if (!existsSync(packRoot) || !existsSync(kataRoot)) {
    throw new Error("Unexpected zip layout after extract");
  }

  for (const dir of [OUT_HIRA, OUT_KATA]) {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".gif")) rmSync(join(dir, f));
    }
  }

  await copyGifs(packRoot, OUT_HIRA);
  await copyGifs(kataRoot, OUT_KATA);

  console.log(`Hiragana: ${countGifs(OUT_HIRA)}`);
  console.log(`Katakana: ${countGifs(OUT_KATA)}`);
  console.log("Done. Source: 小楠日语 / riyutool.com (official zip pack).");
  rmSync(work, { recursive: true, force: true });
}

function countGifs(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".gif")).length;
}

async function copyGifs(fromDir, toDir) {
  for (const name of readdirSync(fromDir)) {
    if (!name.endsWith(".gif")) continue;
    const destName = name === "hu.gif" ? "fu.gif" : name;
    await copyFile(join(fromDir, name), join(toDir, destName));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
