#!/usr/bin/env node
/**
 * Remove emoji characters from source files in src/.
 * Usage:
 *   node scripts/remove-emojis.mjs          # list files containing emojis
 *   node scripts/remove-emojis.mjs --fix     # remove emojis in place
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

// Match common UI emojis (Unicode code points) and variation selector
const EMOJI_REGEX = /[\u2705\u26A0\uFE0F\u2713\u{1F512}\u{1F513}\u{1F4DD}\u{1F7E2}\u{1F534}\u{1F535}\u{26AA}\u{1F50D}\u{1F3B2}\u{23F3}\u{2192}\u{2197}]/gu;

function* walk(dir, ext = /\.(tsx?|jsx?|mjs|cjs)$/) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") {
      yield* walk(full, ext);
    } else if (e.isFile() && ext.test(e.name)) {
      yield full;
    }
  }
}

const fix = process.argv.includes("--fix");
const files = [...walk(SRC)];
let total = 0;

if (files.length === 0) {
  console.log("No source files found under src/.");
  process.exit(0);
}

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const cleaned = raw.replace(EMOJI_REGEX, "");
  const count = (raw.match(EMOJI_REGEX) || []).length;
  if (count > 0) {
    const rel = file.replace(ROOT + "/", "");
    console.log(`${rel}: ${count} emoji(s) found`);
    total += count;
    if (fix) {
      writeFileSync(file, cleaned, "utf8");
      console.log(`  -> fixed`);
    }
  }
}

if (total === 0) {
  console.log("No emojis found in src/.");
} else if (fix) {
  console.log(`\nRemoved ${total} emoji(s).`);
} else {
  console.log(`\nTotal: ${total} emoji(s). Run: npm run remove-emojis:fix to remove them.`);
}
