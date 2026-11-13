#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book, pass 3: no recipes in the text
 * =============================================================================
 *  The book used to spell out recipes: "How to craft it", "The recipe",
 *  ingredient lists, bench patterns, output counts. The player has JEI for
 *  that, and a recipe written in a quest goes stale the day the recipe changes.
 *  This pass takes them out and keeps everything else: what the item does,
 *  where a resource comes from, which machine does the job, balance notes,
 *  tips.
 *
 *  1. GENERIC — any section whose header is a recipe header (HEADER below) is
 *     removed: the header, every line under it up to the next blank line, and
 *     that blank line.
 *  2. BY HAND — cards where the recipe is not in its own section, or where the
 *     section around it needs a word changed so it still reads (EDITS).
 *  3. SUBTITLES that were a recipe ("Iron Ingot + Ender Pearl").
 *  4. The KubeJS lang file, which holds part of the book's text.
 *
 *  Idempotent: a second run changes nothing. It refuses to write if a recipe
 *  header is still left anywhere, or if a description would end up empty.
 *
 *    node tools/pixelgo-quests/norecipes.mjs --dry
 *    node tools/pixelgo-quests/norecipes.mjs
 *
 *  Run it after generate.mjs and style.mjs: generate.mjs rewrites the cards
 *  listed in content.mjs, so those are kept recipe-free in content.mjs itself.
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const LANGF = path.join(ROOT, 'config', 'ftbquests', 'quests', 'lang', 'en_us.snbt');
const KJF = path.join(ROOT, 'kubejs', 'assets', 'kubejs', 'lang', 'en_us.json');

const plain = (s) => s.replace(/\\"/g, '"').replace(/&#[0-9A-Fa-f]{6}|&[0-9a-fk-or]/g, '').trim();
const esc = (t) => t.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/* ------------------------------------------------------------- 1. generic */
const HEADER = /^(how to craft( it| a minion)?|(the )?(new )?recipe( now)?( — .*)?|a few recipes|the rule behind every recipe on this row)$/i;

/* ------------------------------------------------------------- 2. by hand
 * Matching is on the text with its colour codes stripped.
 *   drop        remove that line
 *   section     remove that line, the lines under it up to a blank, and the blank
 *   from        remove that line and everything after it
 *   replace     swap that line for `with` (written as is, colour codes included)
 *   insertAfter put `lines` right after that line */
const EDITS = {
  // IV ALL Ball: the whole second half was the three recipe routes
  'quest.03CB83491A7236D5': [{ from: 'Three ways in' }],
  // Cobblestone generator
  'quest.056A651565DC1C95': [{
    replace: 'Tip: The upgrades (stone, iron, gold, diamond…) all build on this one, so only the first is gated.',
    with: '&e&lTip:&r &7The upgrades (&7stone, &firon&7, &6gold&7, &bdiamond&7…) all build on this one, so &aonly the first one needs the &d&lHarvest Certificate&r&7.',
  }],
  // Mystery Egg
  'quest.06878408DB043ABA': [
    { replace: '- PixelmonGo Eggs — one egg plus the ProjectE collector of the matching tier gives the MK 0 to MK 16 eggs.', with: '&7- &fPixelmonGo Eggs&7, from &fMK 0&7 to &fMK 16&7.' },
    { replace: '- Key Stone — 8 eggs around a summon ticket, and the Key Stone becomes the Mega Key.', with: '&7- the &5&lMega Key&r&7.' },
  ],
  // Flint Mesh
  'quest.343DAE11210361DC': [{ drop: 'Four Flint around the String Mesh.' }],
  // Cobblestone from pebbles
  'quest.36A44692E315D8A4': [{ drop: '4 Stone Pebbles in the crafting grid give one Cobblestone.' }],
  // Ball bases
  'quest.39962F9692B0C0C7': [
    { replace: 'The base is the bottom half of the ball. 3 ingots on a bench give 5 bases, and that recipe is untouched — shaping metal was never the interesting part.', with: '&7The base is the bottom half of the ball.' },
    { section: 'Where the base is used' },
  ],
  // Infinity Bimetal Gear
  'quest.4145EDF769EAA1DF': [{ drop: 'A ring of Iron Nuggets and Iron Ingots around a single Grain of Infinity.' }],
  // Cherish Ball
  'quest.42FE3CC6A5049EE1': [
    { drop: 'It used to be impossible to make. The pack gave it a lid recipe but no assembly recipe, so the lid was a dead end. Pixelmon does not ship a lid texture for it either.' },
    { section: 'Now it has one recipe, straight to a finished ball:' },
    { replace: 'Tip: Output is 2 balls. Save them for the Pokémon you actually intend to keep.', with: '&e&lTip:&r &7Save them for the Pokémon you actually intend to keep.' },
  ],
  // Conductive Alloy
  'quest.5A777FE32A5EB256': [{ replace: 'Tip: One craft gives 2 ingots. Automate it early.', with: '&e&lTip:&r &7Automate it early.' }],
  // Compressed sieve: keep what it does, not what it is made of
  'quest.64467187D11B081C': [
    { replace: 'Six logs and two sticks. It takes compressed blocks instead of single ones.', with: '&7It takes &fcompressed blocks&7 instead of single ones.' },
    { drop: 'How to craft it' },
  ],
  // Beast Ball
  'quest.6A0027A21F4C044E': [{ drop: 'One Ultra Deep Stone gives two Beast Balls, and nothing else on this page consumes one. Budget accordingly.' }],
  // The merchants' catalogue (also: minions are no longer sold, 2026-10-14)
  'quest.7619CF1BA2185277': [
    { drop: 'Tip: Paper is sugar cane, and cane comes out of the same sieve as your seeds. The market opens on your first real harvest.' },
    { replace: 'Every merchant in the pack, from anywhere: harvest tools, minions, iron, Poké Balls, TMs, Mystery Boxes.', with: '&7Every merchant in the pack, &nfrom anywhere&r&7: harvest tools, iron, Poké Balls, TMs, Mystery Bags.' },
  ],
  // The Enchanted Crop
  'quest.7E74CD3DBCD0A57C': [
    { section: 'How' },
    { drop: 'Tip: This is also the centre of the Portable Shop recipe, right below.' },
  ],
  // Botany Pot: keep how it works, drop what it is made of
  'quest.7FF92AC0E03A9CDF': [
    { replace: 'Four terracotta around a Flower Pot. Drop a soil block in, drop a seed in, and it grows and re-grows on its own.', with: '&7Drop a soil block in, drop a seed in, and it grows and re-grows on its own.' },
    { drop: 'How to craft it' },
    { replace: 'The Flower Pot recipe now carries the Harvest Certificate: five bricks and the certificate give 4 pots.', with: '&7&fFlower Pots&7 now need the &d&lHarvest Certificate&r&7.' },
  ],
};

/* ------------------------------------------------------------ 3. subtitles */
const SUBTITLES = {
  'quest.055D2CDC7445C01A': '&7The strongest metal of Ender IO', // was End Stone + Dark Steel + Obsidian
  'quest.085424FE134DF885': '&7The teleporting alloy', // Iron Ingot + Ender Pearl
  'quest.2B1C111D41F46604': '&7The signature metal of Ender IO', // Iron + Coal Dust + Obsidian
  'quest.43951BFCA62D4096': '&7Where the soul branch starts', // Soul Sand + Gold Ingot
  'quest.50726556E4CF3225': '&7The tier 2 power alloy', // Redstone + Conductive Alloy + Gold
  'quest.5A777FE32A5EB256': '&7Cheap, fast and everywhere', // Iron Ingot + Copper Ingot
  'quest.6F29A3A99235C34A': '&7The tier 3 material of Ender IO', // Energetic Alloy + Ender Pearl + Glowstone
  'quest.7B6DA5B7277FF69F': '&7The signal carrying alloy', // Redstone Dust + Copper Ingot
  'quest.06878408DB043ABA': '&7A random Pokémon in an egg', // One plain egg, eight essences
  'quest.1951214A159B390E': '&7The last step, by hand', // Three lids, three bases, three balls
  'quest.42FE3CC6A5049EE1': '&7The gift ball', // The gift ball — and it was unbuildable
  'quest.7E74CD3DBCD0A57C': '&8A season of work in one item', // 160 of the same crop, in one craft
};

/* --------------------------------------------------- 4. KubeJS lang file */
const KUBEJS = {
  'quest.minions.description.3': [': &f&l5&r&7 stacks of &f&l32&r&7 anywhere in the crafting grid.', '.'],
  'quest.minions.description.24': [', crafts from four &a&lRainbow Tickets&r&7 around a &a&lNether Star&r&7, or costs', ', or costs'],
};

/* ====================================================================== run */
const problems = [];
const raw = fs.readFileSync(LANGF, 'utf8');
const CRLF = raw.includes('\r\n');
const lines = raw.replace(/\r\n/g, '\n').split('\n');

// every description: multi-line blocks, and the one-line ["..."] form FTB Quests
// saves a single-line description in
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  const one = /^\t(quest\.[0-9A-F]{16})\.quest_desc: \["(.*)"\]$/.exec(lines[i]);
  if (one && !one[2].includes('", "')) { blocks.push({ key: one[1], head: i, last: i, body: [one[2]] }); continue; }
  const m = /^\t(quest\.[0-9A-F]{16})\.quest_desc: \[$/.exec(lines[i]);
  if (!m) continue;
  let j = i + 1;
  while (j < lines.length && lines[j] !== '\t]') j++;
  blocks.push({ key: m[1], head: i, last: j, body: lines.slice(i + 1, j) });
  i = j;
}

const stats = { generic: 0, applied: 0, already: 0, cards: 0, subtitles: 0, kubejs: 0 };
const opLog = [];
const out = [];
let cursor = 0;
const seenEdits = new Set();

for (const b of blocks) {
  out.push(...lines.slice(cursor, b.head));
  const original = lines.slice(b.head, b.last + 1).join('\n');
  if (b.head === b.last && b.body[0] === '') { out.push(lines[b.head]); cursor = b.last + 1; continue; } // [""]: nothing to read
  let body = b.head === b.last ? b.body : b.body.map((l) => {
    const m = /^\t\t"(.*)"$/.exec(l);
    if (!m) problems.push(`${b.key}: unexpected line ${l.slice(0, 60)}`);
    return m ? m[1] : l;
  });
  const find = (p) => body.findIndex((s) => plain(s) === p);
  const sectionEnd = (i) => { let j = i + 1; while (j < body.length && body[j] !== '') j++; return j; };

  for (const op of EDITS[b.key] || []) {
    seenEdits.add(b.key);
    const target = op.drop ?? op.section ?? op.from ?? op.replace ?? op.insertAfter;
    const i = find(target);
    let did = false, already = false;
    if (op.drop !== undefined) { if (i >= 0) { body.splice(i, 1); did = true; } else already = true; }
    else if (op.section !== undefined) { if (i >= 0) { body.splice(i, sectionEnd(i) + 1 - i); did = true; } else already = true; }
    else if (op.from !== undefined) { if (i >= 0) { body.splice(i); did = true; } else already = true; }
    else if (op.replace !== undefined) {
      if (i >= 0) { body[i] = esc(op.with); did = true; } else if (body.includes(esc(op.with))) already = true;
    } else if (op.insertAfter !== undefined) {
      const add = op.lines.map(esc);
      if (i < 0) { /* reported below */ } else if (add.every((l, k) => body[i + 1 + k] === l)) already = true;
      else { body.splice(i + 1, 0, ...add); did = true; }
    }
    if (did) stats.applied++; else if (already) stats.already++;
    else problems.push(`${b.key}: no line matches "${String(target).slice(0, 60)}"`);
    opLog.push(`${did ? '+' : already ? '=' : '!'} ${b.key} ${Object.keys(op)[0]} ${String(target).slice(0, 70)}`);
  }

  // generic recipe sections
  for (let i = 0; i < body.length; i++) {
    if (!HEADER.test(plain(body[i]))) continue;
    body.splice(i, sectionEnd(i) + 1 - i);
    stats.generic++;
    i--;
  }

  // tidy blank lines: none doubled, none at either end
  body = body.filter((s, i) => !(s === '' && (i === 0 || body[i - 1] === '')));
  while (body.length && body[body.length - 1] === '') body.pop();

  if (!body.length) problems.push(`${b.key}: the description would be empty`);
  for (const s of body) if (HEADER.test(plain(s))) problems.push(`${b.key}: recipe header still there: ${plain(s)}`);
  // written back the way FTB Quests writes it: one line inline, several as a block
  const rendered = body.length === 1
    ? [`\t${b.key}.quest_desc: ["${body[0]}"]`]
    : [`\t${b.key}.quest_desc: [`, ...body.map((s) => `\t\t"${s}"`), '\t]'];
  if (rendered.join('\n') !== original) stats.cards++;
  out.push(...rendered);
  cursor = b.last + 1;
}
out.push(...lines.slice(cursor));
for (const key of Object.keys(EDITS)) if (!seenEdits.has(key)) problems.push(`${key}: no description with that key`);

// subtitles
for (const [key, val] of Object.entries(SUBTITLES)) {
  const i = out.findIndex((l) => l.startsWith(`\t${key}.quest_subtitle: `));
  if (i < 0) { problems.push(`${key}: no subtitle`); continue; }
  const next = `\t${key}.quest_subtitle: "${esc(val)}"`;
  if (out[i] !== next) { out[i] = next; stats.subtitles++; }
}

// KubeJS lang
const kjRaw = fs.readFileSync(KJF, 'utf8');
let kj = kjRaw;
for (const [key, [from, to]] of Object.entries(KUBEJS)) {
  const re = new RegExp(`^(\\s*"${key.replace(/\./g, '\\.')}": ")(.*)(",?)\\r?$`, 'm');
  const m = re.exec(kj);
  if (!m) { problems.push(`kubejs lang: no key ${key}`); continue; }
  const f = JSON.stringify(from).slice(1, -1), t = JSON.stringify(to).slice(1, -1);
  if (m[2].includes(f)) { kj = kj.replace(m[0], m[0].replace(m[2], m[2].replace(f, t))); stats.kubejs++; }
  else if (!m[2].includes(t)) problems.push(`kubejs lang: ${key} does not contain the text to remove`);
}
JSON.parse(kj); // still valid JSON

console.log(opLog.join('\n'));
console.log('');
console.log(`descriptions changed : ${stats.cards}`);
console.log(`recipe sections cut : ${stats.generic} (generic)  ${stats.applied} by hand, ${stats.already} already done`);
console.log(`subtitles rewritten : ${stats.subtitles}`);
console.log(`kubejs lang lines   : ${stats.kubejs}`);

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) - nothing written:`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}
if (!DRY) {
  const txt = out.join('\n');
  fs.writeFileSync(LANGF, CRLF ? txt.replace(/\n/g, '\r\n') : txt, 'utf8');
  if (kj !== kjRaw) fs.writeFileSync(KJF, kj, 'utf8');
}
console.log(DRY ? '\n--dry: no file written.' : '\nwritten.');
