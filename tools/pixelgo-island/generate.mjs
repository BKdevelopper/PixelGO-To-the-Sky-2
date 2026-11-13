// Générateur de l'île de départ "Sanctuaire Sakura" (thème Pokémon / japonais)
// Sortie : structure NBT vanilla (DataVersion 1.21.1) pour SkyblockBuilder.
import fs from 'fs';
import { read, write, T, plain } from './nbt.mjs';

import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(ROOT, 'config/skyblockbuilder/templates/islands/sakura.nbt');
const DEFAULT_NBT = path.join(ROOT, 'config/skyblockbuilder/templates/islands/default.nbt');

const DY = 5;                      // marge sous l'île (y logique négatif autorisé)
const W = 39, H = 32 + DY, L = 49;  // taille du gabarit (îlot du temple au sud-est)
const CX = 19, CZ = 19;            // centre de l'île
const G = 14;                      // couche d'herbe (on marche à y=15)

// ---------------------------------------------------------------- grille
const grid = new Map();
const K = (x, y, z) => `${x},${y},${z}`;
function set(x, y, z, name, props = {}, nbt = null) {
  y += DY;
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) { console.warn('hors gabarit', name, x, y - DY, z); return; }
  if (!name.includes(':')) name = 'minecraft:' + name;
  grid.set(K(x, y, z), { name, props, nbt });
}
const get = (x, y, z) => grid.get(K(x, y + DY, z));
const del = (x, y, z) => grid.delete(K(x, y + DY, z));
function fill(x1, y1, z1, x2, y2, z2, name, props = {}) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) set(x, y, z, name, props);
}

// bruit déterministe
function hash(x, y, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const pick = (arr, x, y, z) => arr[Math.floor(hash(x, y, z) * arr.length) % arr.length];

// raccourcis d'états
const WL = { waterlogged: 'false' };
const stairs = (facing, half = 'bottom', shape = 'straight') => ({ facing, half, shape, ...WL });
const slab = (type = 'bottom') => ({ type, ...WL });
const leaves = { distance: '7', persistent: 'true', ...WL };
const logY = { axis: 'y' }, logX = { axis: 'x' }, logZ = { axis: 'z' };

// ---------------------------------------------------------------- île
function radiusAt(theta) { return 16 + 1.2 * Math.sin(3 * theta + 0.5) + 0.8 * Math.sin(7 * theta + 2); }
const top = new Map(); // (x,z) -> rho
for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) {
  const dx = x - CX, dz = z - CZ, d = Math.hypot(dx, dz);
  const rho = d / radiusAt(Math.atan2(dz, dx));
  if (rho <= 1) top.set(`${x},${z}`, rho);
}
const onIsland = (x, z) => top.has(`${x},${z}`);
const bottomY = new Map();
for (const [k, rho] of top) {
  const [x, z] = k.split(',').map(Number);
  // profondeur de roche : cône inversé + stalactites
  let depth = Math.round(15 * (1 - Math.pow(rho, 1.35)) + hash(x, 7, z) * 2.4 - 0.8);
  if (hash(x, 3, z) > 0.93 && rho < 0.8) depth += 2 + Math.floor(hash(z, 5, x) * 3); // pointes
  depth = Math.max(1, depth);
  const by = G - depth;
  bottomY.set(k, by);
  for (let y = by; y <= G; y++) {
    const dd = G - y;
    let b;
    if (dd === 0) b = 'grass_block';
    else if (dd <= 2) b = rho > 0.93 && hash(x, y, z) > 0.6 ? 'coarse_dirt' : 'dirt';
    else {
      const r = hash(x, y, z);
      b = r < 0.45 ? 'stone' : r < 0.65 ? 'andesite' : r < 0.8 ? 'tuff' : r < 0.9 ? 'cobblestone' : 'gravel';
      if (y === by && r > 0.55) b = 'mossy_cobblestone';
      if (b === 'gravel' && y === by) b = 'stone';
    }
    set(x, y, z, b, b === 'grass_block' ? { snowy: 'false' } : {});
  }
}

// ---------------------------------------------------------------- jardin : sol, chemins
const surf = (x, z, b, p = {}) => { if (onIsland(x, z)) set(x, G, z, b, p); };
// allée principale torii -> marches (pas japonais)
for (let z = 4; z <= 10; z++) for (let x = 18; x <= 20; x++) {
  const r = hash(x, 1, z);
  surf(x, z, x === 19 || r > 0.35 ? 'polished_andesite' : 'gravel');
}
// pas japonais : côté est (vers le pont du temple) et sud (vers le portail de donjon)
const stepping = [[23, 11], [25, 12], [29, 13], [30, 15], [30, 17], [31, 19], [30, 23], [30, 25], [29, 27], [27, 27],
  [22, 28], [21, 29], [11, 12], [9, 13], [9, 15], [9, 24], [10, 26], [12, 27], [14, 28], [16, 29]];
for (const [x, z] of stepping) { surf(x, z, 'polished_andesite'); if (hash(x, 9, z) > 0.5) surf(x + 1, z, 'polished_andesite'); }

// ---------------------------------------------------------------- maison : Centre Pokémon japonais
const X1 = 11, X2 = 27, Z1 = 14, Z2 = 25;       // murs
const FLOOR = 16, WTOP = 20, BEAM = 21;
// fondation (y=14..15) : soubassement en pierre, pierres sculptées sous les poteaux
fill(X1 - 1, G, Z1 - 1, X2 + 1, G, Z2, 'stone_bricks');
fill(X1, G + 1, Z1, X2, G + 1, Z2, 'stone_bricks');
const pillarX = [X1, 14, 17, 21, 24, X2];
const pillarZ = [Z1, 18, 21, Z2];
for (let x = X1; x <= X2; x++) for (const z of [Z1, Z2]) { const isPillar = pillarX.includes(x); set(x, G + 1, z, (isPillar ? 'chiseled_stone_bricks' : (hash(x, 40, z) > 0.75 ? 'mossy_stone_bricks' : 'stone_bricks'))); }
for (let z = Z1; z <= Z2; z++) for (const x of [X1, X2]) { const isPillar = pillarZ.includes(z); set(x, G + 1, z, (isPillar ? 'chiseled_stone_bricks' : (hash(x, 40, z) > 0.75 ? 'mossy_stone_bricks' : 'stone_bricks'))); }
// engawa (véranda) devant
fill(X1 - 1, G + 1, Z1 - 1, X2 + 1, G + 1, Z1 - 1, 'stone_bricks');
for (const x of [X1 - 1, 14, 24, X2 + 1]) set(x, G + 1, Z1 - 1, 'chiseled_stone_bricks');
fill(X1 - 1, FLOOR, Z1 - 1, X2 + 1, FLOOR, Z1 - 1, 'spruce_planks');
// marches d'entrée
for (let x = 18; x <= 20; x++) { set(x, G + 1, 11, 'stone_brick_stairs', stairs('south')); set(x, G + 1, 12, 'stone_bricks'); set(x, FLOOR, 12, 'spruce_stairs', stairs('south')); }
set(17, G + 1, 12, 'stone_brick_wall', {}); set(21, G + 1, 12, 'stone_brick_wall', {});
// planchers intérieurs
fill(X1, FLOOR, Z1, X2, FLOOR, Z2, 'pixelmon:wooden_flooring');        // hall (parquet Pixelmon)
fill(X1 + 1, FLOOR, Z1 + 1, 15, FLOOR, Z2 - 1, 'bamboo_mosaic');        // chambre : tatami
fill(23, FLOOR, Z1 + 1, X2 - 1, FLOOR, Z2 - 1, 'spruce_planks');        // cuisine
// murs : soubassement bois sombre, panneaux blancs (shoji), poutre haute
for (let y = FLOOR; y <= BEAM + 1; y++) {
  for (let x = X1; x <= X2; x++) for (const z of [Z1, Z2]) wallBlock(x, y, z, pillarX.includes(x), 'x');
  for (let z = Z1 + 1; z < Z2; z++) for (const x of [X1, X2]) wallBlock(x, y, z, pillarZ.includes(z), 'z');
}
function wallBlock(x, y, z, isPillar, along) {
  if (y === FLOOR) return set(x, y, z, 'stripped_dark_oak_log', along === 'x' ? logX : logZ);
  if (isPillar && y <= BEAM) return set(x, y, z, 'stripped_dark_oak_log', logY);
  if (y === FLOOR + 1) return set(x, y, z, 'dark_oak_planks');
  if (y === WTOP || y === BEAM + 1) return set(x, y, z, 'stripped_dark_oak_log', along === 'x' ? logX : logZ);
  if (y === BEAM) return set(x, y, z, 'dark_oak_planks');
  set(x, y, z, 'white_concrete');
}
// fenêtres (vitres blanches = shoji) y=18..19
const windows = [];
const addWin = (x, z, face) => { for (const y of [18, 19]) set(x, y, z, 'white_stained_glass_pane', {}); windows.push([x, z, face]); };
for (const x of [12, 13, 15, 16, 22, 23, 25, 26]) addWin(x, Z1, 'north');
for (const x of [12, 13, 15, 16, 22, 23, 25, 26]) addWin(x, Z2, 'south');
for (const z of [16, 17, 19, 20, 22, 23]) addWin(X1, z, 'west');
for (const z of [16, 17, 19, 20]) addWin(X2, z, 'east');
// porte d'entrée (3 de large) + noren rouge
for (let x = 18; x <= 20; x++) {
  for (let y = 17; y <= 19; y++) del(x, y, Z1);
  set(x, 19, Z1, 'another_furniture:red_curtain', { facing: 'north', vertical: 'up', horizontal: x === 18 ? 'left' : x === 20 ? 'right' : 'middle', open: 'true' });
  set(x, FLOOR, Z1, 'spruce_planks');
}
// plafond
fill(X1 + 1, BEAM, Z1 + 1, X2 - 1, BEAM, Z2 - 1, 'spruce_planks');
for (let x = X1 + 1; x < X2; x++) for (let z = Z1 + 1; z < Z2; z++) if ((x - X1) % 4 === 0) set(x, BEAM, z, 'stripped_dark_oak_log', logZ);
// linteaux de séparation (ranma) entre les pièces
for (const x of [16, 22]) {
  for (let z = Z1 + 1; z < Z2; z++) set(x, WTOP, z, 'stripped_dark_oak_log', logZ);
  for (const z of [Z1 + 1, Z2 - 1]) for (let y = FLOOR + 1; y < WTOP; y++) set(x, y, z, 'stripped_dark_oak_log', logY);
  for (let z = Z1 + 2; z < Z2 - 1; z++) if (z % 3 === 0) set(x, WTOP - 1, z, 'spruce_trapdoor', { facing: 'east', half: 'top', open: 'true', powered: 'false', ...WL });
}
// poteaux de véranda
for (const x of [X1 - 1, 14, 24, X2 + 1]) for (let y = FLOOR + 1; y <= BEAM; y++) set(x, y, Z1 - 1, 'stripped_dark_oak_log', logY);

// ---------------------------------------------------------------- toits (croupe, bois de baie rouge Pixelmon)
function hipRoof(x1, z1, x2, z2, y0, mat, cap) {
  for (let k = 0; ; k++) {
    const ax = x1 + k, bx = x2 - k, az = z1 + k, bz = z2 - k;
    if (ax > bx || az > bz) break;
    const y = y0 + k;
    for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) {
      if (x !== ax && x !== bx && z !== az && z !== bz) continue;
      let f, shape = 'straight';
      const N = z === az, S = z === bz, Wd = x === ax, E = x === bx;
      if (N && S) f = Wd ? 'east' : E ? 'west' : 'south';
      else if (Wd && E) f = N ? 'south' : 'north';
      else if (N && Wd) { f = 'south'; shape = 'outer_left'; }
      else if (N && E) { f = 'south'; shape = 'outer_right'; }
      else if (S && Wd) { f = 'north'; shape = 'outer_right'; }
      else if (S && E) { f = 'north'; shape = 'outer_left'; }
      else f = N ? 'south' : S ? 'north' : Wd ? 'east' : 'west';
      set(x, y, z, mat + '_stairs', stairs(f, 'bottom', shape));
    }
    if (bz - az <= 1 || bx - ax <= 1) { // faîtage
      for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) set(x, y + 1, z, cap + '_slab', slab('bottom'));
      break;
    }
  }
}
// sous-toit plein pour fermer les combles
hipRoof(X1 - 2, Z1 - 2, X2 + 2, Z2 + 2, BEAM, 'pixelmon:red_berry_wood', 'polished_blackstone_brick');
// épis de faîtage relevés (onigawara)
for (const z of [19, 20]) {
  set(16, BEAM + 8, z, 'polished_blackstone_bricks'); set(22, BEAM + 8, z, 'polished_blackstone_bricks');
  set(16, BEAM + 9, z, 'polished_blackstone_brick_stairs', stairs('east')); set(22, BEAM + 9, z, 'polished_blackstone_brick_stairs', stairs('west'));
}
// coins relevés de l'avant-toit
function upturnCorners(x1, z1, x2, z2, y0, mat) {
  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) {
    const st = get(x, y0, z);
    set(x, y0, z, mat + '_slab', slab('top'));
    set(x, y0 + 1, z, mat + '_stairs', st.props);
  }
}
upturnCorners(X1 - 2, Z1 - 2, X2 + 2, Z2 + 2, BEAM, 'pixelmon:red_berry_wood');
// lanternes suspendues sous l'avant-toit
for (const x of [12, 16, 22, 26]) set(x, BEAM, Z1 - 1, 'lantern', { hanging: 'true', ...WL });

// ---------------------------------------------------------------- intérieur
// -- hall / accueil Pokémon
for (let x = 18; x <= 20; x++) set(x, 17, 21, 'handcrafted:cherry_counter', { counter: 'quartz_block', facing: 'north', type: x === 19 ? '2' : '1' });
set(17, 17, 21, 'pixelmon:red_pc', { facing: 'south', multipos: 'base' }, { id: 'pixelmon:pc' });
set(17, 18, 21, 'pixelmon:red_pc', { facing: 'south', multipos: 'top' });
set(21, 17, 21, 'pixelmon:red_vending_machine', { facing: 'south', multipos: 'base' }, { id: 'pixelmon:vending_machine' });
set(21, 18, 21, 'pixelmon:red_vending_machine', { facing: 'south', multipos: 'top' });
set(19, 17, 22, 'pixelmon:red_healer', { facing: 'south' }, { id: 'pixelmon:healer' });
set(18, 18, 21, 'another_furniture:service_bell');
set(20, 18, 21, 'pixelmon:mug_pika', { facing: 'south' });
// derrière le comptoir
for (let x = 17; x <= 21; x++) set(x, 17, 24, 'handcrafted:cherry_shelf', { facing: 'north', shape: x === 17 ? 'left' : x === 21 ? 'right' : 'middle', type: String(1 + (x % 5)) });
set(18, 18, 24, 'handcrafted:white_glazed_thick_pot'); set(20, 18, 24, 'handcrafted:blue_glazed_wide_pot');
set(19, 19, 24, 'pixelmon:pink_clock', { facing: 'north' }); // modèle collé au côté sud du bloc quand facing=north
set(17, 17, 23, 'pixelmon:incense_burner'); set(21, 17, 23, 'handcrafted:cherry_side_table', { color: 'red', facing: 'north', ...WL });
set(21, 18, 23, 'handcrafted:stackable_book', { books: '3', facing: 'north', seed: '42' });
// panneau "merci" (repris de l'île d'origine)
set(19, 20, 24, 'cherry_wall_sign', { facing: 'north', ...WL }, null); // nbt défini plus bas
// salle d'attente
set(17, 17, 17, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
set(21, 17, 16, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
set(17, 17, 18, 'handcrafted:red_cushion'); set(17, 17, 19, 'handcrafted:red_cushion');
set(21, 17, 18, 'handcrafted:white_cushion'); set(21, 17, 19, 'handcrafted:white_cushion');
// -- chambre (ouest) : tatami, irori, futons
set(13, FLOOR, 19, 'campfire', { facing: 'north', lit: 'true', signal_fire: 'false', ...WL });
for (const [x, z] of [[13, 18], [13, 20], [12, 19], [14, 19]]) set(x, FLOOR, z, 'dark_oak_planks');
set(13, 17, 18, 'handcrafted:red_cushion'); set(13, 17, 20, 'handcrafted:red_cushion');
set(12, 17, 19, 'handcrafted:white_cushion'); set(14, 17, 19, 'handcrafted:white_cushion'); set(12, 17, 17, 'pixelmon:cooking_pot');
set(12, 17, 24, 'handcrafted:cherry_fancy_bed', { color: 'red', facing: 'south', occupied: 'false', part: 'head', shape: 'single' });
set(12, 17, 23, 'handcrafted:cherry_fancy_bed', { color: 'red', facing: 'south', occupied: 'false', part: 'foot', shape: 'single' });
set(14, 17, 24, 'handcrafted:cherry_fancy_bed', { color: 'white', facing: 'south', occupied: 'false', part: 'head', shape: 'single' });
set(14, 17, 23, 'handcrafted:cherry_fancy_bed', { color: 'white', facing: 'south', occupied: 'false', part: 'foot', shape: 'single' });
set(13, 17, 24, 'handcrafted:cherry_nightstand', { color: 'none', facing: 'north', ...WL });
set(13, 18, 24, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
set(15, 17, 24, 'another_furniture:cherry_drawer', { facing: 'north', open: 'false' });
set(12, 17, 15, 'handcrafted:cherry_nightstand', { color: 'none', facing: 'south', ...WL });
set(12, 18, 15, 'handcrafted:white_glazed_thick_pot');
set(13, 17, 15, 'handcrafted:cherry_desk', { color: 'none', facing: 'south', ...WL });
set(13, 18, 15, 'handcrafted:stackable_book', { books: '2', facing: 'south', seed: '7' });
set(15, 17, 15, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
set(14, 17, 16, 'handcrafted:pink_cushion');
// -- cuisine (est) : bar à ramen, four, hotte
for (let x = 23; x <= 25; x++) set(x, 17, 20, 'handcrafted:cherry_counter', { counter: 'quartz_block', facing: 'north', type: '3' });
for (let x = 23; x <= 25; x++) set(x, 17, 19, 'another_furniture:red_tall_stool');
set(23, 18, 20, 'handcrafted:white_bowl', { facing: 'north', pieces: '1', ...WL }); set(24, 18, 20, 'handcrafted:white_bowl', { facing: 'north', pieces: '1', ...WL }); set(25, 18, 20, 'handcrafted:wood_cup', { facing: 'north', pieces: '2', ...WL });
for (let x = 23; x <= 26; x++) if (x !== 25) set(x, 17, 24, 'handcrafted:cherry_counter', { counter: 'smooth_stone', facing: 'north', type: '1' });
set(25, 17, 24, 'handcrafted:oven', { facing: 'north', lit: 'false' });
set(25, 19, 24, 'handcrafted:kitchen_hood', { facing: 'north' });
set(25, 20, 24, 'handcrafted:kitchen_hood_pipe', { corner: 'false', facing: 'north' });
set(23, 18, 24, 'pixelmon:cooking_pot');
set(24, 18, 24, 'handcrafted:berry_jam_jar', { facing: 'north', jars: '2' });
set(26, 18, 24, 'handcrafted:white_crockery_combo', { facing: 'north', ...WL });
for (const x of [23, 24, 26]) set(x, 19, 24, 'handcrafted:cherry_cupboard', { facing: 'north', type: '2' });
set(26, 17, 22, 'pixelmon:trash_can');
set(23, 17, 15, 'pixelmon:box', { facing: 'north' });

// ---------------------------------------------------------------- cheminées (Sooty Chimneys)
function chimney(x, z, y2, mat, collar) {
  let roofY = y2; while (roofY > BEAM && !get(x, roofY, z)) roofY--;   // bloc de toit sur cette colonne
  set(x, roofY, z, collar);
  for (let y = roofY + 1; y <= y2; y++) set(x, y, z, 'sootychimneys:' + mat, { stacked: y < y2 ? 'true' : 'false' });
}
chimney(25, 24, BEAM + 5, 'stone_brick_chimney', 'stone_bricks');   // cuisine
chimney(13, 19, BEAM + 7, 'terracotta_chimney', 'terracotta');       // irori

// ---------------------------------------------------------------- grenier (combles) : y=21 plancher, on marche à y=22
// zone debout : x=12..26, z=15..24 (2 de haut partout, jusqu'à 6 au centre)
{
  const AY = BEAM + 1;
  const doll = (x, y, z, name, facing) => set(x, y, z, 'pokeblocks:pokedoll_' + name, { facing });
  // échelle depuis l'entrée du hall (coin nord-ouest)
  for (let y = FLOOR + 1; y <= AY; y++) set(17, y, Z1 + 1, 'ladder', { facing: 'south', ...WL });
  // tapis du salon : bordure rouge, centre blanc
  for (let x = 17; x <= 21; x++) for (let z = 17; z <= 22; z++)
    set(x, AY, z, (x === 17 || x === 21 || z === 17 || z === 22) ? 'red_carpet' : 'white_carpet');
  // table basse (kotatsu) + coussins
  for (const z of [19, 20]) set(19, AY, z, 'handcrafted:cherry_side_table', { color: 'red', facing: 'north', ...WL });
  set(19, AY + 1, 19, 'pixelmon:mug_pika', { facing: 'west' });
  set(19, AY + 1, 20, 'handcrafted:wood_cup', { facing: 'north', pieces: '3', ...WL });
  for (const [x, z, c] of [[18, 19, 'red'], [18, 20, 'white'], [20, 19, 'white'], [20, 20, 'red'], [19, 18, 'pink'], [19, 21, 'pink']]) set(x, AY, z, `handcrafted:${c}_cushion`);
  // lanternes suspendues au faîtage
  for (const [x, z] of [[17, 19], [21, 20]]) {
    for (let y = AY + 3; y <= AY + 5; y++) set(x, y, z, 'chain', { axis: 'y', ...WL });
    set(x, AY + 2, z, 'lantern', { hanging: 'true', ...WL });
  }
  // coin futons / thé (ouest, autour du conduit de l'irori)
  for (const z of [22, 23, 24]) { set(12, AY, z, 'white_wool'); set(12, AY + 1, z, z === 23 ? 'red_wool' : 'white_wool'); }
  set(14, AY, 21, 'handcrafted:cherry_side_table', { color: 'pink', facing: 'north', ...WL });
  set(14, AY + 1, 21, 'handcrafted:white_crockery_combo', { facing: 'north', ...WL });
  set(15, AY, 21, 'handcrafted:white_cushion'); set(14, AY, 22, 'handcrafted:red_cushion');
  set(12, AY, 17, 'pixelmon:incense_burner');
  set(12, AY, 15, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  set(14, AY, 15, 'handcrafted:cherry_desk', { color: 'none', facing: 'south', ...WL });
  set(14, AY + 1, 15, 'handcrafted:stackable_book', { books: '4', facing: 'south', seed: '77' });
  set(15, AY, 16, 'handcrafted:cherry_chair', { color: 'red', facing: 'north', ...WL });
  set(12, AY, 20, 'handcrafted:terracotta_thick_pot');
  // étagère à peluches (fond, côté sud)
  for (let x = 17; x <= 22; x++) set(x, AY, Z2 - 1, 'handcrafted:cherry_shelf', { facing: 'north', shape: x === 17 ? 'left' : x === 22 ? 'right' : 'middle', type: String(1 + (x % 5)) });
  [['eevee', 17], ['charmander', 18], ['bulbasaur', 19], ['squirtle', 20], ['jigglypuff', 21], ['mimikyu', 22]].forEach(([n, x]) => doll(x, AY + 1, Z2 - 1, n, 'north'));
  doll(16, AY, 22, 'snorlax', 'east');
  set(16, AY, 24, 'pokeblocks:magikarp_fishbowl');
  set(15, AY, 24, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  // coin lecture / rangement (est)
  set(25, AY, 17, 'pixelmon:red_armchair', { facing: 'east' });
  set(26, AY, 16, 'handcrafted:cherry_nightstand', { color: 'none', facing: 'west', ...WL });
  set(26, AY + 1, 16, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  set(26, AY, 18, 'handcrafted:stackable_book', { books: '3', facing: 'west', seed: '12' });
  set(24, AY, 15, 'pixelmon:box', { facing: 'south' }); set(25, AY, 15, 'pixelmon:box', { facing: 'south' }); set(25, AY + 1, 15, 'pixelmon:box', { facing: 'south' });
  set(26, AY, 15, 'another_furniture:cherry_drawer', { facing: 'west', open: 'false' });
  set(26, AY + 1, 15, 'pokeblocks:pokedoll_munchlax', { facing: 'west' });
  set(23, AY, 19, 'handcrafted:pink_cushion');
  set(26, AY, 21, 'another_furniture:red_sofa', { facing: 'west', type: 'single' });
  set(26, AY, 24, 'handcrafted:white_glazed_thick_pot'); set(24, AY, 24, 'handcrafted:terracotta_wide_pot');
  set(23, AY, 24, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  set(22, AY, 15, 'lantern', { hanging: 'false', ...WL });
  set(19, AY, 15, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
}

// ---------------------------------------------------------------- façade : volets, jardinières
for (const [x, z, face] of windows) {
  if (face === 'west' || face === 'east') {
    const ox = face === 'west' ? x - 1 : x + 1;
    set(ox, 17, z, 'another_furniture:cherry_flower_box', { facing: face, attached: 'true', horizontal: 'single' });
  }
}
for (const [x, z, face] of [[X1, 15, 'west'], [X1, 18, 'west'], [X1, 21, 'west'], [X1, 24, 'west'], [X2, 15, 'east'], [X2, 18, 'east'], [X2, 21, 'east'], [X2, 24, 'east']]) {
  if (pillarZ.includes(z)) continue;
  const ox = face === 'west' ? x - 1 : x + 1;
  set(ox, 18, z, 'another_furniture:cherry_shutter', { variant: '3', vertical: 'bottom', facing: face, open: 'false', hinge: 'left' });
  set(ox, 19, z, 'another_furniture:cherry_shutter', { variant: '3', vertical: 'top', facing: face, open: 'false', hinge: 'left' });
}
// véranda : bancs et lampes
set(16, 17, Z1 - 1, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
set(22, 17, Z1 - 1, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
for (const [x1, x2] of [[11, 13], [25, 27]]) for (let x = x1; x <= x2; x++)
  set(x, 17, Z1 - 1, 'another_furniture:cherry_bench', { facing: 'north', horizontal_1: x === x1 ? 'left' : x === x2 ? 'right' : 'middle', horizontal_2: 'single', back: 'false' });
set(19, BEAM, Z1 - 1, 'cherry_hanging_sign', { rotation: '8', attached: 'false', ...WL });

// ---------------------------------------------------------------- torii
{
  const tz = 7, xa = 16, xb = 22;
  for (const x of [xa, xb]) {
    set(x, 15, tz, 'polished_blackstone');
    for (let y = 16; y <= 20; y++) set(x, y, tz, 'pixelmon:red_berry_wood_planks');
  }
  fill(xa - 1, 19, tz, xb + 1, 19, tz, 'pixelmon:red_berry_wood_planks');   // nuki
  set(19, 20, tz, 'black_concrete');                                          // gakuzuka
  fill(xa - 1, 21, tz, xb + 1, 21, tz, 'pixelmon:red_berry_wood_planks');    // shimaki
  fill(xa - 2, 22, tz, xb + 2, 22, tz, 'polished_blackstone_bricks');        // kasagi
  set(xa - 3, 22, tz, 'polished_blackstone_brick_stairs', stairs('east', 'bottom'));
  set(xb + 3, 22, tz, 'polished_blackstone_brick_stairs', stairs('west', 'bottom'));
  set(xa - 3, 23, tz, 'polished_blackstone_brick_slab', slab('bottom'));
  set(xb + 3, 23, tz, 'polished_blackstone_brick_slab', slab('bottom'));
  set(xa - 2, 23, tz, 'polished_blackstone_brick_slab', slab('bottom'));
  set(xb + 2, 23, tz, 'polished_blackstone_brick_slab', slab('bottom'));
  // shimenawa (corde) + clochettes
  set(18, 18, tz, 'chain', { axis: 'y', ...WL }); set(20, 18, tz, 'chain', { axis: 'y', ...WL });
  set(18, 17, tz, 'lantern', { hanging: 'true', ...WL }); set(20, 17, tz, 'lantern', { hanging: 'true', ...WL });
}

// ---------------------------------------------------------------- lanternes de pierre (tōrō)
function toro(x, z) {
  set(x, 15, z, 'stone_bricks');
  set(x, 16, z, 'handcrafted:stone_pillar_trim', { face: 'floor', facing: 'north', trim: 'thin', type: '1', ...WL });
  set(x, 17, z, 'lantern', { hanging: 'false', ...WL });
  set(x, 18, z, 'stone_brick_slab', slab('bottom'));
}
toro(16, 10); toro(22, 10); toro(16, 31); toro(22, 31); toro(9, 21); toro(31, 9);

// ---------------------------------------------------------------- waystone (repris de l'île d'origine)
const src = plain(read(fs.readFileSync(DEFAULT_NBT)).root);
const srcBlock = (name, y) => src.blocks.find(b => src.palette[b.state].Name === name && (y === undefined || b.pos[1] === y));
const wsLow = srcBlock('waystones:blackstone_waystone', 14), wsUp = srcBlock('waystones:blackstone_waystone', 15);
set(13, 15, 9, 'waystones:purpur_waystone', { waterlogged: 'false', origin: 'player', half: 'lower', facing: 'east' }, wsLow.nbt);
set(13, 16, 9, 'waystones:purpur_waystone', { waterlogged: 'false', origin: 'player', half: 'upper', facing: 'east' }, wsUp.nbt);

// ---------------------------------------------------------------- îlot flottant du temple des crates (sud-est)
const PAV = { ax: 25, bx: 30, az: 39, bz: 42 };
const ICX = 27.5, ICZ = 41, IR = 5.8;
const islet = new Map(); // (x,z) -> y du dessous
for (let x = 18; x <= 38; x++) for (let z = 32; z < L; z++) {
  const dx = x - ICX, dz = z - ICZ, th = Math.atan2(dz, dx);
  const rho = Math.hypot(dx, dz) / (IR + 0.5 * Math.sin(4 * th + 1));
  if (rho > 1) continue;
  let depth = Math.round(8 * (1 - Math.pow(rho, 1.3)) + hash(x, 17, z) * 1.8 - 0.5);
  if (hash(x, 19, z) > 0.9 && rho < 0.75) depth += 2;
  depth = Math.max(1, depth);
  islet.set(`${x},${z}`, G - depth);
  for (let y = G - depth; y <= G; y++) {
    const dd = G - y, r = hash(x, y + 50, z);
    let b = dd === 0 ? 'grass_block' : dd <= 2 ? 'dirt' : r < 0.5 ? 'stone' : r < 0.75 ? 'andesite' : r < 0.9 ? 'tuff' : 'cobblestone';
    if (y === G - depth && dd > 2 && r > 0.55) b = 'mossy_cobblestone';
    set(x, y, z, b, b === 'grass_block' ? { snowy: 'false' } : {});
  }
}
const onIslet = (x, z) => islet.has(`${x},${z}`);
// pont en arc (taiko-bashi) en bois de baie rouge
{
  const BX = [25, 26, 27, 28, 29];
  let zs = 99, ze = -1;
  for (const x of BX) {
    let last = -1; for (let z = 20; z < L; z++) if (onIsland(x, z)) last = z;
    let first = -1; for (let z = 32; z < L; z++) if (onIslet(x, z)) { first = z; break; }
    zs = Math.min(zs, last); ze = Math.max(ze, first);
  }
  const n = ze - zs + 1;
  const rail = (x, z) => x === BX[0] || x === BX[4];
  for (let i = 0; i < n; i++) {
    const z = zs + i, v = Math.min(i, n - 1 - i, 3);  // hauteur en demi-blocs
    for (const x of BX) {
      if (rail(x, z) || v % 2 === 0) {
        const top = G + Math.ceil(v / 2);                 // bloc plein
        for (let y = Math.max(G, top - 1); y <= top; y++) set(x, y, z, 'pixelmon:red_berry_wood_planks');
        if (rail(x, z)) set(x, top + 1, z, 'pixelmon:red_berry_wood_fence', {});
      } else {
        const y = G + 1 + (v - 1) / 2;                    // demi-dalle
        set(x, y, z, 'pixelmon:red_berry_wood_slab', slab('bottom'));
        set(x, y - 1, z, 'pixelmon:red_berry_wood_planks');
      }
    }
  }
  // lanternes sur les poteaux d'extrémité
  for (const z of [zs, ze]) for (const x of [BX[0], BX[4]]) set(x, G + 2, z, 'lantern', { hanging: 'false', ...WL });
  // connexions des garde-corps
  for (const x of [BX[0], BX[4]]) for (let z = zs; z <= ze; z++) for (let y = G; y <= G + 4; y++) {
    const b = get(x, y, z); if (b?.name !== 'pixelmon:red_berry_wood_fence') continue;
    const f = (zz) => get(x, y, zz)?.name === 'pixelmon:red_berry_wood_fence';
    b.props = { north: String(f(z - 1)), south: String(f(z + 1)), east: 'false', west: 'false', ...WL };
  }
  // chemins vers le pont
  for (let z = 28; z < zs; z += 2) surf(27, z, 'polished_andesite');
  for (let z = ze + 1; z < PAV.az - 1; z++) for (const x of [27, 28]) if (onIslet(x, z)) set(x, G, z, 'polished_andesite');
}
// pavillon des crates
{
  const { ax, bx, az, bz } = PAV;
  fill(ax, 15, az, bx, 15, bz, 'pixelmon:temple_brick');
  for (const [x, z] of [[ax, az], [bx, az], [ax, bz], [bx, bz]]) {
    set(x, 15, z, 'chiseled_stone_bricks');
    for (let y = 16; y <= 19; y++) set(x, y, z, 'pixelmon:red_berry_wood_planks');
  }
  for (let x = ax + 1; x < bx; x++) { set(x, 15, az - 1, 'stone_brick_stairs', stairs('south')); }
  hipRoof(ax - 1, az - 1, bx + 1, bz + 1, 19, 'pixelmon:red_berry_wood', 'polished_blackstone_brick');
  upturnCorners(ax - 1, az - 1, bx + 1, bz + 1, 19, 'pixelmon:red_berry_wood');
  const crates = ['poke_crate', 'great_crate', 'ultra_crate', 'master_crate'];
  crates.forEach((c, i) => set(ax + 1 + i, 16, az + 2, 'helscrates:' + c, { opening: 'false' }, { id: 'helscrates:crate_block_entity' }));
  set(ax + 1, 19, az, 'lantern', { hanging: 'true', ...WL }); set(bx - 1, 19, az, 'lantern', { hanging: 'true', ...WL });
  set(ax, 15, az - 1, 'handcrafted:terracotta_wide_pot'); set(bx, 15, az - 1, 'handcrafted:terracotta_wide_pot');
  set(ax + 1, 16, bz, 'another_furniture:red_stool', { low: 'false' });
  // décor de l'îlot
  for (const [x, z] of [[23, 40], [32, 40]]) if (onIslet(x, z)) toro(x, z); else console.warn('toro hors îlot', x, z);
  if (onIslet(31, 44)) { set(31, 15, 44, 'pixelmon:pink_umbrella', { facing: 'north', multipos: 'base' }); set(31, 16, 44, 'pixelmon:pink_umbrella', { facing: 'north', multipos: 'top' }); }
  for (const k of islet.keys()) {
    const [x, z] = k.split(',').map(Number);
    if (get(x, G, z)?.name !== 'minecraft:grass_block' || get(x, G + 1, z)) continue;
    const r = hash(x, 31, z);
    if (r > 0.55) set(x, G + 1, z, 'pink_petals', { facing: pick(['north', 'east', 'south', 'west'], x, 1, z), flower_amount: String(1 + Math.floor(hash(x, 32, z) * 4)) });
    else if (r < 0.12) set(x, G + 1, z, 'short_grass');
  }
}

// ---------------------------------------------------------------- coffres de départ (repris de l'île d'origine)
const chests = src.blocks.filter(b => src.palette[b.state].Name === 'sophisticatedstorage:chest');
const keyChest = chests.find(b => JSON.stringify(b.nbt).includes('poke_key')) || chests[0];
const emptyChest = chests.find(b => b !== keyChest) || chests[0];
set(26, 17, 15, 'sophisticatedstorage:chest', { ticking: 'false', waterlogged: 'false', facing: 'west', type: 'single' }, keyChest.nbt);
set(26, 17, 16, 'sophisticatedstorage:chest', { ticking: 'false', waterlogged: 'false', facing: 'west', type: 'single' }, emptyChest.nbt);

// ---------------------------------------------------------------- bassin à koï (ouest)
for (let x = 2; x <= 9; x++) for (let z = 13; z <= 23; z++) {
  const e = ((x - 5.5) / 2.9) ** 2 + ((z - 18) / 4.6) ** 2;
  if (e > 1 || !onIsland(x, z)) continue;
  const deep = e < 0.45;
  set(x, G, z, 'water', { level: '0' });
  if (deep) { set(x, G - 1, z, 'water', { level: '0' }); set(x, G - 2, z, 'clay'); } else set(x, G - 1, z, hash(x, 2, z) > 0.5 ? 'gravel' : 'clay');
}
// bordure de pierres
for (let x = 1; x <= 10; x++) for (let z = 12; z <= 24; z++) {
  if (get(x, G, z)?.name !== 'minecraft:grass_block') continue;
  const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => get(x + dx, G, z + dz)?.name === 'minecraft:water');
  if (nearWater) {
    set(x, G, z, pick(['mossy_cobblestone', 'andesite', 'stone', 'tuff'], x, 4, z));
    if (hash(x, 6, z) > 0.75) set(x, G + 1, z, pick(['mossy_cobblestone_slab', 'andesite_slab', 'stone_slab'], x, 5, z), slab('bottom'));
  }
}
for (const [x, z] of [[4, 16], [6, 19], [5, 21], [7, 15]]) if (get(x, G, z)?.name === 'minecraft:water') set(x, G + 1, z, 'lily_pad');
if (get(5, G, 18)?.name === 'minecraft:water') { set(5, G + 1, 18, 'mossy_cobblestone'); set(5, G + 2, 18, 'moss_carpet'); }
// coin détente : banc + ombrelles Pixelmon
for (const [x, z] of [[5, 25], [6, 25], [7, 25]]) if (!onIsland(x, z)) console.warn('coin détente hors île', x, z);
set(6, 15, 25, 'pixelmon:bench', { facing: 'north' });
set(5, 15, 25, 'pixelmon:red_umbrella', { facing: 'north', multipos: 'base' });
set(5, 16, 25, 'pixelmon:red_umbrella', { facing: 'north', multipos: 'top' });
set(7, 15, 25, 'handcrafted:cherry_side_table', { color: 'red', facing: 'north', ...WL });
set(7, 16, 25, 'handcrafted:wood_cup', { facing: 'north', pieces: '2', ...WL });

// ---------------------------------------------------------------- jardin zen (nord-est)
for (let x = 23; x <= 29; x++) for (let z = 8; z <= 12; z++) {
  if (!onIsland(x, z)) continue;
  const edge = x === 23 || x === 29 || z === 8 || z === 12;
  set(x, G, z, edge ? 'polished_andesite' : 'sand');
}
for (const [x, z, b] of [[25, 10, 'andesite'], [26, 10, 'tuff'], [27, 9, 'mossy_cobblestone'], [27, 11, 'andesite']]) set(x, G + 1, z, b);
set(26, G + 2, 10, 'andesite_slab', slab('bottom')); set(25, G + 1, 11, 'moss_carpet'); set(28, G + 1, 10, 'moss_carpet');

// ---------------------------------------------------------------- bambouseraie (sud-ouest)
for (const [x, z, h] of [[7, 27, 7], [8, 28, 8], [9, 26, 6], [10, 28, 7], [8, 30, 6], [11, 26, 5], [9, 29, 8], [7, 29, 5], [11, 29, 6]]) {
  if (!onIsland(x, z)) continue;
  set(x, G, z, 'grass_block', { snowy: 'false' });
  for (let i = 0; i < h; i++) {
    const lv = i >= h - 2 ? 'large' : i === h - 3 ? 'small' : 'none';
    set(x, G + 1 + i, z, 'bamboo', { age: '1', leaves: lv, stage: '0' });
  }
}

// ---------------------------------------------------------------- cerisiers (sakura)
function sakura(x0, z0, h, r) {
  if (!onIsland(x0, z0)) { console.warn('sakura hors île', x0, z0); return; }
  const leaf = (x, y, z) => { if (!get(x, y, z)) set(x, y, z, 'cherry_leaves', leaves); };
  const blob = (cx, cy, cz, rr) => {
    for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) for (let dz = -Math.ceil(rr); dz <= Math.ceil(rr); dz++) for (let dy = -1; dy <= Math.ceil(rr * 0.7); dy++) {
      const d = Math.hypot(dx, dz, dy * 1.5);
      if (d <= rr + 0.35 - hash(cx + dx, cy + dy, cz + dz) * 0.7) leaf(cx + dx, cy + dy, cz + dz);
    }
  };
  for (let y = 1; y <= h; y++) set(x0, G + y, z0, 'cherry_log', logY);
  const ends = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];
  dirs.slice(0, r >= 3 ? 6 : 4).forEach(([dx, dz], i) => {
    const len = r >= 3 ? 2 + (i % 2) : 1 + (i % 2);
    let x = x0, z = z0, y = G + h - 1 - (i % 2);
    for (let s = 1; s <= len; s++) {
      x += dx; z += dz; if (s % 2 === 0) y++;
      set(x, y, z, 'cherry_log', dx && !dz ? logX : !dx && dz ? logZ : logY);
    }
    ends.push([x, y + 1, z]);
  });
  blob(x0, G + h + 1, z0, r - 0.3);
  for (const [x, y, z] of ends) blob(x, y, z, Math.max(1.8, r - 0.8));
  // rideaux de fleurs qui pendent
  for (let dx = -r - 2; dx <= r + 2; dx++) for (let dz = -r - 2; dz <= r + 2; dz++) {
    const x = x0 + dx, z = z0 + dz;
    for (let y = G + h + 3; y >= G + 2; y--) {
      if (get(x, y, z)?.name === 'minecraft:cherry_leaves' && !get(x, y - 1, z)) {
        if (hash(x, 11, z) > 0.7) leaf(x, y - 1, z);
        if (hash(x, 12, z) > 0.9) leaf(x, y - 2, z);
        break;
      }
      if (get(x, y, z)) break;
    }
  }
  // pétales au sol
  for (let dx = -r - 2; dx <= r + 2; dx++) for (let dz = -r - 2; dz <= r + 2; dz++) {
    const x = x0 + dx, z = z0 + dz;
    if (get(x, G, z)?.name !== 'minecraft:grass_block' || get(x, G + 1, z) || hash(x, 13, z) < 0.4) continue;
    set(x, G + 1, z, 'pink_petals', { facing: pick(['north', 'east', 'south', 'west'], x, 1, z), flower_amount: String(1 + Math.floor(hash(x, 14, z) * 4)) });
  }
}
sakura(9, 8, 5, 3);
sakura(33, 20, 5, 3);
sakura(12, 31, 4, 2);
sakura(27, 6, 3, 2);

// ---------------------------------------------------------------- portail de donjon (sud) : cercle de pierre
for (let x = 15; x <= 23; x++) for (let z = 28; z <= 35; z++) {
  const d = Math.hypot(x - 19, z - 32);
  if (!onIsland(x, z) || get(x, G + 1, z)) continue;
  if (d <= 1.5) set(x, G, z, 'gravel');
  else if (d <= 2.6) set(x, G, z, 'polished_andesite');
  else if (d <= 3.2 && hash(x, 8, z) > 0.4) set(x, G, z, 'mossy_cobblestone');
}

// ---------------------------------------------------------------- végétation
for (const [k, rho] of top) {
  const [x, z] = k.split(',').map(Number);
  const b = get(x, G, z);
  if (b?.name !== 'minecraft:grass_block' || get(x, G + 1, z)) continue;
  if (x >= X1 - 1 && x <= X2 + 1 && z >= Z1 - 2 && z <= Z2 + 1) continue;
  if (z >= 3 && z <= 12 && x >= 15 && x <= 23) continue; // dégagement autour de l'allée
  const r = hash(x, 20, z);
  if (r > 0.86) set(x, G + 1, z, 'short_grass');
  else if (r > 0.82) set(x, G + 1, z, 'fern');
  else if (r > 0.80) set(x, G + 1, z, pick(['allium', 'azure_bluet', 'lily_of_the_valley', 'pink_tulip', 'white_tulip'], x, 21, z));
  else if (r > 0.79 && rho < 0.85) set(x, G + 1, z, 'azalea');
  else if (r < 0.04) set(x, G + 1, z, 'moss_carpet');
}

// ---------------------------------------------------------------- connexions (barrières, vitres, murets)
const NONSOLID = /air|lantern|chain|carpet|petals|grass$|fern|flower|tulip|allium|bluet|valley|azalea|lily_pad|bamboo|torch|sign|water|stairs|slab|campfire|another_furniture|handcrafted|pixelmon:(?!.*planks)|helscrates|waystones|trapdoor|curtain|cushion/;
function solidOrSame(x, y, z, fam) {
  const b = get(x, y, z);
  if (!b) return false;
  if (fam.test(b.name)) return true;
  return !NONSOLID.test(b.name);
}
for (const [k, b] of grid) {
  const [x, y, z] = k.split(',').map(Number);
  if (/glass_pane$/.test(b.name)) {
    const fam = /glass_pane$/;
    b.props = { north: String(solidOrSame(x, y, z - 1, fam)), south: String(solidOrSame(x, y, z + 1, fam)), east: String(solidOrSame(x + 1, y, z, fam)), west: String(solidOrSame(x - 1, y, z, fam)), ...WL };
  } else if (/_wall$/.test(b.name) && !/hanging/.test(b.name)) {
    const fam = /_wall$/;
    const c = (xx, zz) => solidOrSame(xx, y, zz, fam) ? 'low' : 'none';
    const n = c(x, z - 1), s = c(x, z + 1), e = c(x + 1, z), w = c(x - 1, z);
    const straight = (n !== 'none' && s !== 'none' && e === 'none' && w === 'none') || (e !== 'none' && w !== 'none' && n === 'none' && s === 'none');
    b.props = { north: n, south: s, east: e, west: w, up: String(!straight || !!get(x, y + 1, z)), ...WL };
  }
}

// ---------------------------------------------------------------- entités : portail de donjon + cadre
const entities = [];
const gate = src.entities.find(e => e.nbt.id === 'pixelgo_dungeon:gate');
if (gate) entities.push({ pos: [19.5, 17, 32.5], blockPos: [19, 17, 32], nbt: { ...gate.nbt } });
const frame = src.entities.find(e => e.nbt.id === 'minecraft:item_frame');
if (frame) entities.push({ pos: [19.5, 18.5, 24.96875], blockPos: [19, 18, 24], nbt: { id: 'minecraft:item_frame' } }); // sac Pokémon au mur du fond

// ---------------------------------------------------------------- panneaux (texte)
const txt = s => JSON.stringify({ text: s });
const signNbt = (lines, color = 'black', glow = 0) => ({
  id: 'minecraft:hanging_sign', is_waxed: 1,
  front_text: { color, has_glowing_text: glow, messages: lines.map(txt) },
  back_text: { color, has_glowing_text: glow, messages: lines.map(txt) },
});
get(19, 20, 24).nbt = { ...signNbt(['', 'Thank you', 'for downloading!', '']), id: 'minecraft:sign' };
get(19, BEAM, Z1 - 1).nbt = signNbt(['ポケモンセンター', 'Pokémon', 'Center', ''], 'red', 1);
// pavillon
set(PAV.ax + 2, 18, PAV.az - 1, 'cherry_hanging_sign', { rotation: '8', attached: 'false', ...WL }, signNbt(['', 'Crate', 'Temple', '']));
// le panneau suspendu a besoin d'un support : un bloc de toit est au-dessus (y=19)

// ---------------------------------------------------------------- export NBT
// conversion "plain JS" -> tags NBT typés
function toTag(v) {
  if (v && v.__tag) return v.__tag;
  if (typeof v === 'string') return T.str(v);
  if (typeof v === 'boolean') return T.b(v ? 1 : 0);
  if (typeof v === 'number') return Number.isInteger(v) ? T.i(v) : T.d(v);
  if (Array.isArray(v)) {
    if (v.length && v.every(e => Number.isInteger(e))) return T.ia(v);
    const items = v.map(toTag);
    return T.list(items.length ? items[0].t : 0, items);
  }
  const o = {};
  for (const [k, e] of Object.entries(v)) o[k] = toTag(e);
  return T.c(o);
}
// les NBT repris de l'original gardent leurs types exacts
function rawTag(name, y, filter) {
  const { root } = read(fs.readFileSync(DEFAULT_NBT));
  const p = root.v.palette.v;
  return root.v.blocks.v.filter(b => p[b.v.state.v].v.Name.v === name && (y === undefined || b.v.pos.v[1].v === y)).filter(filter || (() => true));
}
const rawRoot = read(fs.readFileSync(DEFAULT_NBT)).root;
const rawPalette = rawRoot.v.palette.v;
const rawBlocks = rawRoot.v.blocks.v;
const rawByPos = (pos) => rawBlocks.find(b => b.v.pos.v.map(t => t.v).join() === pos.join());
// map des NBT bruts pour les blocs repris
const keepRaw = new Map();
keepRaw.set(K(13, 15 + DY, 9), rawByPos(wsLow.pos).v.nbt);
keepRaw.set(K(13, 16 + DY, 9), rawByPos(wsUp.pos).v.nbt);
keepRaw.set(K(26, 17 + DY, 15), rawByPos(keyChest.pos).v.nbt);
keepRaw.set(K(26, 17 + DY, 16), rawByPos(emptyChest.pos).v.nbt);
const rawEntities = rawRoot.v.entities.v;
// coffres Sophisticated Storage : corps rose, accents rouges (couleurs de teinture, ARGB signé)
const ARGB = hex => (0xFF000000 | hex) | 0;
function recolor(tag, main, accent) {
  if (!tag || typeof tag.v !== 'object' || tag.v === null) return;
  for (const [k, e] of Object.entries(tag.v)) {
    if (e && e.t === 3 && /mainColor|main_color/.test(k)) e.v = main;
    else if (e && e.t === 3 && /accentColor|accent_color/.test(k)) e.v = accent;
    else if (e && (e.t === 10 || e.t === 9)) recolor(e, main, accent);
  }
}
for (const [x, z] of [[26, 15], [26, 16]]) recolor(keepRaw.get(K(x, 17 + DY, z)), ARGB(0xF38BAA), ARGB(0xB02E26));

const palette = [], palIndex = new Map(), blocks = [];
for (const [k, b] of grid) {
  const [x, y, z] = k.split(',').map(Number);
  const props = Object.fromEntries(Object.entries(b.props).sort());
  const key = b.name + JSON.stringify(props);
  if (!palIndex.has(key)) {
    palIndex.set(key, palette.length);
    const pt = { Name: T.str(b.name) };
    if (Object.keys(props).length) pt.Properties = T.c(Object.fromEntries(Object.entries(props).map(([pk, pv]) => [pk, T.str(String(pv))])));
    palette.push(T.c(pt));
  }
  const bt = { state: T.i(palIndex.get(key)), pos: T.list(3, [T.i(x), T.i(y), T.i(z)]) };
  if (keepRaw.has(k)) bt.nbt = keepRaw.get(k);
  else if (b.nbt) bt.nbt = toTag(b.nbt);
  blocks.push(T.c(bt));
}
const entTags = entities.map(e => {
  const raw = rawEntities.find(r => r.v.nbt.v.id.v === e.nbt.id);
  const nbt = { ...raw.v.nbt.v };
  e.pos = [e.pos[0], e.pos[1] + DY, e.pos[2]]; e.blockPos = [e.blockPos[0], e.blockPos[1] + DY, e.blockPos[2]];
  nbt.Pos = T.list(6, e.pos.map(T.d));
  if (e.nbt.id === 'minecraft:item_frame') {
    nbt.Facing = T.b(2);
    nbt.Item = T.c({ ...nbt.Item.v, id: T.str('pixelmon:pink_poke_bag') });
    nbt.TileX = T.i(e.blockPos[0]); nbt.TileY = T.i(e.blockPos[1]); nbt.TileZ = T.i(e.blockPos[2]);
  }
  return T.c({ pos: T.list(6, e.pos.map(T.d)), blockPos: T.list(3, e.blockPos.map(T.i)), nbt: T.c(nbt) });
});
const root = T.c({
  size: T.list(3, [T.i(W), T.i(H), T.i(L)]),
  blocks: T.list(10, blocks),
  palette: T.list(10, palette),
  entities: T.list(10, entTags),
  DataVersion: T.i(3955),
});
fs.writeFileSync(OUT, write(root));
fs.writeFileSync(path.join(ROOT, 'tools/pixelgo-island/preview.json'), JSON.stringify({ size: [W, H, L], blocks: [...grid].map(([k, b]) => [k, b.name, b.props]) }));
console.log('spawn (relatif gabarit):', [19, 15 + DY, 5], 'DY', DY);
console.log('écrit', OUT, 'blocs', blocks.length, 'palette', palette.length, 'entités', entTags.length);
