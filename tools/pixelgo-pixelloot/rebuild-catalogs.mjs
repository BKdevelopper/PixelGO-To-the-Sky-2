#!/usr/bin/env node
/* =============================================================================
 *  Rebuilds catalog-items.txt and catalog-balls.txt from the jars.
 * =============================================================================
 *  Run after any Pixelmon / PixelGO update. Needs `unzip` on PATH, and a JDK
 *  (`javap`) for the Pixelmon item and block registries — which are the only
 *  trustworthy source: Pixelmon's lang file names 118 ids that are not
 *  registered items, every Poke Ball variant among them.
 *
 *    node tools/pixelgo-pixelloot/rebuild-catalogs.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const MODS = path.join(ROOT, 'mods');
const MC_JAR = process.env.MC_JAR
  || path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft', 'versions', '1.21.1', '1.21.1.jar');

const jar = (re) => {
  const f = fs.readdirSync(MODS).find((n) => re.test(n));
  if (!f) throw new Error(`no mod jar matching ${re}`);
  return path.join(MODS, f);
};
const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 28 }).toString('utf8');
const listing = (j) => run('unzip', ['-l', j]);

const items = new Set();
const balls = new Set();

/* -- pixelmon: the real registries, via bytecode string constants ---------- */
const PIXELMON = jar(/^Pixelmon-.*\.jar$/);
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pxcat-'));
  for (const [cls, label] of [
    ['com/pixelmonmod/pixelmon/init/registry/ItemRegistration', 'items'],
    ['com/pixelmonmod/pixelmon/init/registry/BlockRegistration', 'blocks'],
  ]) {
    try {
      run('unzip', ['-qo', PIXELMON, `${cls}*`, '-d', tmp]);
      const out = run('javap', ['-p', '-c', path.join(tmp, `${cls}.class`)]);
      let n = 0;
      for (const m of out.matchAll(/\/\/ String ([a-z0-9_]+)\b/g)) { items.add(`pixelmon:${m[1]}`); n++; }
      console.log(`  pixelmon ${label.padEnd(7)} ${n} string constants`);
    } catch (e) {
      console.error(`  ! could not read ${label}: ${e.message.split('\n')[0]}`);
      process.exitCode = 1;
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* -- vanilla: the lang file, which IS reliable for Minecraft --------------- */
{
  const lang = run('unzip', ['-p', MC_JAR, 'assets/minecraft/lang/en_us.json']);
  let n = 0;
  for (const m of lang.matchAll(/"(?:item|block)\.minecraft\.([a-z0-9_]+)"/g)) { items.add(`minecraft:${m[1]}`); n++; }
  console.log(`  minecraft         ${n} lang keys`);
}

/* -- other mods: their item models ----------------------------------------- */
for (const re of [/^pixelgoitems-/, /^pokeblocks-/, /^weavers_cosmetics_cosplay-/, /^pokemon_armor-/]) {
  const j = jar(re);
  let n = 0;
  for (const m of listing(j).matchAll(/assets\/([a-z0-9_]+)\/models\/item\/([a-z0-9_]+)\.json/g)) {
    items.add(`${m[1]}:${m[2]}`); n++;
  }
  console.log(`  ${path.basename(j).padEnd(40)} ${n} item models`);
}

/* -- kubejs: the pack's own startup scripts -------------------------------- */
{
  let n = 0;
  for (const f of ['main.js', 'pixelgo_items.js']) {
    const p = path.join(ROOT, 'kubejs', 'startup_scripts', f);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/\.create\(\s*['"]([a-z0-9_]+)['"]/g)) { items.add(`kubejs:${m[1]}`); n++; }
    // pixelgo_items.js builds "<id>_ticket" from a table of colours
    for (const m of src.matchAll(/id:\s*'([a-z_]+)'\s*,\s*label:/g)) { items.add(`kubejs:${m[1]}_ticket`); n++; }
  }
  console.log(`  kubejs startup scripts                   ${n} declarations`);
}

/* -- ball variants: the pokeballs data of Pixelmon + PixelGO Balls --------- */
for (const re of [/^Pixelmon-.*\.jar$/, /^pixelballs-/]) {
  const j = jar(re);
  let n = 0;
  for (const m of listing(j).matchAll(/data\/pixelmon\/pokeballs\/([a-z0-9_]+)\.json/g)) { balls.add(m[1]); n++; }
  console.log(`  ${path.basename(j).padEnd(40)} ${n} ball variants`);
}

/* -- write ----------------------------------------------------------------- */
const HEAD_ITEMS = `# Item ids proven to exist in this pack. Generated — do not hand-edit.
# Rebuild with: node tools/pixelgo-pixelloot/rebuild-catalogs.mjs
#
# Provenance:
#   pixelmon:*   string constants of ItemRegistration AND BlockRegistration —
#                the real registries. Blocks are included because Pixelmon
#                registers a block item for them (the hourglasses, the ores,
#                the decor blocks), so they are all valid /give targets.
#                The Pixelmon LANG FILE must not be used: it names 118 ids that
#                are not registered items, every Poke Ball variant among them.
#   minecraft:*  item./block. keys of assets/minecraft/lang/en_us.json.
#                Vanilla's lang file, unlike Pixelmon's, does match the registry.
#   others       assets/<namespace>/models/item/*.json of each mod jar.
#   kubejs:*     kubejs/startup_scripts/{main,pixelgo_items}.js.
`;
const HEAD_BALLS = `# Valid values of the pixelmon:poke_ball data component. Generated.
# Rebuild with: node tools/pixelgo-pixelloot/rebuild-catalogs.mjs
# Provenance: data/pixelmon/pokeballs/*.json in the Pixelmon and pixelballs jars.
`;

fs.writeFileSync(path.join(HERE, 'catalog-items.txt'), HEAD_ITEMS + [...items].sort().join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(HERE, 'catalog-balls.txt'), HEAD_BALLS + [...balls].sort().join('\n') + '\n', 'utf8');
console.log(`\nwritten: ${items.size} item ids, ${balls.size} ball variants`);
