// Generates store.config.json (the EAS Metadata config) from the single source of
// truth for the listing copy, docs/app-store-listing.md, so the two cannot drift.
// Run `npm run store-config` after editing that document. Re-reads the existing
// store.config.json for the advisory answers and release strategy, which came from
// `eas metadata:pull` against the live 1.0 listing and are not duplicated in prose.
//
// Deliberately omitted: `apple.review` (its demo password would be committed in
// plain text) and screenshots (EAS Metadata does not manage them).

import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

if (!existsSync('docs/app-store-listing.md')) {
  console.error('run this from the repo root (npm run store-config)');
  process.exit(1);
}

const doc = readFileSync('docs/app-store-listing.md', 'utf8');
const lines = doc.split('\n');

// Return the first fenced code block that starts after the line matching `after`.
function blockAfter(after, { from = 0 } = {}) {
  const start = lines.findIndex((l, i) => i >= from && after.test(l));
  if (start === -1) throw new Error(`heading not found: ${after}`);
  const open = lines.findIndex((l, i) => i > start && l.trim() === '```');
  if (open === -1) throw new Error(`no code fence after: ${after}`);
  const close = lines.findIndex((l, i) => i > open && l.trim() === '```');
  if (close === -1) throw new Error(`unterminated code fence after: ${after}`);
  return lines.slice(open + 1, close);
}

// The doc hard-wraps prose at ~78 columns for readability. App Store Connect
// renders every newline literally, so rejoin each paragraph onto one line and
// keep only the blank-line breaks between them. An all-caps section heading is
// its own line in the listing even though no blank line follows it in the doc.
const isHeading = (line) => line.length > 1 && !/[a-z]/.test(line) && /[A-Z]/.test(line);

function unwrap(block) {
  return block
    .join('\n')
    .split(/\n{2,}/)
    .map((paragraph) => {
      const segments = [];
      let prose = [];
      const flush = () => {
        if (prose.length) segments.push(prose.join(' '));
        prose = [];
      };
      for (const raw of paragraph.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        if (isHeading(line)) {
          flush();
          segments.push(line);
        } else {
          prose.push(line);
        }
      }
      flush();
      return segments.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

const title = blockAfter(/^\*\*App Name\*\*/)[0].trim();
const subtitle = blockAfter(/^\*\*Subtitle\*\*/)[0].trim();
const promoText = unwrap(blockAfter(/^## Promotional Text/));
const description = unwrap(blockAfter(/^## Description/));
const releaseNotes = unwrap(blockAfter(/^## What's New \(1\.2\)/));
const keywords = blockAfter(/^## Keywords/)[0].trim();

const existing = JSON.parse(readFileSync('store.config.json', 'utf8'));

// The framed 6.9" set from scripts/frame-screenshots.py, in listing order. APP_IPHONE_67
// is App Store Connect's 6.7"/6.9" slot, which takes 1320x2868. The files are
// gitignored, so refuse to write a config that points at screenshots that aren't there.
const SCREENSHOT_DIR = 'store-screenshots/1.2';
const SCREENSHOTS = [
  '1-dashboard', '2-new-ledger', '3-ledgers', '4-property', '5-add', '6-reports', '7-household',
].map((name) => `${SCREENSHOT_DIR}/${name}.png`);
const missing = SCREENSHOTS.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`missing screenshots (run scripts/frame-screenshots.py): ${missing.join(', ')}`);
  process.exit(1);
}

const config = {
  configVersion: existing.configVersion,
  apple: {
    version: '1.2',
    copyright: '2026 True Organic Hub LLC',
    categories: ['FINANCE', 'BUSINESS'],
    release: existing.apple.release,
    info: {
      'en-US': {
        title,
        subtitle,
        promoText,
        description,
        keywords: [keywords],
        releaseNotes,
        privacyPolicyUrl: 'https://tanveernyc.github.io/PropertyLedger/privacy.html',
        supportUrl: 'https://tanveernyc.github.io/PropertyLedger/support.html',
        screenshots: { APP_IPHONE_67: SCREENSHOTS },
      },
    },
    advisory: existing.apple.advisory,
  },
};

const limits = { title: 30, subtitle: 30, promoText: 170, description: 4000, releaseNotes: 4000 };
const info = config.apple.info['en-US'];
let bad = 0;
for (const [field, max] of Object.entries(limits)) {
  const n = info[field].length;
  console.log(`${n <= max ? 'ok  ' : 'OVER'} ${field}: ${n}/${max}`);
  if (n > max) bad++;
}
const kw = info.keywords.join(',');
console.log(`${kw.length <= 100 ? 'ok  ' : 'OVER'} keywords: ${kw.length}/100`);
if (kw.length > 100) bad++;
if (/,\s/.test(kw)) { console.log('OVER keywords: space after a comma'); bad++; }
if (bad) { console.error(`\n${bad} field(s) out of bounds — not writing`); process.exit(1); }

writeFileSync('store.config.json', JSON.stringify(config, null, 2) + '\n');
console.log('\nwrote store.config.json');
