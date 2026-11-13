// Générateur de la grande île de départ v3 « Windhaven » (village flottant, toits bleus)
// Sortie : structure NBT vanilla (DataVersion 1.21.1) pour SkyblockBuilder.
//   node tools/pixelgo-island/windhaven.mjs
//   node tools/pixelgo-island/render.mjs tools/pixelgo-island/preview-windhaven.json tools/pixelgo-island/preview-windhaven.png se 6
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { read, write, T, plain } from './nbt.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = process.argv[2] || path.join(ROOT, 'config/skyblockbuilder/templates/islands/windhaven.nbt');
const DEFAULT_NBT = path.join(ROOT, 'config/skyblockbuilder/templates/islands/default.nbt');

const W = 81, L = 81, H = 50;  // gabarit
const CX = 40, CZ = 40;        // centre de l'île principale
const G = 24;                  // couche d'herbe (on marche à y=25)

// ---------------------------------------------------------------- grille
const grid = new Map();
const K = (x, y, z) => `${x},${y},${z}`;
function set(x, y, z, name, props = {}, nbt = null) {
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) { console.warn('hors gabarit', name, x, y, z); return; }
  if (!name.includes(':')) name = 'minecraft:' + name;
  grid.set(K(x, y, z), { name, props, nbt });
}
const get = (x, y, z) => grid.get(K(x, y, z));
const del = (x, y, z) => grid.delete(K(x, y, z));
const is = (x, y, z, re) => { const b = get(x, y, z); return !!b && re.test(b.name); };
function fill(x1, y1, z1, x2, y2, z2, name, props = {}) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) set(x, y, z, name, props);
}
function clear(x1, y1, z1, x2, y2, z2) {
  for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) del(x, y, z);
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
const lantern = (hanging = false) => ({ hanging: String(hanging), ...WL });
const BLUE = 'pixelmon:blue_berry_wood';
const stoneMix = (x, y, z) => { const r = hash(x, y + 300, z); return r < 0.62 ? 'stone_bricks' : r < 0.78 ? 'mossy_stone_bricks' : r < 0.9 ? 'cobblestone' : 'cracked_stone_bricks'; };

// ---------------------------------------------------------------- île principale : forme
function radiusAt(t) { return 32.5 + 1.6 * Math.sin(3 * t + 0.5) + 0.9 * Math.sin(5 * t + 2) + 0.5 * Math.sin(9 * t + 1); }
const rhoMap = new Map();
for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) {
  const dx = x - CX, dz = z - CZ;
  const rho = Math.hypot(dx, dz) / radiusAt(Math.atan2(dz, dx));
  if (rho <= 1) rhoMap.set(`${x},${z}`, rho);
}
const onIsland = (x, z) => rhoMap.has(`${x},${z}`);

// colline (ouest) : plateau du sanctuaire, falaise au sud au-dessus du lac
const HX = 17, HZ = 36, HP = 5, HR = 11, HH = 7;
const inRect = (x, z, x1, z1, x2, z2) => x >= x1 && x <= x2 && z >= z1 && z <= z2;
const LAKE = (x, z) => {
  if (inRect(x, z, 19, 39, 22, 44)) return 0.6;                // anse sous la cascade
  const e = ((x - 22) / 6.3) ** 2 + ((z - 48) / 4.6) ** 2;
  return e <= 1 ? e : null;
};
function hillH(x, z) {
  if (LAKE(x, z) !== null) return 0;
  if (inRect(x, z, 12, 32, 22, 38)) return HH;                 // plateau aplani (sanctuaire + source)
  const dx = x - HX, dz = z - HZ;
  const d = Math.hypot(dx, dz > 0 ? dz * 2 : dz);
  if (d <= HP) return HH;
  if (d >= HR) return 0;
  const t = (d - HP) / (HR - HP);
  return Math.max(0, Math.min(HH, Math.round(HH * (1 - Math.pow(t, 1.15)) + (hash(x, 77, z) - 0.5) * 0.9)));
}
const hMap = new Map();
for (const k of rhoMap.keys()) { const [x, z] = k.split(',').map(Number); hMap.set(k, hillH(x, z)); }
// sentier en escalier vers le plateau (z=35..37, de x=29 à x=22)
const PATH_Z = [35, 36, 37];
const pathH = x => Math.max(0, Math.min(HH, 29 - x));
for (let x = 22; x <= 29; x++) for (const z of PATH_Z) hMap.set(`${x},${z}`, pathH(x));
const hAt = (x, z) => hMap.get(`${x},${z}`) ?? -99;
const surfY = (x, z) => G + Math.max(0, hAt(x, z));

// ---------------------------------------------------------------- île principale : volume
for (const [k, rho] of rhoMap) {
  const [x, z] = k.split(',').map(Number);
  const h = hAt(x, z), top = G + h;
  let depth = Math.round(21 * (1 - Math.pow(rho, 1.45)) + hash(x, 7, z) * 2.6 - 0.8);
  if (hash(x, 3, z) > 0.94 && rho < 0.8) depth += 2 + Math.floor(hash(z, 5, x) * 4);   // stalactites
  depth = Math.max(1, Math.min(G - 1, depth));
  const by = G - depth;
  // pente forte -> roche apparente
  let drop = 0;
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (onIsland(x + ax, z + az)) drop = Math.max(drop, h - hAt(x + ax, z + az));
  const rocky = h > 0 && drop >= 2;
  for (let y = by; y <= top; y++) {
    const dd = top - y;
    let b;
    if (dd === 0) b = rocky ? pick(['stone', 'andesite', 'stone', 'mossy_cobblestone', 'tuff'], x, y, z) : (rho > 0.95 && hash(x, y, z) > 0.55 ? 'coarse_dirt' : 'grass_block');
    else if (dd <= (rocky ? 0 : 2) && y > G - 3) b = 'dirt';
    else {
      const r = hash(x, y, z);
      b = r < 0.45 ? 'stone' : r < 0.63 ? 'andesite' : r < 0.78 ? 'tuff' : r < 0.86 ? 'cobblestone' : r < 0.93 ? 'diorite' : 'gravel';
      if (y === by && r > 0.5) b = 'mossy_cobblestone';
      if (b === 'gravel' && y === by) b = 'stone';
      if (y < G - 6 && r > 0.985) b = pick(['coal_ore', 'iron_ore', 'copper_ore'], x, y, z);
    }
    set(x, y, z, b, b === 'grass_block' ? { snowy: 'false' } : {});
  }
}
const surf = (x, z, b, p = {}) => { if (onIsland(x, z)) set(x, surfY(x, z), z, b, p); };

// ---------------------------------------------------------------- lac + cascade
for (const k of rhoMap.keys()) {
  const [x, z] = k.split(',').map(Number);
  const e = LAKE(x, z);
  if (e === null) continue;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !onIsland(x + a, z + b))) console.warn('lac au bord de l\'île', x, z);
  set(x, G, z, 'water', { level: '0' });
  if (e < 0.55) { set(x, G - 1, z, 'water', { level: '0' }); set(x, G - 2, z, hash(x, 2, z) > 0.5 ? 'sand' : 'clay'); if (e < 0.2) { set(x, G - 2, z, 'water', { level: '0' }); set(x, G - 3, z, 'gravel'); } }
  else set(x, G - 1, z, hash(x, 2, z) > 0.4 ? 'sand' : 'clay');
}
// berges : sable / pierres, canne à sucre
for (let x = 13; x <= 31; x++) for (let z = 38; z <= 55; z++) {
  if (!is(x, G, z, /grass_block|coarse_dirt/) || hAt(x, z) !== 0) continue;
  const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => is(x + a, G, z + b, /water/));
  if (!near) continue;
  const r = hash(x, 4, z);
  set(x, G, z, r < 0.45 ? 'sand' : r < 0.7 ? 'grass_block' : pick(['mossy_cobblestone', 'andesite', 'stone'], x, 5, z), r >= 0.45 && r < 0.7 ? { snowy: 'false' } : {});
  if (r < 0.3) for (let i = 1; i <= 2 + Math.floor(hash(x, 6, z) * 2); i++) set(x, G + i, z, 'sugar_cane', { age: '0' });
}
for (const [x, z] of [[20, 47], [24, 50], [18, 49], [25, 46], [21, 51]]) if (is(x, G, z, /water/)) set(x, G + 1, z, 'lily_pad');
// source sur le plateau -> chute dans l'anse
{
  const top = G + HH;
  for (const z of [37, 38]) set(20, top, z, 'water', { level: '0' });
  for (const [x, z] of [[19, 37], [21, 37], [19, 38], [21, 38], [20, 36], [19, 36], [21, 36]]) set(x, top, z, pick(['mossy_cobblestone', 'mossy_stone_bricks', 'stone'], x, 9, z));
  for (const [x, z] of [[19, 36], [21, 36]]) set(x, top + 1, z, 'mossy_cobblestone_slab', slab('bottom'));
  set(20, top + 1, 36, 'mossy_cobblestone_wall', {});
  set(20, top + 2, 36, 'lantern', lantern(false));
  set(20, top, 39, 'water', { level: '1' });
  for (let y = G + 1; y < top; y++) set(20, y, 39, 'water', { level: '8' });
  // rochers dans l'anse
  set(22, G + 1, 41, 'mossy_cobblestone'); set(22, G + 2, 41, 'moss_carpet'); set(19, G + 1, 43, 'mossy_cobblestone_slab', slab('bottom'));
}
// ponton de pêche (rive est, vers l'ouest)
for (let x = 24; x <= 29; x++) for (const z of [48, 49]) if (is(x, G, z, /water|sand|grass|clay|stone|cobble|andesite/)) { set(x, G, z, 'spruce_planks'); clear(x, G + 1, z, x, G + 3, z); }
set(24, G + 1, 49, 'spruce_fence', {}); set(24, G + 2, 49, 'lantern', lantern(false));
set(24, G + 1, 48, 'pixelmon:spruce_bench', { facing: 'west' });
set(28, G + 1, 49, 'barrel', { facing: 'up', open: 'false' });

// ---------------------------------------------------------------- sentier en escalier (colline)
for (let x = 22; x <= 29; x++) {
  const ht = pathH(x);
  for (const z of PATH_Z) {
    clear(x, G + ht + 1, z, x, G + HH + 3, z);
    for (let y = G - 2; y < G + ht; y++) set(x, y, z, 'stone_bricks');
    if (ht > 0 && x > 22) set(x, G + ht, z, 'stone_brick_stairs', stairs('west'));
    else set(x, G + ht, z, x === 22 ? 'polished_andesite' : 'dirt_path');
  }
  for (const z of [34, 38]) {
    if (!onIsland(x, z) || ht === 0) continue;
    const s = surfY(x, z);
    if (s < G + ht) { for (let y = s + 1; y <= G + ht; y++) set(x, y, z, 'stone_bricks'); }
    if (surfY(x, z) <= G + ht) set(x, G + ht + 1, z, 'stone_brick_wall', {});
  }
}
set(29, G + 1, 34, 'spruce_fence', {}); set(29, G + 2, 34, 'spruce_fence', {}); set(29, G + 3, 34, 'lantern', lantern(false));
set(29, G + 1, 38, 'spruce_fence', {}); set(29, G + 2, 38, 'spruce_fence', {}); set(29, G + 3, 38, 'lantern', lantern(false));

// ---------------------------------------------------------------- place centrale + fontaine Poké Ball
const PR = 7;
for (let x = CX - PR; x <= CX + PR; x++) for (let z = CZ - PR; z <= CZ + PR; z++) {
  const d = Math.hypot(x - CX, z - CZ);
  if (d > PR + 0.4) continue;
  let b;
  if (d > PR - 0.6) b = 'stone_bricks';
  else if (d > 4.5) b = (Math.floor(Math.atan2(z - CZ, x - CX) / (Math.PI / 8)) & 1) ? 'polished_andesite' : 'smooth_stone';
  else b = 'stone_bricks';
  set(x, G, z, b);
  if (d > 3.5 && d <= 4.5) set(x, G + 1, z, 'stone_bricks');              // margelle
  else if (d <= 3.5 && d > 0.5) { set(x, G + 1, z, 'water', { level: '0' }); if (d <= 2.5) { set(x, G, z, 'water', { level: '0' }); set(x, G - 1, z, 'stone_bricks'); } }
}
for (const [x, z] of [[CX, CZ - 4], [CX, CZ + 4], [CX - 4, CZ], [CX + 4, CZ]]) set(x, G + 1, z, 'chiseled_stone_bricks');
set(CX, G, CZ, 'stone_bricks'); set(CX, G + 1, CZ, 'chiseled_stone_bricks');
for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
  const corner = dx && dz, edge = !corner && (dx || dz);
  if (!corner) set(CX + dx, G + 2, CZ + dz, 'white_concrete');
  set(CX + dx, G + 3, CZ + dz, corner || (!dx && !dz) ? 'black_concrete' : 'quartz_block');
  if (!corner) set(CX + dx, G + 4, CZ + dz, 'red_concrete');
}
// bancs autour de la fontaine
for (const [x, z, f] of [[38, 34, 'south'], [42, 34, 'south'], [38, 46, 'north'], [42, 46, 'north'], [34, 42, 'east'], [46, 38, 'west'], [46, 42, 'west'], [34, 38, 'east']])
  set(x, G + 1, z, 'pixelmon:spruce_bench', { facing: f });
// lampadaires
function lampPost(x, z, mat = 'spruce_fence', y0 = null) {
  const y = y0 ?? surfY(x, z);
  for (let i = 1; i <= 3; i++) set(x, y + i, z, mat, {});
  set(x, y + 4, z, mat, {});
  set(x, y + 5, z, 'lantern', lantern(false));
  for (const [ax, az] of [[0, -1], [0, 1]]) set(x + ax, y + 4, z + az, 'pixelmon:street_light', { facing: 'down' });
}
for (const [x, z] of [[35, 35], [45, 35], [45, 45], [35, 45]]) lampPost(x, z);
// pots de fleurs
for (const [x, z] of [[37, 34], [43, 34], [43, 46], [37, 46]]) { set(x, G + 1, z, 'handcrafted:terracotta_wide_pot'); }

// ---------------------------------------------------------------- routes (chemins de terre)
function road(x1, z1, x2, z2) {
  for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) {
    if (!onIsland(x, z) || hAt(x, z) !== 0 || !is(x, G, z, /grass_block|coarse_dirt|dirt$/)) continue;
    const r = hash(x, 60, z);
    set(x, G, z, r < 0.78 ? 'dirt_path' : r < 0.9 ? 'coarse_dirt' : 'gravel');
  }
}
road(39, 26, 41, 33);   // nord : Centre Pokémon
road(47, 39, 53, 41);   // est : ferme
road(39, 47, 41, 55);   // sud : arène
road(29, 35, 33, 37);   // ouest : colline
road(47, 22, 56, 24);   // vers le moulin
road(50, 25, 52, 38);
// pas japonais vers le portail (sud-est) et le camp (sud-ouest)
for (const [x, z] of [[46, 47], [48, 49], [49, 51], [51, 52], [52, 54]]) { surf(x, z, 'polished_andesite'); }
for (const [x, z] of [[34, 47], [32, 49], [31, 52], [29, 54], [27, 56]]) { surf(x, z, 'polished_andesite'); }

// ---------------------------------------------------------------- toits
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
    if (bz - az <= 1 || bx - ax <= 1) {
      for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) set(x, y + 1, z, cap + '_slab', slab('bottom'));
      break;
    }
  }
}
// toit à deux pans (faîtage le long de x) ; renvoie la hauteur du pignon par z
function gableRoof(x1, z1, x2, z2, y0, mat, cap) {
  const n = z2 - z1 + 1;
  for (let k = 0; k < Math.ceil(n / 2); k++) {
    const zn = z1 + k, zs = z2 - k, y = y0 + k;
    for (let x = x1; x <= x2; x++) {
      if (zn === zs) { set(x, y, zn, cap + '_slab', slab('bottom')); continue; }
      set(x, y, zn, mat + '_stairs', stairs('south'));
      set(x, y, zs, mat + '_stairs', stairs('north'));
      if (zs - zn === 1) set(x, y + 1, zn, cap + '_slab', slab('bottom')), set(x, y + 1, zs, cap + '_slab', slab('bottom'));
    }
  }
}
function chimney(x, z, yFrom, y2, mat, collar) {
  let roofY = y2; while (roofY > yFrom && !get(x, roofY, z)) roofY--;
  set(x, roofY, z, collar);
  for (let y = roofY + 1; y <= y2; y++) set(x, y, z, 'sootychimneys:' + mat, { stacked: y < y2 ? 'true' : 'false' });
}

// ---------------------------------------------------------------- Centre Pokémon (nord) : 2 étages
const X1 = 32, X2 = 48, Z1 = 13, Z2 = 24;
const F1 = G + 1, F2 = G + 6, R = G + 11;
const DOOR = 40;
{
  fill(X1 - 1, G, Z1 - 1, X2 + 1, G, Z2 + 1, 'stone_bricks');
  for (let y = G - 3; y < G; y++) fill(X1, y, Z1, X2, y, Z2, 'stone');          // assise
  fill(X1, F1, Z1, X2, F1, Z2, 'spruce_planks');
  fill(X1, F2, Z1, X2, F2, Z2, 'spruce_planks');
  fill(39, F1, Z1 + 1, X2 - 1, F1, Z2 - 1, 'pixelmon:wooden_flooring');      // hall + accueil
  const pX = [X1, 36, 44, X2], pZ = [Z1, 18, Z2];
  const wallAt = (x, y, z, pillar, along) => {
    const horiz = along === 'x' ? logX : logZ;
    if (y === F1) return set(x, y, z, 'stone_bricks');
    if (y === F2 || y === R - 1) return set(x, y, z, 'stripped_spruce_log', horiz);
    if (pillar) return set(x, y, z, 'stripped_spruce_log', logY);
    if (y < F2) return set(x, y, z, stoneMix(x, y, z));
    set(x, y, z, 'white_concrete');
  };
  for (let y = F1; y <= R - 1; y++) {
    for (let x = X1; x <= X2; x++) for (const z of [Z1, Z2]) wallAt(x, y, z, pX.includes(x) || ((x === DOOR - 1 || x === DOOR + 1) && z === Z2 && y < F2), 'x');
    for (let z = Z1 + 1; z < Z2; z++) for (const x of [X1, X2]) wallAt(x, y, z, pZ.includes(z), 'z');
  }
  // fenêtres
  const win = (x, z, y) => { for (const yy of [y, y + 1]) set(x, yy, z, 'glass_pane', {}); };
  for (const x of [33, 34, 35, 45, 46, 47]) { win(x, Z2, F1 + 2); win(x, Z2, F2 + 2); win(x, Z1, F2 + 2); }
  for (const x of [39, 40, 41]) { win(x, Z1, F1 + 2); win(x, Z2, F2 + 2); }
  for (const z of [15, 16, 20, 21, 22]) { win(X1, z, F1 + 2); win(X1, z, F2 + 2); win(X2, z, F2 + 2); }
  for (const z of [15, 16]) win(X2, z, F1 + 2);
  // porte
  set(DOOR, F1 + 1, Z2, 'spruce_door', { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' });
  set(DOOR, F1 + 2, Z2, 'spruce_door', { facing: 'north', half: 'upper', hinge: 'left', open: 'false', powered: 'false' });
  set(DOOR, F1, Z2, 'spruce_planks');
  // porche
  fill(37, G, Z2 + 1, 43, G, Z2 + 2, 'stone_bricks');
  fill(37, F1, Z2 + 1, 43, F1, Z2 + 2, 'spruce_planks');
  for (let x = 38; x <= 42; x++) set(x, G + 1, Z2 + 3, 'stone_brick_stairs', stairs('north'));
  for (const x of [37, 43]) { for (let y = F1 + 1; y <= F1 + 3; y++) set(x, y, Z2 + 2, 'stripped_spruce_log', logY); set(x, G + 1, Z2 + 3, 'stone_brick_wall', {}); }
  fill(36, F1 + 4, Z2 + 1, 44, F1 + 4, Z2 + 3, BLUE + '_slab', slab('bottom'));
  for (const x of [36, 44]) set(x, F1 + 4, Z2 + 3, BLUE + '_slab', slab('bottom'));
  set(38, F1 + 3, Z2 + 2, 'lantern', lantern(true)); set(42, F1 + 3, Z2 + 2, 'lantern', lantern(true));
  for (const x of [38, 42]) set(x, F1 + 1, Z2 + 1, 'handcrafted:blue_glazed_thick_pot');
  // toit
  gableRoof(X1 - 1, Z1 - 1, X2 + 1, Z2 + 1, R, BLUE, BLUE);
  // pignons est/ouest
  for (const x of [X1, X2]) for (let k = 0; ; k++) {
    const zn = Z1 - 1 + k + 1, zs = Z2 + 1 - k - 1, y = R + k;
    if (zn > zs) break;
    for (let z = zn; z <= zs; z++) set(x, y, z, k === 0 ? 'stripped_spruce_log' : 'white_concrete', k === 0 ? logZ : {});
    set(x, y, 18, 'stripped_spruce_log', logY); set(x, y, 19, 'stripped_spruce_log', logY);
  }
  for (const x of [X1, X2]) { set(x, R + 2, 16, 'glass_pane', {}); set(x, R + 2, 21, 'glass_pane', {}); set(x, R + 3, 16, 'glass_pane', {}); set(x, R + 3, 21, 'glass_pane', {}); }
  // lucarne centrale (façade sud) avec le panneau « Pokémon Center »
  {
    const dz1 = Z2 - 1, dz2 = Z2 + 2, dx1 = 37, dx2 = 43, y0 = R;
    for (let y = y0; y <= y0 + 2; y++) for (let x = dx1 + 1; x < dx2; x++) for (let z = dz1; z <= Z2 + 1; z++) del(x, y, z);
    for (let y = y0 - 1; y <= y0 + 2; y++) for (const x of [dx1 + 1, dx2 - 1]) set(x, y, Z2, 'stripped_spruce_log', logY);
    for (let y = y0; y <= y0 + 2; y++) for (let x = dx1 + 2; x <= dx2 - 2; x++) set(x, y, Z2, y === y0 + 2 ? 'red_concrete' : 'glass_pane', {});
    for (let y = y0; y <= y0 + 2; y++) for (const x of [dx1 + 1, dx2 - 1]) for (let z = dz1; z < Z2; z++) set(x, y, z, 'white_concrete');
    for (let k = 0; k <= 3; k++) {
      const y = y0 + 2 + k, xa = dx1 + k, xb = dx2 - k;
      if (xa > xb) break;
      for (let z = dz1 - 1; z <= dz2; z++) {
        if (xa === xb) { set(xa, y, z, BLUE + '_slab', slab('bottom')); continue; }
        set(xa, y, z, BLUE + '_stairs', stairs('east')); set(xb, y, z, BLUE + '_stairs', stairs('west'));
      }
      if (k > 0) for (let x = xa + 1; x < xb; x++) set(x, y, Z2, 'white_concrete');
    }
  }
  // ----- rez-de-chaussée
  // escalier vers l'étage (x=38, montée vers le nord)
  for (let i = 0; i <= 4; i++) {
    const z = 22 - i, y = F1 + 1 + i;
    set(38, y, z, 'spruce_stairs', stairs('north'));
    for (let yy = F1 + 1; yy < y; yy++) set(38, yy, z, 'spruce_planks');
  }
  for (let z = 19; z <= 22; z++) del(38, F2, z);
  for (let z = 19; z <= 22; z++) { set(37, F2 + 1, z, 'spruce_fence', {}); set(39, F2 + 1, z, 'spruce_fence', {}); }
  set(38, F2 + 1, 23, 'spruce_fence', {});
  // accueil Pokémon (est)
  for (let x = 43; x <= 46; x++) set(x, F1 + 1, 17, 'handcrafted:spruce_counter', { counter: 'quartz_block', facing: 'south', type: x === 44 ? '2' : '1' });
  set(45, F1 + 1, 16, 'pixelmon:blue_healer', { facing: 'south' }, { id: 'pixelmon:healer' });
  set(44, F1 + 2, 17, 'another_furniture:service_bell');
  set(46, F1 + 2, 17, 'pixelmon:mug_pika', { facing: 'south' });
  for (let x = 43; x <= 46; x++) set(x, F1 + 1, 14, 'handcrafted:spruce_shelf', { facing: 'south', shape: x === 43 ? 'left' : x === 46 ? 'right' : 'middle', type: String(1 + (x % 5)) });
  set(43, F1 + 2, 14, 'handcrafted:blue_glazed_thick_pot'); set(46, F1 + 2, 14, 'handcrafted:white_glazed_wide_pot');
  set(44, F1 + 2, 14, 'pokeblocks:pokedoll_eevee', { facing: 'south' }); set(45, F1 + 2, 14, 'pokeblocks:pokedoll_squirtle', { facing: 'south' });
  set(45, F1 + 3, 14, 'pixelmon:blue_clock', { facing: 'south' });
  set(47, F1 + 1, 15, 'pixelmon:incense_burner');
  set(47, F1 + 1, 19, 'pixelmon:blue_pc', { facing: 'west', multipos: 'base' }, { id: 'pixelmon:pc' });
  set(47, F1 + 2, 19, 'pixelmon:blue_pc', { facing: 'west', multipos: 'top' });
  set(47, F1 + 1, 21, 'pixelmon:blue_vending_machine', { facing: 'west', multipos: 'base' }, { id: 'pixelmon:vending_machine' });
  set(47, F1 + 2, 21, 'pixelmon:blue_vending_machine', { facing: 'west', multipos: 'top' });
  set(47, F1 + 1, 23, 'pixelmon:trash_can');
  // salle d'attente
  set(43, F1 + 1, 20, 'pixelmon:blue_armchair', { facing: 'east' });
  set(43, F1 + 1, 22, 'pixelmon:blue_armchair', { facing: 'east' });
  set(43, F1 + 1, 21, 'handcrafted:spruce_side_table', { color: 'blue', facing: 'east', ...WL });
  set(43, F1 + 2, 21, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  for (let z = 18; z <= 23; z++) set(40, F1 + 1, z, z === 18 ? 'white_carpet' : 'light_blue_carpet');
  // cuisine / salle à manger (ouest)
  set(33, F1 + 1, 14, 'furnace', { facing: 'south', lit: 'false' });
  set(34, F1 + 1, 14, 'handcrafted:oven', { facing: 'south', lit: 'false' });
  set(35, F1 + 1, 14, 'handcrafted:spruce_counter', { counter: 'smooth_stone', facing: 'south', type: '1' });
  set(36, F1 + 1, 14, 'crafting_table');
  set(37, F1 + 1, 14, 'smoker', { facing: 'south', lit: 'false' });
  set(34, F1 + 3, 14, 'handcrafted:kitchen_hood', { facing: 'south' });
  set(34, F1 + 4, 14, 'handcrafted:kitchen_hood_pipe', { corner: 'false', facing: 'south' });
  for (const x of [33, 35, 36]) set(x, F1 + 3, 14, 'handcrafted:spruce_cupboard', { facing: 'south', type: '2' });
  set(35, F1 + 2, 14, 'handcrafted:wood_crockery_combo', { facing: 'south', ...WL });
  set(33, F1 + 1, 17, 'barrel', { facing: 'east', open: 'false' });
  set(33, F1 + 2, 17, 'handcrafted:berry_jam_jar', { facing: 'east', jars: '3' });
  for (const z of [19, 20]) set(35, F1 + 1, z, 'handcrafted:spruce_table', { color: 'blue', shape: 'single', ...WL });
  for (const [x, z, f] of [[34, 19, 'east'], [34, 20, 'east'], [36, 19, 'west'], [36, 20, 'west'], [35, 18, 'south'], [35, 21, 'north']])
    set(x, F1 + 1, z, 'handcrafted:spruce_chair', { color: 'blue', facing: f, ...WL });
  set(35, F1 + 2, 19, 'handcrafted:white_crockery_combo', { facing: 'north', ...WL });
  set(35, F1 + 2, 20, 'handcrafted:white_bowl', { facing: 'north', pieces: '2', ...WL });
  set(33, F1 + 1, 23, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  set(37, F1 + 1, 23, 'handcrafted:white_glazed_thick_pot');
  set(33, F1 + 1, 22, 'another_furniture:spruce_drawer', { facing: 'east', open: 'false' });
  // éclairage du rez-de-chaussée (sous le plancher de l'étage)
  for (const [x, z] of [[35, 17], [41, 16], [45, 20], [41, 21]]) set(x, F2 - 1, z, 'lantern', lantern(true));
  // ----- étage
  // chambre (ouest)
  for (const [z, c] of [[15, 'blue'], [17, 'white']]) {
    set(33, F2 + 1, z, 'handcrafted:spruce_fancy_bed', { color: c, facing: 'west', occupied: 'false', part: 'head', shape: 'single' });
    set(34, F2 + 1, z, 'handcrafted:spruce_fancy_bed', { color: c, facing: 'west', occupied: 'false', part: 'foot', shape: 'single' });
  }
  set(33, F2 + 1, 16, 'handcrafted:spruce_nightstand', { color: 'none', facing: 'east', ...WL });
  set(33, F2 + 2, 16, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  set(33, F2 + 1, 14, 'pokeblocks:pokedoll_bulbasaur', { facing: 'east' });
  set(36, F2 + 1, 14, 'handcrafted:spruce_desk', { color: 'none', facing: 'south', ...WL });
  set(36, F2 + 2, 14, 'handcrafted:stackable_book', { books: '3', facing: 'south', seed: '21' });
  set(36, F2 + 1, 15, 'handcrafted:spruce_chair', { color: 'blue', facing: 'north', ...WL });
  set(33, F2 + 1, 21, 'another_furniture:spruce_drawer', { facing: 'east', open: 'false' });
  set(33, F2 + 1, 22, 'another_furniture:spruce_drawer', { facing: 'east', open: 'false' });
  set(33, F2 + 2, 22, 'handcrafted:white_glazed_thick_pot');
  set(33, F2 + 1, 23, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  for (let x = 34; x <= 36; x++) for (let z = 19; z <= 21; z++) set(x, F2 + 1, z, (x === 35 && z === 20) ? 'white_carpet' : 'blue_carpet');
  // palier
  for (let x = 39; x <= 41; x++) for (const y of [F2 + 1, F2 + 2]) set(x, y, 14, 'bookshelf');
  set(42, F2 + 1, 14, 'handcrafted:terracotta_thick_pot');
  // salon / réserve (est)
  set(44, F2 + 1, 19, 'pixelmon:blue_armchair', { facing: 'east' });
  set(44, F2 + 1, 21, 'pixelmon:blue_armchair', { facing: 'east' });
  set(47, F2 + 1, 20, 'pixelmon:tv', { facing: 'west', on: 'false' });
  set(45, F2 + 1, 20, 'handcrafted:spruce_side_table', { color: 'blue', facing: 'east', ...WL });
  set(45, F2 + 2, 20, 'handcrafted:wood_cup', { facing: 'north', pieces: '2', ...WL });
  for (let x = 43; x <= 46; x++) set(x, F2 + 1, 23, 'handcrafted:spruce_shelf', { facing: 'north', shape: x === 43 ? 'left' : x === 46 ? 'right' : 'middle', type: String(1 + (x % 5)) });
  [['charmander', 43], ['mimikyu', 44], ['jigglypuff', 45], ['munchlax', 46]].forEach(([n, x]) => set(x, F2 + 2, 23, 'pokeblocks:pokedoll_' + n, { facing: 'north' }));
  set(47, F2 + 1, 23, 'pokeblocks:pokedoll_snorlax', { facing: 'west' });
  set(43, F2 + 1, 15, 'pokeblocks:magikarp_fishbowl');
  set(44, F2 + 1, 15, 'handcrafted:spruce_desk', { color: 'none', facing: 'south', ...WL });
  set(44, F2 + 2, 15, 'handcrafted:stackable_book', { books: '4', facing: 'south', seed: '64' });
  set(43, F2 + 1, 17, 'another_furniture:white_lamp', { facing: 'up', base: 'true', lit: 'true' });
  // lanternes suspendues sous le faîtage
  for (const x of [35, 40, 45]) { for (let y = F2 + 4; y <= R + 5; y++) set(x, y, 18, 'chain', { axis: 'y', ...WL }); set(x, F2 + 3, 18, 'lantern', lantern(true)); }
  // cheminée de la cuisine
  chimney(34, 14, R, R + 7, 'stone_brick_chimney', 'stone_bricks');
  // jardinières et volets
  for (const x of [33, 34, 35, 45, 46, 47])
    set(x, F1 + 1, Z2 + 1, 'another_furniture:spruce_flower_box', { facing: 'south', attached: 'true', horizontal: x === 33 || x === 45 ? 'left' : x === 35 || x === 47 ? 'right' : 'middle' });
  for (const x of [39, 40, 41])
    set(x, F1 + 1, Z1 - 1, 'another_furniture:spruce_flower_box', { facing: 'north', attached: 'true', horizontal: x === 41 ? 'left' : x === 39 ? 'right' : 'middle' });
  for (const [x, z, f] of [[X1 - 1, 17, 'west'], [X1 - 1, 19, 'west'], [X1 - 1, 14, 'west'], [X1 - 1, 23, 'west'], [X2 + 1, 17, 'east'], [X2 + 1, 19, 'east'], [X2 + 1, 14, 'east'], [X2 + 1, 23, 'east']]) {
    set(x, F2 + 2, z, 'another_furniture:spruce_shutter', { variant: '2', vertical: 'bottom', facing: f, open: 'false', hinge: 'left' });
    set(x, F2 + 3, z, 'another_furniture:spruce_shutter', { variant: '2', vertical: 'top', facing: f, open: 'false', hinge: 'left' });
  }
  // façade nord : bûches + tonneaux
  set(34, G + 1, Z1 - 2, 'barrel', { facing: 'up', open: 'false' }); set(35, G + 1, Z1 - 2, 'barrel', { facing: 'up', open: 'false' });
  set(45, G + 1, Z1 - 2, 'stripped_spruce_log', logX); set(46, G + 1, Z1 - 2, 'stripped_spruce_log', logX); set(45, G + 2, Z1 - 2, 'stripped_spruce_log', logX);
}

// ---------------------------------------------------------------- moulin (nord-est)
const MX = 59, MZ = 24;
{
  const inOct = (dx, dz) => Math.abs(dx) <= 3 && Math.abs(dz) <= 3 && Math.abs(dx) + Math.abs(dz) <= 4;
  const top = G + 12;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    if (!inOct(dx, dz)) continue;
    const x = MX + dx, z = MZ + dz;
    const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !inOct(dx + a, dz + b));
    for (let y = G - 2; y <= G; y++) set(x, y, z, 'stone_bricks');
    if (!wall) { set(x, G + 7, z, 'spruce_planks'); continue; }
    for (let y = G + 1; y <= top; y++) {
      const b = y <= G + 6 ? stoneMix(x, y, z) : y === G + 7 ? 'stripped_spruce_log' : 'spruce_planks';
      set(x, y, z, b, y === G + 7 ? (dz === -3 || dz === 3 ? logX : logZ) : {});
    }
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (inOct(dx, dz) && !(Math.abs(dx) + Math.abs(dz) === 4)) set(MX + dx, G, MZ + dz, 'spruce_planks');
  // porte sud, fenêtres, échelle
  set(MX, G + 1, MZ + 3, 'spruce_door', { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' });
  set(MX, G + 2, MZ + 3, 'spruce_door', { facing: 'north', half: 'upper', hinge: 'left', open: 'false', powered: 'false' });
  for (const [x, z] of [[MX - 3, MZ], [MX + 3, MZ], [MX, MZ - 3]]) { set(x, G + 4, z, 'glass_pane', {}); set(x, G + 9, z, 'glass_pane', {}); }
  for (let y = G + 1; y <= G + 7; y++) set(MX, y, MZ - 2, 'ladder', { facing: 'south', ...WL });
  set(MX + 2, G + 1, MZ - 1, 'grindstone', { face: 'floor', facing: 'west' });
  set(MX - 2, G + 1, MZ - 1, 'barrel', { facing: 'up', open: 'false' }); set(MX - 2, G + 1, MZ + 1, 'composter', { level: '0' });
  set(MX + 2, G + 1, MZ + 1, 'hay_block', logY);
  set(MX, G + 6, MZ, 'lantern', lantern(true)); set(MX + 1, G + 8, MZ, 'lantern', lantern(false));
  set(MX + 1, G + 8, MZ + 1, 'hay_block', logY); set(MX - 1, G + 8, MZ - 1, 'barrel', { facing: 'up', open: 'false' });
  // toit en pyramide
  hipRoof(MX - 4, MZ - 4, MX + 4, MZ + 4, top + 1, BLUE, 'spruce');
  set(MX, top + 6, MZ, 'lightning_rod', { facing: 'up', powered: 'false', ...WL });
  // ailes (plan z = MZ+5, devant l'avant-toit), moyeu à y = G+10
  const hy = G + 10, sz = MZ + 5;
  set(MX, hy, sz, 'stripped_spruce_log', logZ); set(MX, hy, sz - 1, 'stripped_spruce_log', logZ); set(MX, hy, sz - 2, 'stripped_spruce_log', logZ);
  for (let i = 1; i <= 7; i++) {
    set(MX, hy + i, sz, 'stripped_spruce_log', logY); if (i >= 2) set(MX + 1, hy + i, sz, 'white_wool');
    set(MX, hy - i, sz, 'stripped_spruce_log', logY); if (i >= 2) set(MX - 1, hy - i, sz, 'white_wool');
    set(MX + i, hy, sz, 'stripped_spruce_log', logX); if (i >= 2) set(MX + i, hy - 1, sz, 'white_wool');
    set(MX - i, hy, sz, 'stripped_spruce_log', logX); if (i >= 2) set(MX - i, hy + 1, sz, 'white_wool');
  }
  // abords
  for (const [x, z] of [[MX + 4, MZ + 2], [MX + 4, MZ + 3], [MX - 4, MZ + 3]]) if (onIsland(x, z)) set(x, G + 1, z, 'hay_block', logY);
  set(MX + 4, G + 2, MZ + 3, 'hay_block', logY);
  set(MX - 4, G + 1, MZ - 2, 'beehive', { facing: 'south', honey_level: '0' });
  lampPost(MX - 4, MZ + 6);
}

// ---------------------------------------------------------------- ferme (est)
const FA = { x1: 54, x2: 65, z1: 32, z2: 50 }, FPATH = 40;
{
  const crops = { n: [['wheat', 54, 56], ['carrots', 58, 61], ['potatoes', 63, 65]], s: [['beetroots', 54, 56], ['wheat', 58, 61], ['carrots', 63, 65]] };
  for (let x = FA.x1; x <= FA.x2; x++) for (let z = FA.z1; z <= FA.z2; z++) {
    if (!onIsland(x, z)) { console.warn('ferme hors île', x, z); continue; }
    if (z === FPATH) { set(x, G, z, 'dirt_path'); continue; }
    if (x === 57 || x === 62) { set(x, G, z, 'water', { level: '0' }); set(x, G - 1, z, 'dirt'); continue; }
    set(x, G, z, 'farmland', { moisture: '7' });
    const row = (z < FPATH ? crops.n : crops.s).find(([, a, b]) => x >= a && x <= b);
    if (!row) continue;
    const max = row[0] === 'beetroots' ? 2 : 5;
    set(x, G + 1, z, row[0], { age: String(Math.floor(hash(x, 70, z) * (max + 1))) });
  }
  for (const x of [57, 62]) { set(x, G, FPATH, 'spruce_slab', slab('top')); set(x, G - 1, FPATH, 'water', { level: '0' }); set(x, G - 2, FPATH, 'dirt'); }
  // clôture
  for (let x = FA.x1 - 1; x <= FA.x2 + 1; x++) for (let z = FA.z1 - 1; z <= FA.z2 + 1; z++) {
    if (x !== FA.x1 - 1 && x !== FA.x2 + 1 && z !== FA.z1 - 1 && z !== FA.z2 + 1) continue;
    if (!onIsland(x, z)) { console.warn('clôture hors île', x, z); continue; }
    if (x === FA.x1 - 1 && z === FPATH) { set(x, G + 1, z, 'oak_fence_gate', { facing: 'east', in_wall: 'false', open: 'false', powered: 'false' }); set(x, G, z, 'dirt_path'); continue; }
    set(x, G + 1, z, 'oak_fence', {});
    if ((x - FA.x1 + 1) % 6 === 0 && (z === FA.z1 - 1 || z === FA.z2 + 1) || (z - FA.z1 + 1) % 6 === 0 && (x === FA.x1 - 1 || x === FA.x2 + 1)) set(x, G + 2, z, 'lantern', lantern(false));
  }
  for (const [x, z] of [[FA.x1 - 1, FA.z1 - 1], [FA.x2 + 1, FA.z1 - 1], [FA.x1 - 1, FA.z2 + 1], [FA.x2 + 1, FA.z2 + 1]]) set(x, G + 2, z, 'lantern', lantern(false));
  // épouvantail
  {
    const x = 59, z = 36;
    set(x, G + 1, z, 'oak_fence', {}); set(x, G + 2, z, 'hay_block', logY); set(x, G + 3, z, 'carved_pumpkin', { facing: 'west' });
    set(x - 1, G + 2, z, 'oak_fence', {}); set(x + 1, G + 2, z, 'oak_fence', {});
  }
  // poteaux-lanternes dans les rigoles (l'irrigation reste à portée)
  for (const x of [57, 62]) for (const z of [36, 45]) { set(x, G, z, 'mossy_cobblestone'); set(x, G + 1, z, 'oak_fence', {}); set(x, G + 2, z, 'lantern', lantern(false)); }
  // remise
  set(FA.x1 - 2, G + 1, FPATH + 3, 'composter', { level: '0' });
  set(FA.x1 - 2, G + 1, FPATH + 4, 'barrel', { facing: 'up', open: 'false' });
  set(FA.x1 - 2, G + 1, FPATH + 5, 'hay_block', logY);
}

// ---------------------------------------------------------------- arène de combat (sud)
const AR = { x1: 33, x2: 47, z1: 56, z2: 64 };
{
  const acx = 40, acz = 60;
  for (let x = AR.x1; x <= AR.x2; x++) for (let z = AR.z1; z <= AR.z2; z++) {
    if (!onIsland(x, z)) { console.warn('arène hors île', x, z); continue; }
    const d = Math.hypot(x - acx, z - acz);
    const line = x === AR.x1 || x === AR.x2 || z === AR.z1 || z === AR.z2 || x === acx || (d >= 2.5 && d < 3.4);
    let b = line ? 'white_concrete' : 'grass_block';
    if (d < 1.6) b = z < acz ? 'red_concrete' : z > acz ? 'white_concrete' : 'black_concrete';
    if (x === acx && z === acz) b = 'quartz_block';
    // zones des dresseurs
    if ((x === 35 || x === 45) && z >= 59 && z <= 61) b = 'white_concrete';
    set(x, G, z, b, b === 'grass_block' ? { snowy: 'false' } : {});
  }
  // gradins nord (z=55/54) et sud (z=65/66)
  for (let x = AR.x1 - 1; x <= AR.x2 + 1; x++) {
    if (x >= 39 && x <= 41) continue; // entrée
    set(x, G + 1, 55, 'spruce_stairs', stairs('north'));
    set(x, G + 1, 54, 'stone_bricks'); set(x, G + 2, 54, 'spruce_stairs', stairs('north'));
    set(x, G + 1, 65, 'spruce_stairs', stairs('south'));
    set(x, G + 1, 66, 'stone_bricks'); set(x, G + 2, 66, 'spruce_stairs', stairs('south'));
    set(x, G + 1, 67, 'stone_bricks'); set(x, G + 2, 67, 'stone_bricks'); set(x, G + 3, 67, 'stone_brick_wall', {});
    for (const z of [54, 55, 65, 66, 67]) for (let y = G - 2; y <= G; y++) if (onIsland(x, z)) set(x, y, z, y === G ? 'stone_bricks' : 'stone');
  }
  for (const x of [AR.x1 - 1, AR.x2 + 1]) { set(x, G + 1, 55, 'stone_bricks'); set(x, G + 2, 55, 'stone_brick_wall', {}); set(x, G + 1, 65, 'stone_bricks'); set(x, G + 2, 65, 'stone_brick_wall', {}); set(x, G + 3, 54, 'stone_brick_wall', {}); set(x, G + 3, 66, 'stone_brick_wall', {}); }
  for (const x of [38, 42]) { set(x, G + 3, 54, 'stone_brick_wall', {}); set(x, G + 4, 54, 'lantern', lantern(false)); }
  for (const x of [AR.x1 - 1, AR.x2 + 1]) { set(x, G + 4, 54, 'lantern', lantern(false)); set(x, G + 4, 66, 'lantern', lantern(false)); }
  for (const x of [36, 40, 44]) set(x, G + 4, 67, 'lantern', lantern(false));
  // panneaux d'arène et trophée
  set(AR.x1 - 1, G + 1, 60, 'pixelmon:blue_floor_gym_sign', { facing: 'east' });
  set(AR.x2 + 1, G + 1, 60, 'pixelmon:red_floor_gym_sign', { facing: 'west' });
  for (const x of [AR.x1 - 1, AR.x2 + 1]) for (const z of [57, 63]) lampPost(x, z, 'spruce_fence');
  set(40, G + 3, 67, 'pokeblocks:pokemon_trophy', { facing: 'north' });
  set(40, G + 2, 67, 'gold_block');
}

// ---------------------------------------------------------------- cercle du portail de donjon (sud-est)
const GX = 56, GZ = 57;
{
  for (let x = GX - 5; x <= GX + 5; x++) for (let z = GZ - 5; z <= GZ + 5; z++) {
    const d = Math.hypot(x - GX, z - GZ);
    if (!onIsland(x, z) || hAt(x, z) !== 0 || d > 4.6) continue;
    if (d <= 1.5) set(x, G, z, 'gravel');
    else if (d <= 2.6) set(x, G, z, 'polished_andesite');
    else if (d <= 3.6) set(x, G, z, hash(x, 8, z) > 0.4 ? 'mossy_cobblestone' : 'stone_bricks');
    else if (hash(x, 9, z) > 0.5) set(x, G, z, 'mossy_cobblestone');
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    const x = Math.round(GX + 4 * Math.cos(a)), z = Math.round(GZ + 4 * Math.sin(a));
    if (!onIsland(x, z)) { console.warn('pilier hors île', x, z); continue; }
    const h = 2 + Math.floor(hash(x, 10, z) * 3);
    for (let y = 1; y <= h; y++) set(x, G + y, z, y === h && hash(x, 11, z) > 0.5 ? 'chiseled_stone_bricks' : pick(['mossy_stone_bricks', 'cracked_stone_bricks', 'stone_bricks'], x, y, z));
    if (h <= 3) set(x, G + h + 1, z, 'lantern', lantern(false));
    else set(x, G + h + 1, z, 'mossy_stone_brick_slab', slab('bottom'));
  }
  set(GX + 3, G + 1, GZ + 3, 'mossy_cobblestone_slab', slab('bottom'));
  set(GX - 4, G + 1, GZ + 1, 'mossy_stone_brick_stairs', stairs('east'));
}

// ---------------------------------------------------------------- sanctuaire des crates (plateau de la colline)
{
  const y0 = G + HH;
  const sx1 = 13, sx2 = 18, sz1 = 33, sz2 = 37;
  fill(sx1, y0, sz1, sx2, y0, sz2, 'pixelmon:temple_brick');
  for (const [x, z] of [[sx1, sz1], [sx2, sz1], [sx1, sz2], [sx2, sz2]]) {
    set(x, y0, z, 'chiseled_stone_bricks');
    for (let y = y0 + 1; y <= y0 + 4; y++) set(x, y, z, 'stripped_spruce_log', logY);
  }
  for (let x = sx1 + 1; x < sx2; x++) set(x, y0 + 4, sz1, 'stripped_spruce_log', logX);
  hipRoof(sx1 - 1, sz1 - 1, sx2 + 1, sz2 + 1, y0 + 5, BLUE, 'spruce');
  ['poke_crate', 'great_crate', 'ultra_crate', 'master_crate'].forEach((c, i) => set(sx1 + 1 + i, y0 + 1, sz1 + 1, 'helscrates:' + c, { opening: 'false' }, { id: 'helscrates:crate_block_entity' }));
  for (let x = sx1 + 1; x < sx2; x++) set(x, y0 + 4, sz2, 'stripped_spruce_log', logX);
  set(sx1 + 1, y0 + 3, sz2, 'lantern', lantern(true)); set(sx2 - 1, y0 + 3, sz2, 'lantern', lantern(true));
  set(sx2 + 1, y0 + 1, sz1, 'handcrafted:blue_glazed_thick_pot'); set(sx2 + 1, y0 + 1, sz2, 'handcrafted:blue_glazed_thick_pot');
  set(sx1 + 2, y0 + 1, sz2 - 1, 'pixelmon:spruce_bench', { facing: 'north' });
  set(sx1 + 3, y0 + 1, sz2 - 1, 'pixelmon:spruce_bench', { facing: 'north' });
}

// ---------------------------------------------------------------- camp (sud-ouest)
{
  const cx = 25, cz = 59;
  for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 2; z <= cz + 2; z++) if (onIsland(x, z) && Math.hypot(x - cx, z - cz) <= 2.3) set(x, G, z, hash(x, 50, z) > 0.4 ? 'coarse_dirt' : 'gravel');
  set(cx, G, cz, 'cobblestone'); set(cx, G + 1, cz, 'campfire', { facing: 'north', lit: 'true', signal_fire: 'false', ...WL });
  set(cx - 2, G + 1, cz, 'stripped_spruce_log', logZ); set(cx + 2, G + 1, cz, 'stripped_spruce_log', logZ);
  set(cx, G + 1, cz + 2, 'stripped_spruce_log', logX);
  // tente
  const tx = 20;
  for (let z = 57; z <= 60; z++) {
    if (!onIsland(tx - 1, z) || !onIsland(tx + 1, z)) { console.warn('tente hors île', z); continue; }
    set(tx - 1, G + 1, z, 'white_wool'); set(tx + 1, G + 1, z, 'white_wool'); set(tx, G + 2, z, z === 57 || z === 60 ? 'red_wool' : 'white_wool');
    set(tx, G + 1, z, z === 57 ? 'white_wool' : 'red_carpet');
  }
  set(tx, G + 1, 61, 'spruce_fence', {}); set(tx, G + 2, 61, 'lantern', lantern(false));
  set(23, G + 1, 62, 'barrel', { facing: 'up', open: 'false' });
  set(cx + 2, G + 1, cz - 2, 'pixelmon:cooking_pot', { facing: 'west', multipos: 'base' }, { id: 'pixelmon:cooking_pot' });
  set(cx + 2, G + 2, cz - 2, 'pixelmon:cooking_pot', { facing: 'west', multipos: 'top' });
}

// ---------------------------------------------------------------- waystone (repris de l'île d'origine)
const src = plain(read(fs.readFileSync(DEFAULT_NBT)).root);
const srcBlock = (name, y) => src.blocks.find(b => src.palette[b.state].Name === name && (y === undefined || b.pos[1] === y));
const wsLow = srcBlock('waystones:blackstone_waystone', 14), wsUp = srcBlock('waystones:blackstone_waystone', 15);
const WS = [36, G + 1, 45];
set(WS[0], WS[1], WS[2], 'waystones:mossy_waystone', { waterlogged: 'false', origin: 'player', half: 'lower', facing: 'east' }, wsLow.nbt);
set(WS[0], WS[1] + 1, WS[2], 'waystones:mossy_waystone', { waterlogged: 'false', origin: 'player', half: 'upper', facing: 'east' }, wsUp.nbt);

// ---------------------------------------------------------------- coffres de départ (repris de l'île d'origine)
const chests = src.blocks.filter(b => src.palette[b.state].Name === 'sophisticatedstorage:chest');
const keyChest = chests.find(b => JSON.stringify(b.nbt).includes('poke_key')) || chests[0];
const emptyChest = chests.find(b => b !== keyChest) || chests[0];
const CH1 = [47, F2 + 1, 16], CH2 = [47, F2 + 1, 17];
set(...CH1, 'sophisticatedstorage:chest', { ticking: 'false', waterlogged: 'false', facing: 'west', type: 'single' }, keyChest.nbt);
set(...CH2, 'sophisticatedstorage:chest', { ticking: 'false', waterlogged: 'false', facing: 'west', type: 'single' }, emptyChest.nbt);

// ---------------------------------------------------------------- arbres
function canopyLeaf(x, y, z, name) { if (!get(x, y, z)) set(x, y, z, name, leaves); }
function blob(cx, cy, cz, rr, name, flat = 1.5) {
  const R = Math.ceil(rr);
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) for (let dy = -1; dy <= Math.ceil(rr * 0.8); dy++) {
    const d = Math.hypot(dx, dz, dy * flat);
    if (d <= rr + 0.35 - hash(cx + dx, cy + dy, cz + dz) * 0.7) canopyLeaf(cx + dx, cy + dy, cz + dz, name);
  }
}
function tree(kind, x0, z0, h, r) {
  if (!onIsland(x0, z0) && !islandCells.has(`${x0},${z0}`)) { console.warn('arbre hors île', kind, x0, z0); return; }
  const y0 = groundY(x0, z0);
  if (!is(x0, y0, z0, /grass_block|dirt|moss/)) { console.warn('arbre sur', get(x0, y0, z0)?.name, x0, z0); return; }
  set(x0, y0, z0, 'dirt');
  const log = { oak: 'oak_log', birch: 'birch_log', spruce: 'spruce_log', cherry: 'cherry_log', azalea: 'oak_log' }[kind];
  const leaf = { oak: 'oak_leaves', birch: 'birch_leaves', spruce: 'spruce_leaves', cherry: 'cherry_leaves', azalea: 'flowering_azalea_leaves' }[kind];
  if (kind === 'spruce') {
    for (let y = 1; y <= h; y++) set(x0, y0 + y, z0, log, logY);
    for (let y = 2; y <= h + 1; y++) {
      const t = (h + 1 - y) / (h - 1);
      const rr = (y % 2 === 0 ? 1 : 0.6) * (0.6 + r * t);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= rr + 0.3) canopyLeaf(x0 + dx, y0 + y, z0 + dz, leaf);
    }
    canopyLeaf(x0, y0 + h + 1, z0, leaf); canopyLeaf(x0, y0 + h + 2, z0, leaf);
    return;
  }
  for (let y = 1; y <= h; y++) set(x0, y0 + y, z0, log, logY);
  if (kind === 'oak' && r >= 3) {
    for (const [dx, dz, ax] of [[1, 0, logX], [-1, 0, logX], [0, 1, logZ], [0, -1, logZ]]) {
      if (hash(x0 + dx, 15, z0 + dz) < 0.35) continue;
      set(x0 + dx, y0 + h - 1, z0 + dz, log, ax); set(x0 + 2 * dx, y0 + h, z0 + 2 * dz, log, ax);
      blob(x0 + 2 * dx, y0 + h + 1, z0 + 2 * dz, 2.2, leaf);
    }
  }
  blob(x0, y0 + h + 1, z0, r - (kind === 'birch' ? 0.8 : 0.3), leaf, kind === 'birch' ? 1.1 : 1.5);
  if (kind === 'azalea') blob(x0, y0 + h + 1, z0, r - 0.6, 'azalea_leaves');
}
const islandCells = new Map(); // îlots secondaires : (x,z) -> y du sommet
const groundY = (x, z) => islandCells.has(`${x},${z}`) ? islandCells.get(`${x},${z}`) : surfY(x, z);

// îlots flottants secondaires
function islet(cx, cz, r, topY, treeKind) {
  for (let x = cx - r - 1; x <= cx + r + 1; x++) for (let z = cz - r - 1; z <= cz + r + 1; z++) {
    const th = Math.atan2(z - cz, x - cx);
    const rho = Math.hypot(x - cx, z - cz) / (r + 0.6 * Math.sin(3 * th + cx));
    if (rho > 1 || x < 0 || z < 0 || x >= W || z >= L) continue;
    const depth = Math.max(1, Math.round((r + 2) * (1 - Math.pow(rho, 1.3)) + hash(x, 90, z) * 1.5));
    islandCells.set(`${x},${z}`, topY);
    for (let y = topY - depth; y <= topY; y++) {
      const dd = topY - y, rr = hash(x, y + 91, z);
      const b = dd === 0 ? 'grass_block' : dd <= 1 ? 'dirt' : rr < 0.5 ? 'stone' : rr < 0.75 ? 'andesite' : rr < 0.9 ? 'tuff' : 'mossy_cobblestone';
      set(x, y, z, b, b === 'grass_block' ? { snowy: 'false' } : {});
    }
    if (hash(x, 92, z) > 0.6 && !(x === cx && z === cz)) set(x, topY + 1, z, pick(['short_grass', 'fern', 'cornflower', 'oxeye_daisy'], x, 93, z));
  }
  tree(treeKind, cx, cz, treeKind === 'spruce' ? 6 : 4, treeKind === 'spruce' ? 2.4 : 2.6);
}
islet(8, 9, 4, G + 4, 'cherry');
islet(72, 10, 3, G - 3, 'birch');
islet(73, 71, 4, G + 2, 'azalea');
islet(7, 70, 3, G - 5, 'spruce');

// forêt nord-ouest + colline
const TREES = [
  ['oak', 22, 21, 5, 3], ['birch', 26, 17, 6, 2.6], ['oak', 18, 26, 4, 2.6], ['birch', 14, 22, 5, 2.4], ['spruce', 12, 28, 7, 2.6],
  ['spruce', 15, 29, 6, 2.3], ['spruce', 20, 30, 6, 2.2], ['oak', 27, 26, 4, 2.5], ['birch', 21, 14, 5, 2.4], ['spruce', 11, 35, 6, 2.3],
  ['spruce', 10, 42, 5, 2.0], ['azalea', 25, 31, 2, 2.2], ['oak', 29, 64, 4, 2.8], ['birch', 16, 55, 5, 2.3], ['cherry', 49, 32, 4, 2.6],
  ['oak', 68, 37, 4, 2.6], ['birch', 69, 45, 5, 2.4], ['oak', 51, 64, 4, 2.6], ['azalea', 62, 61, 2, 2.2], ['cherry', 30, 44, 4, 2.4],
  ['oak', 53, 15, 4, 2.4],
];
for (const t of TREES) tree(...t);
// pétales sous les cerisiers
for (const [kind, x0, z0] of TREES) if (kind === 'cherry') for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
  const x = x0 + dx, z = z0 + dz, y = groundY(x, z);
  if (is(x, y, z, /grass_block/) && !get(x, y + 1, z) && hash(x, 13, z) > 0.45) set(x, y + 1, z, 'pink_petals', { facing: pick(['north', 'east', 'south', 'west'], x, 1, z), flower_amount: String(1 + Math.floor(hash(x, 14, z) * 4)) });
}

// ---------------------------------------------------------------- éclairage du terrain (anti-monstres)
for (const [x, z] of [[24, 24], [14, 26], [12, 40], [33, 52], [47, 52], [53, 29], [67, 33], [26, 63], [20, 53], [11, 32]]) {
  if (!onIsland(x, z) || get(x, surfY(x, z) + 1, z) || LAKE(x, z) !== null) { console.warn('lanterne ignorée', x, z); continue; }
  const y = surfY(x, z);
  set(x, y + 1, z, 'mossy_cobblestone_wall', {}); set(x, y + 2, z, 'lantern', lantern(false));
}

// ---------------------------------------------------------------- végétation
for (const [k, rho] of rhoMap) {
  const [x, z] = k.split(',').map(Number);
  const y = surfY(x, z);
  if (!is(x, y, z, /grass_block/) || get(x, y + 1, z)) continue;
  if (inRect(x, z, X1 - 2, Z1 - 3, X2 + 2, Z2 + 3)) continue;
  if (inRect(x, z, AR.x1, AR.z1, AR.x2, AR.z2)) continue;
  if (Math.hypot(x - CX, z - CZ) < PR + 1.5) continue;
  if (Math.hypot(x - 40, z - 47) < 2) continue; // spawn
  const r = hash(x, 20, z);
  if (r > 0.84) set(x, y + 1, z, 'short_grass');
  else if (r > 0.81) set(x, y + 1, z, x < 32 ? 'fern' : 'short_grass');
  else if (r > 0.78) set(x, y + 1, z, pick(['dandelion', 'poppy', 'cornflower', 'oxeye_daisy', 'azure_bluet', 'allium', 'lily_of_the_valley'], x, 21, z));
  else if (r > 0.775 && rho < 0.85) set(x, y + 1, z, 'azalea');
  else if (r < 0.03) set(x, y + 1, z, 'moss_carpet');
  else if (r > 0.765 && r <= 0.775 && x < 30) set(x, y + 1, z, 'sweet_berry_bush', { age: '1' });
}

// ---------------------------------------------------------------- connexions (barrières, vitres, murets)
const NONSOLID = /air|lantern|chain|carpet|petals|grass$|fern|flower|tulip|allium|bluet|valley|daisy|dandelion|poppy|azalea$|lily_pad|bamboo|torch|sign|water|stairs|slab|campfire|another_furniture|handcrafted|pixelmon:(?!.*(planks|temple_brick|wooden_flooring))|pokeblocks|helscrates|waystones|trapdoor|curtain|cushion|sugar_cane|wheat|carrots|potatoes|beetroots|farmland|dirt_path|bush|ladder|door|chimney|rod|composter|grindstone|leaves/;
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
  } else if (/_fence$/.test(b.name)) {
    const fam = /_fence$|fence_gate/;
    const c = (xx, zz) => String(solidOrSame(xx, y, zz, fam));
    b.props = { north: c(x, z - 1), south: c(x, z + 1), east: c(x + 1, z), west: c(x - 1, z), ...WL };
  } else if (/_wall$/.test(b.name) && !/hanging|wall_sign|gym_sign/.test(b.name)) {
    const fam = /_wall$/;
    const c = (xx, zz) => solidOrSame(xx, y, zz, fam) ? 'low' : 'none';
    const n = c(x, z - 1), s = c(x, z + 1), e = c(x + 1, z), w = c(x - 1, z);
    const straight = (n !== 'none' && s !== 'none' && e === 'none' && w === 'none') || (e !== 'none' && w !== 'none' && n === 'none' && s === 'none');
    b.props = { north: n, south: s, east: e, west: w, up: String(!straight || !!get(x, y + 1, z)), ...WL };
  }
}

// ---------------------------------------------------------------- panneaux (texte, en anglais)
const txt = s => JSON.stringify({ text: s });
const signNbt = (lines, color = 'black', glow = 0, id = 'minecraft:hanging_sign') => ({
  id, is_waxed: 1,
  front_text: { color, has_glowing_text: glow, messages: lines.map(txt) },
  back_text: { color, has_glowing_text: glow, messages: lines.map(txt) },
});
set(40, F1 + 3, Z2 + 2, 'spruce_hanging_sign', { rotation: '0', attached: 'false', ...WL }, signNbt(['', 'Pokémon', 'Center', ''], 'blue', 1));
set(44, G + 1, 44, 'spruce_sign', { rotation: '2', ...WL }, signNbt(['Welcome to', 'Windhaven', '', 'Good luck, Trainer!'], 'black', 0, 'minecraft:sign'));
set(19, G + HH + 4, 35, 'spruce_hanging_sign', { rotation: '12', attached: 'false', ...WL }, signNbt(['', 'Crate', 'Shrine', '']));
set(30, G + 1, 34, 'spruce_sign', { rotation: '12', ...WL }, signNbt(['', 'Crate Shrine', '<--', ''], 'black', 0, 'minecraft:sign'));
set(52, G + 1, 42, 'spruce_sign', { rotation: '4', ...WL }, signNbt(['', 'Farm', '', ''], 'black', 0, 'minecraft:sign'));
set(38, G + 1, 53, 'spruce_sign', { rotation: '8', ...WL }, signNbt(['', 'Battle Field', '', ''], 'black', 0, 'minecraft:sign'));
set(42, F2 + 2, 14, 'spruce_wall_sign', { facing: 'south', ...WL }, { ...signNbt(['', 'Thank you', 'for downloading!', '']), id: 'minecraft:sign' });

// ---------------------------------------------------------------- entités : portail de donjon + cadre
const entities = [];
const gate = src.entities.find(e => e.nbt.id === 'pixelgo_dungeon:gate');
if (gate) entities.push({ pos: [GX + 0.5, G + 3, GZ + 0.5], blockPos: [GX, G + 3, GZ], nbt: { ...gate.nbt } });
const FRAME = [43, F2 + 2, 14];
entities.push({ pos: [FRAME[0] + 0.5, FRAME[1] + 0.5, FRAME[2] + 0.03125], blockPos: FRAME, nbt: { id: 'minecraft:item_frame' } });

// ---------------------------------------------------------------- export NBT
function toTag(v) {
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
const rawRoot = read(fs.readFileSync(DEFAULT_NBT)).root;
const rawBlocks = rawRoot.v.blocks.v;
const rawByPos = (pos) => rawBlocks.find(b => b.v.pos.v.map(t => t.v).join() === pos.join());
const keepRaw = new Map();
keepRaw.set(K(...WS), rawByPos(wsLow.pos).v.nbt);
keepRaw.set(K(WS[0], WS[1] + 1, WS[2]), rawByPos(wsUp.pos).v.nbt);
keepRaw.set(K(...CH1), rawByPos(keyChest.pos).v.nbt);
keepRaw.set(K(...CH2), rawByPos(emptyChest.pos).v.nbt);
const rawEntities = rawRoot.v.entities.v;
// coffres Sophisticated Storage : corps bleu, accents blancs
const ARGB = hex => (0xFF000000 | hex) | 0;
function recolor(tag, main, accent) {
  if (!tag || typeof tag.v !== 'object' || tag.v === null) return;
  for (const [k, e] of Object.entries(tag.v)) {
    if (e && e.t === 3 && /mainColor|main_color/.test(k)) e.v = main;
    else if (e && e.t === 3 && /accentColor|accent_color/.test(k)) e.v = accent;
    else if (e && (e.t === 10 || e.t === 9)) recolor(e, main, accent);
  }
}
for (const p of [CH1, CH2]) recolor(keepRaw.get(K(...p)), ARGB(0x3B6FC4), ARGB(0xF0F0F0));

const palette = [], palIndex = new Map(), blocks = [];
for (const [k, b] of grid) {
  if (b.name === 'minecraft:air') continue;
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
  nbt.Pos = T.list(6, e.pos.map(T.d));
  if (e.nbt.id === 'minecraft:item_frame') {
    nbt.Facing = T.b(3); // sud
    nbt.Item = T.c({ ...nbt.Item.v, id: T.str('pixelmon:blue_poke_bag') });
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
fs.writeFileSync(path.join(HERE, 'preview-windhaven.json'), JSON.stringify({ size: [W, H, L], blocks: [...grid].filter(([, b]) => b.name !== 'minecraft:air').map(([k, b]) => [k, b.name, b.props]) }));
console.log('spawn (relatif gabarit):', [40, G + 1, 47], 'regard nord');
console.log('écrit', OUT, 'blocs', blocks.length, 'palette', palette.length, 'entités', entTags.length);
