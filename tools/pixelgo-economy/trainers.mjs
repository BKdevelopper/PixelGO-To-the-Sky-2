/**
 * PixelGO — To the Sky : argent gagné contre les dresseurs, divisé par 10 (2026-11-08).
 *
 * Toutes les récompenses `pixelmon:give_money` des presets de PNJ :
 *   - Pixelmon : dresseurs sauvages, dresseurs d'arène, champions d'arène, sbires et boss des Teams ;
 *   - PixelGO Battle Tower : étages de la tour et Ligue.
 * Les dresseurs sauvages gardent d'abord leur plafond de 200 $ (Gentleman et Rich Boy donnaient
 * 800 $, voir ECONOMIE.md), puis tout est divisé par 10 : 150 -> 15 $, 200 -> 20 $, Ligue
 * 200 000 -> 20 000 $.
 *
 * Les presets vivent dans les jars : on écrit une copie en override dans kubejs/data. Le montant
 * est toujours recalculé depuis la valeur du jar, donc relancer ne divise pas deux fois. Si un
 * override existe déjà, on garde son contenu et on ne remplace que les montants.
 * Registre dynamique : pris en compte au prochain lancement du monde. Un PNJ déjà apparu garde
 * les interactions sauvegardées sur l'entité.
 *
 * Remplace le §9 d'apply.mjs (plafond seul).   Usage : node tools/pixelgo-economy/trainers.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { readZip } from './zip.mjs';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const KDATA = path.join(ROOT, 'kubejs', 'data');
const DIVISOR = 10;
const WILD_CAP = 200;
const WILD = 'data/pixelmon/pixelmon/npc/preset/battle/trainer/wild/';
const JARS = [/^Pixelmon-.*-universal\.jar$/, /^pixelgobattletower-.*\.jar$/];

const moneyNodes = (j) => { const out = []; const scan = (el) => { if (Array.isArray(el)) return el.forEach(scan);
  if (!el || typeof el !== 'object') return; if (el.type === 'pixelmon:give_money') out.push(el); Object.values(el).forEach(scan); };
  scan(j); return out; };
const round2 = (v) => Math.round(v * 100) / 100;

const changed = []; const report = {};
for (const re of JARS) {
  const jar = fs.readdirSync(path.join(ROOT, 'mods')).find(f => re.test(f));
  if (!jar) { console.log('  ! jar introuvable : ' + re); continue; }
  const z = readZip(path.join(ROOT, 'mods', jar), n => /\/npc\/preset\/.+\.json$/.test(n));
  for (const [name, buf] of z) {
    const txt = buf.toString('utf8').replace(/^﻿/, '');
    if (!txt.includes('pixelmon:give_money')) continue;
    const orig = moneyNodes(JSON.parse(txt)).map(n => n.money);
    const f = path.join(KDATA, name.slice('data/'.length));
    const j = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : JSON.parse(txt);
    const nodes = moneyNodes(j);
    if (nodes.length !== orig.length) { console.log('  ! override différent du jar, ignoré : ' + path.relative(ROOT, f)); continue; }
    nodes.forEach((n, i) => { const base = name.startsWith(WILD) ? Math.min(orig[i], WILD_CAP) : orig[i]; n.money = round2(base / DIVISOR); });
    const out = JSON.stringify(j, null, 2) + '\n';
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== out) { changed.push(path.relative(ROOT, f)); if (!DRY) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, out); } }
    const group = name.split('/').slice(1, 2)[0] + ' ' + name.split('/npc/preset/')[1].split('/').slice(0, -1).join('/');
    const r = (report[group] ||= { n: 0, from: new Set(), to: new Set() }); r.n++;
    orig.forEach(v => r.from.add(v)); nodes.forEach(n => r.to.add(n.money));
  }
}
const span = (s) => { const a = [...s].sort((x, y) => x - y); return a[0] === a[a.length - 1] ? `${a[0]}` : `${a[0]}–${a[a.length - 1]}`; };
for (const [g, r] of Object.entries(report)) console.log(`  ${g}`.padEnd(52) + `${r.n} preset(s) : ${span(r.from)} $ -> ${span(r.to)} $`);
console.log(`${changed.length} fichier(s) ${DRY ? 'à écrire' : 'écrit(s)'}`);
