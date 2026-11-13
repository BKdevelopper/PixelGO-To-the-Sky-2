#!/usr/bin/env node
/**
 * Quest book translations (FTB Quests + KubeJS quest keys).
 *
 * Sources (English, never edited here):
 *   config/ftbquests/quests/lang/en_us.snbt
 *   kubejs/assets/kubejs/lang/en_us.json        (only the `quest.*` keys)
 *
 * Every distinct English string is a "unit" with a stable id (hash of the text).
 * Translations live in tools/pixelgo-lang/<lang>/*.json as { id: "translated" }.
 * Missing units fall back to English, so a partial translation is safe to ship.
 *
 *   node tools/pixelgo-lang/lang.mjs status  <lang>
 *   node tools/pixelgo-lang/lang.mjs extract <lang> [batchSize]   -> todo/<lang>-NNN.json
 *   node tools/pixelgo-lang/lang.mjs build   <lang>               -> <lang>.snbt + kubejs <lang>.json
 *
 * Rules checked on build (a unit that fails stays in English and is reported):
 *   - same formatting codes (&7, &l, &r…) as the English, in any order;
 *   - same {references} and same numbers.
 * Chapter titles are gradients (&#RRGGBB per letter): they are translated as plain
 * text and the gradient is re-applied between the English first and last colours.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SNBT_EN = path.join(ROOT, 'config/ftbquests/quests/lang/en_us.snbt');
const KJ_DIR = path.join(ROOT, 'kubejs/assets/kubejs/lang');
const LOCALE = { fr: 'fr_fr', es: 'es_es', pt: 'pt_br' };

const id = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const GRAD = /&#[0-9A-Fa-f]{6}/g;
const isGradient = (s) => (s.match(GRAD) || []).length > 2;
const plainOfGradient = (s) => s.replace(GRAD, '');
const translatable = (s) => s.trim() && !/^\{[\w.]+\}$/.test(s) && /[A-Za-z]/.test(s.replace(/&#?[0-9A-Fa-f]{1,6}|&[0-9a-fk-or]/gi, ''));

// ---------------------------------------------------------------- sources
function snbtStrings() {
  // every "..." literal after the key, line by line (en_us has no escapes)
  const text = fs.readFileSync(SNBT_EN, 'utf8');
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const body = line.replace(/^\s*[\w.]+: /, '');
    for (const m of body.matchAll(/"([^"]*)"/g)) out.push(m[1]);
  }
  return { text, strings: out };
}
function kjQuestKeys() {
  const j = JSON.parse(fs.readFileSync(path.join(KJ_DIR, 'en_us.json'), 'utf8'));
  return Object.fromEntries(Object.entries(j).filter(([k]) => k.startsWith('quest.')));
}
function units() {
  const map = new Map();
  const add = (s) => {
    if (!translatable(s)) return;
    const src = isGradient(s) ? plainOfGradient(s) : s;
    map.set(id(src), src);
  };
  snbtStrings().strings.forEach(add);
  Object.values(kjQuestKeys()).forEach(add);
  return map;
}
function memory(lang) {
  const dir = path.join(HERE, lang);
  const tm = {};
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    Object.assign(tm, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  return tm;
}

// ---------------------------------------------------------------- checks
const codes = (s) => (s.match(/&[0-9a-fk-or]/gi) || []).map((c) => c.toLowerCase()).sort().join('');
const refs = (s) => (s.match(/\{[\w.]+\}/g) || []).sort().join('');
const nums = (s) => (s.replace(/&[0-9a-fk-or]/gi, '').match(/\d+/g) || []).sort().join(',');
function problem(en, tr) {
  if (typeof tr !== 'string' || !tr.trim()) return 'empty';
  if (codes(en) !== codes(tr)) return `codes ${codes(en)} != ${codes(tr)}`;
  if (refs(en) !== refs(tr)) return 'references differ';
  if (nums(en) !== nums(tr)) return `numbers ${nums(en)} != ${nums(tr)}`;
  if (tr.includes('"')) return 'contains a double quote';
  return null;
}

// ---------------------------------------------------------------- gradient
function regradient(en, plainTr) {
  const cols = en.match(GRAD).map((c) => c.slice(2));
  const lead = en.slice(0, en.indexOf('&#')); // e.g. &l before the gradient
  const body = plainTr.startsWith(lead) ? plainTr.slice(lead.length) : plainTr;
  const [a, b] = [cols[0], cols[cols.length - 1]].map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const n = Math.max(body.length - 1, 1);
  let out = lead;
  [...body].forEach((ch, i) => {
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * (i / n)).toString(16).padStart(2, '0').toUpperCase()).join('');
    out += `&#${c}${ch}`;
  });
  return out;
}

// ---------------------------------------------------------------- commands
const [cmd, lang, arg] = process.argv.slice(2);
if (!cmd || !LOCALE[lang]) {
  console.log('usage: lang.mjs status|extract|build <fr|es|pt> [batchSize]');
  process.exit(1);
}
const U = units();
const TM = memory(lang);

if (cmd === 'status') {
  const done = [...U.keys()].filter((k) => k in TM).length;
  let chars = 0, doneChars = 0;
  for (const [k, v] of U) { chars += v.length; if (k in TM) doneChars += v.length; }
  console.log(`${lang}: ${done}/${U.size} units (${Math.round((100 * doneChars) / chars)} % of the text)`);
}

if (cmd === 'extract') {
  const size = Number(arg) || 120;
  const todoDir = path.join(HERE, 'todo');
  fs.mkdirSync(todoDir, { recursive: true });
  for (const f of fs.readdirSync(todoDir).filter((x) => x.startsWith(`${lang}-`))) fs.unlinkSync(path.join(todoDir, f));
  const missing = [...U].filter(([k]) => !(k in TM));
  for (let i = 0; i * size < missing.length; i++) {
    const batch = Object.fromEntries(missing.slice(i * size, (i + 1) * size));
    fs.writeFileSync(path.join(todoDir, `${lang}-${String(i + 1).padStart(3, '0')}.json`), JSON.stringify(batch, null, 1) + '\n');
  }
  console.log(`${missing.length} units to translate -> ${Math.ceil(missing.length / size)} batches in tools/pixelgo-lang/todo/`);
}

if (cmd === 'build') {
  const bad = [];
  const tr = (s) => {
    if (!translatable(s)) return s;
    const grad = isGradient(s);
    const src = grad ? plainOfGradient(s) : s;
    const t = TM[id(src)];
    if (t === undefined) return s;
    const p = problem(src, t);
    if (p) { bad.push(`${id(src)}: ${p}`); return s; }
    return grad ? regradient(s, t) : t;
  };

  // FTB Quests: same file as en_us, every literal swapped
  const { text } = snbtStrings();
  const out = text.split(/(\r?\n)/).map((line) => {
    const m = /^(\s*[\w.]+: )(.*)$/.exec(line);
    const [head, body] = m ? [m[1], m[2]] : ['', line];
    return head + body.replace(/"([^"]*)"/g, (_, s) => `"${tr(s)}"`);
  }).join('');
  fs.writeFileSync(path.join(path.dirname(SNBT_EN), `${LOCALE[lang]}.snbt`), out, 'utf8');

  // KubeJS: merge quest keys into the existing locale file (other keys untouched)
  const kjFile = path.join(KJ_DIR, `${LOCALE[lang]}.json`);
  const kj = fs.existsSync(kjFile) ? JSON.parse(fs.readFileSync(kjFile, 'utf8')) : {};
  for (const [k, v] of Object.entries(kjQuestKeys())) {
    const t = tr(v);
    if (t !== v) kj[k] = t; else delete kj[k];
  }
  fs.writeFileSync(kjFile, JSON.stringify(kj, null, 2) + '\n', 'utf8');

  const done = [...U.keys()].filter((k) => k in TM).length;
  console.log(`built ${LOCALE[lang]}: ${done}/${U.size} units translated, ${bad.length} rejected`);
  bad.slice(0, 40).forEach((b) => console.log('  ! ' + b));
}
