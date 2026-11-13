/**
 * PixelGO — To the Sky : dans le loot, les Poké Balls deviennent des couvercles (2026-11-08).
 *
 * Toute Poké Ball qui sort d'une table de loot (coffres, Sacs Mystère, donjons, Battle Tower) ou
 * d'un drop Pixelmon (Pokémon, Poké Chests, raids) est remplacée par le couvercle du même type
 * (`pixelmon:poke_ball_lid` + même composant `pixelmon:poke_ball`) : le joueur assemble la ball
 * lui-même. Les balls qui n'ont pas de couvercle (`hasLid: false` dans data/pixelmon/pokeballs :
 * Master, Parc, Origine, Ultra Ball « Beast », Mémoire, Noël, Rêve, GS, Curieuse) restent des balls,
 * le loot étant leur seule source.
 *
 * Module : `toLids(json)` convertit en place et rend le nombre de remplacements — appelé par
 * pixelgo-loot/generate.mjs et pixelgo-drops/generate.mjs avant chaque écriture.
 * Outil :  node tools/pixelgo-loot/lids.mjs [--dry]  — convertit kubejs/data (loot_table + drops) et
 * crée les surcharges des tables de jar qui ne sont pas encore dans kubejs/data. Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZip } from '../pixelgo-economy/zip.mjs';

export const NO_LID = new Set(['master_ball', 'park_ball', 'origin_ball', 'beast_ball', 'cherish_ball',
  'christmas_ball', 'dream_ball', 'gs_ball', 'strange_ball']);
const BALL = 'pixelmon:poke_ball', LID = 'pixelmon:poke_ball_lid';

export function toLids(json) {
  let n = 0;
  const lidded = (v) => !NO_LID.has(v || 'poke_ball');
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    // entrée de table de loot : { type: minecraft:item, name, functions: [set_components…] }
    if (typeof o.type === 'string' && o.type.endsWith('item') && o.name === BALL) {
      const v = (o.functions || []).map(f => f.components?.[BALL]).find(Boolean);
      if (lidded(v)) { o.name = LID; n++; }
    }
    // pile d'objet : { id, components } (drops Pixelmon, set_contents…)
    if (o.id === BALL && lidded(o.components?.[BALL])) { o.id = LID; n++; }
    // drop de raid : { item: "pixelmon:poke_ball", components }
    if (o.item === BALL && lidded(o.components?.[BALL])) { o.item = LID; n++; }
    Object.values(o).forEach(walk);
  };
  walk(json);
  return n;
}

/* ------------------------------------------------------------------ outil */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = process.cwd();
  const DRY = process.argv.includes('--dry');
  const DATA = path.join(ROOT, 'kubejs', 'data');
  const walkDir = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walkDir(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  const changed = []; let total = 0;
  const write = (f, j, n) => {
    const txt = JSON.stringify(j, null, 2) + '\n';
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === txt) return;
    changed.push(`${path.relative(ROOT, f)} (${n})`);
    if (!DRY) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt, 'utf8'); }
  };
  // 1. tables de jar qui donnent des balls et ne sont pas encore surchargées
  for (const jar of fs.readdirSync(path.join(ROOT, 'mods')).filter(f => f.endsWith('.jar'))) {
    let z; try { z = readZip(path.join(ROOT, 'mods', jar), n => /^data\/[^/]+\/(loot_table|drops)\/.+\.json$/.test(n)); } catch { continue; }
    for (const [name, buf] of z) {
      const f = path.join(DATA, name.slice('data/'.length));
      if (fs.existsSync(f) || !buf.toString().includes(`"${BALL}"`)) continue;
      const j = JSON.parse(buf.toString('utf8').replace(/^﻿/, ''));
      const n = toLids(j); if (n) { total += n; write(f, j, n); }
    }
  }
  // 2. tout ce qui est déjà dans kubejs/data
  const files = walkDir(DATA).filter(f => f.endsWith('.json') && /[\\/](loot_table|drops)[\\/]/.test(f));
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8'); if (!raw.includes(`"${BALL}"`)) continue;
    const j = JSON.parse(raw.replace(/^﻿/, ''));
    const n = toLids(j); if (n) { total += n; write(f, j, n); }
  }
  console.log(`${total} ball(s) remplacée(s) par leur couvercle, ${changed.length} fichier(s) ${DRY ? 'à écrire' : 'écrit(s)'}`);
  for (const c of changed.slice(0, 400)) console.log('  ' + c);
}
