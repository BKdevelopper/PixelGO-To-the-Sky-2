#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest description styling pass
 * =============================================================================
 *  The Welcome chapter set the house style for this book: grey body text, the
 *  thing being talked about picked out in colour, numbers in bold white,
 *  anything that can cost you something in red. Most of the other chapters were
 *  never given that treatment - they are plain sentences with no markup at all.
 *
 *  This pass puts every remaining description into the same palette. It does
 *  NOT rewrite anyone's wording: the words that come out are the words that
 *  went in, only coloured.
 *
 *  Two sources, because the book uses both:
 *    config/ftbquests/quests/lang/en_us.snbt   descriptions written inline
 *    kubejs/assets/kubejs/lang/en_us.json      descriptions reached by {ref}
 *
 *  Idempotent: a string that already contains a colour code is left alone, so
 *  the 228 descriptions that were already styled by hand are never touched and
 *  a second run does nothing.
 *
 *    node tools/pixelgo-quests/style.mjs --dry [--show N]
 *    node tools/pixelgo-quests/style.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const SHOW = (() => { const i = process.argv.indexOf('--show'); return i > 0 ? Number(process.argv[i + 1]) || 20 : 0; })();

const SNBT = path.join(ROOT, 'config', 'ftbquests', 'quests', 'lang', 'en_us.snbt');
const KUBE = path.join(ROOT, 'kubejs', 'assets', 'kubejs', 'lang', 'en_us.json');

const problems = [];

/* ------------------------------------------------------------- the palette */
const BODY = '&7';
const NUM = '&f&l';       // a quantity, a level, a percentage
const MON = '&d&l';       // a Pokemon
const THING = '&a&l';     // a block, an item, a machine - same green the Welcome page uses
const WARN = '&c&l';      // something that can cost you
const BULLET = '&7&l- ' + BODY;
const BACK = '&r' + BODY; // resume body colour

/** Proper nouns worth picking out, with the colour each one gets. Curated on
 *  purpose: guessing at item names out of running prose colours the wrong words.
 *  Longest first so "Ex Compressum" wins over "Ex". */
const NOUNS = [
  ['Mystical Agriculture', '&d&l'], ['Applied Energistics', '&b&l'], ['Sophisticated Backpack', '&6&l'],
  ['Extended Crafting', '&b&l'], ['Refined Storage', '&b&l'], ['Ex Compressum', '&6&l'],
  ['Ex Deorum', '&6&l'], ['Ender IO', '&b&l'], ['RFTools', '&b&l'], ['Mekanism', '&b&l'],
  ['ProjectE', '&d&l'], ['Pixelmon', '&5&l'], ['Cyclic', '&b&l'], ['Botany Pot', '&a&l'],
  ['PokeDollars', '&6&l'], ['Pokedollars', '&6&l'], ['Pokedex', '&5&l'], ['Pokedollar', '&6&l'],
  ['Singularities', '&d&l'], ['Singularity', '&d&l'],
  ['Gate', '&5&l'], ['Gates', '&5&l'],
  ['Minions', '&a&l'], ['Minion', '&a&l'],
  ['Shiny', '&b&l'], ['Legendary', '&6&l'], ['Legendaries', '&6&l'],
].sort((a, b) => b[0].length - a[0].length);

/** a sentence that opens with one of these is a warning, and goes red whole */
const CAUTION = /^(Be careful|Careful|Warning|Attention|Do not|Don't|Never|You cannot|You can't)\b/i;

/* --------------------------------------------------------- species names */
const SPECIES = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'pixelgo-drops', 'catalog-species.json'), 'utf8')))
  .filter((n) => n !== 'MissingNo')
  .sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_SPECIES = new RegExp('(?<![A-Za-z0-9])(' + SPECIES.map(esc).join('|') + ')(?![A-Za-z0-9])', 'g');
const RE_NOUN = new RegExp('(?<![A-Za-z0-9])(' + NOUNS.map(([n]) => esc(n)).join('|') + ')(?![A-Za-z0-9])', 'g');
const NOUN_COLOR = new Map(NOUNS);
// a run of digits, optionally with , or . as separators inside, optionally k/m
const RE_NUM = /(?<![A-Za-z0-9])\d(?:[\d.,]*\d)?[kKmM]?(?![A-Za-z0-9])/g;

/* --- names of things.
 * These descriptions talk about blocks and machines constantly, and they are
 * always written in Title Case ("Quantum Compressor", "Pattern Grid", "Ancient
 * City"). Two or more capitalised words in a row is therefore a reliable signal
 * - as long as a capitalised sentence opener is not counted as the first word,
 * which is what the stop list is for ("The Crafter" is not a thing, "Crafter"
 * is). A single capitalised word is never taken: too many false positives. */
// "and" is deliberately not a connector: "End City and Bastion" is two things,
// not one, and joining them paints the wrong span.
const RE_TITLECASE = /[A-Z][a-zA-Z]+(?:[ ](?:of|the|in)[ ][A-Z][a-zA-Z]+|[ ][A-Z][a-zA-Z]+)+/g;
const STOP = new Set((
  // sentence openers that are not part of a name
  'The A An It Its This That These Those You Your We I If When Once Each Every All Both Some Any '
  + 'After Before While Because But And Or So For To From With Without On Off Up Down Out Into Onto '
  + 'Only Just Also Still Even More Most Less Least Same Other Another Next Last First Second Third '
  + 'There Here Now Then They He She Need Must Can Will Should Be Never Dont '
  // verbs these descriptions start instructions with
  + 'Use Get Craft Right Left Insert Place Put Make Raise Evolve Throw Sneak Do Try Keep Hold Open '
  + 'Close Give Take Find Go Come Look See Summon Combine Defeat Capture Complete Add Build Collect '
  + 'Gather Feed Fuse Bring Smelt Grow Plant Harvest Trade Visit Enter Return Finish Press Click '
  + 'Obtain Equip Wear Choose Select Increase Reduce Kill Reach Unlock Stage Spawns Spawn '
  + 'Craftable Warning Attention Careful Note').trim().split(/\s+/));

/* ------------------------------------------------------------- the styler */
const ALREADY = /&[0-9a-fk-orA-FK-OR]/;
/** things that are not prose and must come out untouched */
const NOT_PROSE = /^\s*$|^\{.*\}$/;

const spans = (text, re, colour) => {
  const out = [];
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) out.push({ a: m.index, b: m.index + m[0].length, c: typeof colour === 'function' ? colour(m[0]) : colour });
  return out;
};

/** Title Case runs, minus a capitalised sentence opener */
const thingSpans = (text) => {
  const out = [];
  for (const m of text.matchAll(RE_TITLECASE)) {
    let a = m.index;
    let words = m[0].split(' ');
    while (words.length && STOP.has(words[0].replace(/'/g, ''))) { a += words[0].length + 1; words = words.slice(1); }
    while (words.length && /^(of|the|and|in)$/.test(words[0])) { a += words[0].length + 1; words = words.slice(1); }
    const capWords = words.filter((w) => /^[A-Z]/.test(w));
    if (capWords.length < 2) continue;
    out.push({ a, b: a + words.join(' ').length, c: THING });
  }
  return out;
};

/** colour the words inside one line, leaving the words themselves alone */
const paint = (text) => {
  const picks = [
    ...spans(text, RE_SPECIES, MON),          // a Pokemon wins over everything
    ...spans(text, RE_NOUN, (w) => NOUN_COLOR.get(w)),
    ...thingSpans(text),
    ...spans(text, RE_NUM, NUM),
  ];
  picks.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  const kept = [];
  let end = -1;
  for (const p of picks) { if (p.a >= end) { kept.push(p); end = p.b; } }
  let out = '';
  let at = 0;
  for (const p of kept) { out += text.slice(at, p.a) + p.c + text.slice(p.a, p.b) + BACK; at = p.b; }
  return out + text.slice(at);
};

/** one description line -> the same line in the house style */
export const styleLine = (line) => {
  if (typeof line !== 'string') return line;
  if (ALREADY.test(line) || NOT_PROSE.test(line)) return line;

  let text = line;
  let prefix = BODY;
  const bullet = /^\s*[-•]\s+/.exec(text);
  if (bullet) { text = text.slice(bullet[0].length); prefix = BULLET; }

  // split into sentences so a warning can go red on its own
  const parts = text.split(/(?<=[.!?])\s+/).filter((s) => s.length);
  if (!parts.length) return line;
  const painted = parts.map((s) => (CAUTION.test(s) ? WARN + paint(s).replace(new RegExp(esc(BACK), 'g'), '&r' + WARN) + BACK : paint(s)));
  return prefix + painted.join(' ');
};

/* --------------------------------------------------- 1. the snbt lang file */
const readT = (f) => fs.readFileSync(f, 'utf8');
let snbt = readT(SNBT);
const crlf = /\r\n/.test(snbt);
let lines = snbt.replace(/\r\n/g, '\n').split('\n');

const unesc = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const resc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

let snbtTouched = 0, snbtSkipped = 0;
const changes = []; // every [before, after] pair, so the check below covers all of them
for (let i = 0; i < lines.length; i++) {
  const m = /^\t([A-Za-z0-9_.]+): (.*)$/.exec(lines[i]);
  if (!m) continue;
  const [, key, rest] = m;
  const isDesc = key.endsWith('.quest_desc');
  let a = i, b = i;
  if (rest.startsWith('[') && !rest.trimEnd().endsWith(']')) { while (lines[b] !== '\t]') b++; }
  if (!isDesc) { i = b; continue; }

  for (let j = a; j <= b; j++) {
    const em = /^\t\t"(.*)"$/.exec(lines[j]) || (j === a ? /^\t[A-Za-z0-9_.]+: \["(.*)"\]$/.exec(lines[j]) : null);
    if (!em) continue;
    const raw = unesc(em[1]);
    const styled = styleLine(raw);
    if (styled === raw) { snbtSkipped++; continue; }
    lines[j] = lines[j].startsWith('\t\t') ? `\t\t"${resc(styled)}"` : `\t${key}: ["${resc(styled)}"]`;
    snbtTouched++;
    changes.push([raw, styled]);
  }
  i = b;
}

/* ------------------------------------------------- 2. the kubejs lang file */
const kubeRaw = readT(KUBE);
const kube = JSON.parse(kubeRaw);
let kubeTouched = 0, kubeSkipped = 0;
for (const k of Object.keys(kube)) {
  if (!/^quest\.[A-Za-z0-9_]+\.description\.\d+$/.test(k)) continue;
  const raw = kube[k];
  const styled = styleLine(raw);
  if (styled === raw) { kubeSkipped++; continue; }
  kube[k] = styled;
  kubeTouched++;
  changes.push([raw, styled]);
}

/* ------------------------------------------------------------------ report */
if (SHOW) {
  console.log('--- sample ---');
  for (const [from, to] of changes.slice(0, SHOW)) { console.log('  was: ' + from); console.log('  now: ' + to); console.log(''); }
}
console.log(`snbt lang   : ${snbtTouched} lines styled, ${snbtSkipped} left alone (already styled, blank, or a {reference})`);
console.log(`kubejs lang : ${kubeTouched} descriptions styled, ${kubeSkipped} left alone`);

/* The one rule this pass must never break: it colours words, it does not change
 * them. Strip every code back out and the text has to be identical. */
const stripCodes = (s) => s.replace(/&[0-9a-fk-orA-FK-OR]/g, '').replace(/^[\s•-]+/, '').replace(/\s+/g, ' ').trim();
let drift = 0;
for (const [from, to] of changes) {
  if (stripCodes(from) !== stripCodes(to)) { problems.push(`text drifted:\n      was "${from}"\n      now "${to}"`); drift++; }
}
console.log(`word-for-word check: ${changes.length - drift}/${changes.length} identical once the codes are stripped`);

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) - nothing written:`);
  for (const p of problems) console.log('  ! ' + p);
  process.exit(1);
}

if (DRY) { console.log('\n--dry: no file written.'); process.exit(0); }
const outSnbt = lines.join('\n');
fs.writeFileSync(SNBT, crlf ? outSnbt.replace(/\n/g, '\r\n') : outSnbt, 'utf8');
fs.writeFileSync(KUBE, JSON.stringify(kube, null, 2) + '\n', 'utf8');
console.log('\nwritten: 2 files.');
