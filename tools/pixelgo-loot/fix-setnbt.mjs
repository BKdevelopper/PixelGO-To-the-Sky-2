#!/usr/bin/env node
/**
 * Converts every `minecraft:set_nbt` loot function under kubejs/data into the
 * 1.21.1 equivalents. `set_nbt` no longer exists since 1.20.5: a table that uses
 * it is rejected whole at load time, and its chest spawns empty.
 *
 * The 28 dungeons_arise tables that had it are older copies with our own edits
 * (Poké Ball / lid pools, Ex Deorum ore chunks), so they are fixed in place
 * instead of being replaced by the mod jar's version.
 *
 *   Potion / CustomPotionEffects / CustomPotionColor -> potion_contents
 *   display.color                                    -> dyed_color
 *   Enchantments                                     -> enchantments
 *   SkullOwner                                       -> profile
 *   Fireworks                                        -> fireworks
 *   display.Name                                     -> extra set_name function
 *
 * Any NBT key it does not know stops the script, so nothing is dropped silently.
 *
 *   node tools/pixelgo-loot/fix-setnbt.mjs          (writes)
 *   node tools/pixelgo-loot/fix-setnbt.mjs --dry    (report only)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = path.join(ROOT, 'kubejs', 'data');
const DRY = process.argv.includes('--dry');

// ---------------------------------------------------------------- SNBT reader
function parseSnbt(src) {
  let i = 0;
  const ws = () => { while (/\s/.test(src[i])) i++; };
  const fail = (m) => { throw new Error(`SNBT: ${m} at ${i} in ${src}`); };
  function value() {
    ws();
    const c = src[i];
    if (c === '{') return compound();
    if (c === '[') return list();
    if (c === '"' || c === "'") return quoted();
    return scalar();
  }
  function quoted() {
    const q = src[i++]; let s = '';
    while (src[i] !== q) { if (src[i] === '\\') i++; if (i >= src.length) fail('open string'); s += src[i++]; }
    i++; return s;
  }
  function word(key = false) {
    const m = (key ? /^[A-Za-z0-9_\-.+]+/ : /^[A-Za-z0-9_\-.+:]+/).exec(src.slice(i));
    if (!m) fail('word'); i += m[0].length; return m[0];
  }
  function scalar() {
    const w = word();
    const n = /^(-?\d+(?:\.\d+)?)([bslfdBSLFD]?)$/.exec(w);
    if (n) return Number(n[1]);
    if (w === 'true') return 1; if (w === 'false') return 0;
    return w;
  }
  function compound() {
    i++; const o = {}; ws();
    if (src[i] === '}') { i++; return o; }
    for (;;) {
      ws(); const k = (src[i] === '"' || src[i] === "'") ? quoted() : word(true);
      ws(); if (src[i++] !== ':') fail('expected :');
      o[k] = value(); ws();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === '}') { i++; return o; }
      fail('expected , or }');
    }
  }
  function list() {
    i++; ws();
    if (/^[BIL];/.test(src.slice(i, i + 2))) i += 2; // typed array
    const a = []; ws();
    if (src[i] === ']') { i++; return a; }
    for (;;) {
      a.push(value()); ws();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === ']') { i++; return a; }
      fail('expected , or ]');
    }
  }
  const v = value(); ws();
  if (i !== src.length) fail('trailing data');
  return v;
}

// 1.20 numeric mob effect ids
const EFFECT = [null, 'speed', 'slowness', 'haste', 'mining_fatigue', 'strength', 'instant_health',
  'instant_damage', 'jump_boost', 'nausea', 'regeneration', 'resistance', 'fire_resistance',
  'water_breathing', 'invisibility', 'blindness', 'night_vision', 'hunger', 'weakness', 'poison',
  'wither', 'health_boost', 'absorption', 'saturation', 'glowing', 'levitation', 'luck', 'unluck',
  'slow_falling', 'conduit_power', 'dolphins_grace', 'bad_omen', 'hero_of_the_village', 'darkness'];
const SHAPE = ['small_ball', 'large_ball', 'star', 'creeper', 'burst'];
const ns = (id) => (String(id).includes(':') ? String(id) : `minecraft:${id}`);

/** NBT compound -> list of replacement loot functions */
function convert(nbt, where) {
  const components = {};
  const extra = [];
  const left = { ...nbt };

  if ('Potion' in left || 'CustomPotionEffects' in left || 'CustomPotionColor' in left) {
    const pc = {};
    if (left.Potion) pc.potion = ns(left.Potion);
    if (left.CustomPotionColor != null) pc.custom_color = left.CustomPotionColor;
    if (left.CustomPotionEffects) {
      pc.custom_effects = left.CustomPotionEffects.map((e) => {
        const id = typeof e.Id === 'number' ? EFFECT[e.Id] : e.Id;
        if (!id) throw new Error(`${where}: unknown effect id ${e.Id}`);
        const out = { id: ns(id) };
        if (e.Amplifier) out.amplifier = e.Amplifier;
        if (e.Duration != null) out.duration = e.Duration;
        return out;
      });
    }
    components['minecraft:potion_contents'] = pc;
    delete left.Potion; delete left.CustomPotionEffects; delete left.CustomPotionColor;
  }
  if (left.display) {
    const d = { ...left.display };
    if (d.color != null) { components['minecraft:dyed_color'] = { rgb: d.color }; delete d.color; }
    if (d.Name != null) {
      extra.push({ function: 'minecraft:set_name', target: 'custom_name', name: JSON.parse(d.Name) });
      delete d.Name;
    }
    if (Object.keys(d).length) throw new Error(`${where}: unknown display keys ${Object.keys(d)}`);
    delete left.display;
  }
  if (left.Enchantments) {
    const levels = {};
    for (const e of left.Enchantments) levels[ns(e.id)] = e.lvl;
    components['minecraft:enchantments'] = { levels };
    delete left.Enchantments;
  }
  if (left.SkullOwner != null) {
    const o = left.SkullOwner;
    components['minecraft:profile'] = typeof o === 'string' ? { name: o } : { name: o.Name };
    delete left.SkullOwner;
  }
  if (left.Fireworks) {
    const f = left.Fireworks;
    components['minecraft:fireworks'] = {
      flight_duration: f.Flight ?? 1,
      explosions: (f.Explosions || []).map((x) => ({
        shape: SHAPE[x.Type ?? 0],
        colors: x.Colors || [],
        fade_colors: x.FadeColors || [],
        has_trail: !!x.Trail,
        has_twinkle: !!x.Flicker,
      })),
    };
    delete left.Fireworks;
  }
  if (Object.keys(left).length) throw new Error(`${where}: unhandled NBT keys ${Object.keys(left).join(', ')}`);

  const out = [];
  if (Object.keys(components).length) out.push({ function: 'minecraft:set_components', components });
  return out.concat(extra);
}

// ---------------------------------------------------------------- walk + fix
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : [p];
}) : []);

// 1.20 set_attributes: operation names changed, `name` became a required `id`,
// and `replace` now defaults to true (a 2nd set_attributes wiped the 1st one).
const OPERATION = { addition: 'add_value', multiply_base: 'add_multiplied_base', multiply_total: 'add_multiplied_total' };
const isOldAttributes = (fn) => fn?.function === 'minecraft:set_attributes'
  && (fn.modifiers || []).some((m) => !m.id || OPERATION[m.operation]);
function fixAttributes(fns, where) {
  let n = 0, seen = 0;
  fns.forEach((fn) => {
    if (fn?.function !== 'minecraft:set_attributes') return;
    if (isOldAttributes(fn)) {
      n++;
      fn.modifiers = fn.modifiers.map((m) => {
        const { name, uuid, ...rest } = m;
        const attr = String(m.attribute).replace(/^minecraft:/, '').replace(/[^a-z0-9_]/g, '_');
        return { ...rest, id: rest.id || `pixelgo:${where.split('/').pop().replace('.json', '')}_${attr}`, operation: OPERATION[m.operation] || m.operation };
      });
    }
    if (seen++ > 0 && fn.replace === undefined) fn.replace = false;
  });
  return n;
}

let files = 0, fixed = 0;
for (const f of walk(DATA).filter((x) => x.endsWith('.json'))) {
  const text = fs.readFileSync(f, 'utf8');
  if (!text.includes('set_nbt') && !/"operation": "(addition|multiply_base|multiply_total)"/.test(text)) continue;
  const where = path.relative(ROOT, f).replace(/\\/g, '/');
  const json = JSON.parse(text);
  let n = 0;
  const visit = (o) => {
    if (Array.isArray(o)) return o.forEach(visit);
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o.functions)) {
      n += fixAttributes(o.functions, where);
      o.functions = o.functions.flatMap((fn) => {
        if (fn?.function !== 'minecraft:set_nbt') return [fn];
        n++;
        const repl = convert(parseSnbt(fn.tag), where);
        if (fn.conditions) repl.forEach((r) => { r.conditions = fn.conditions; });
        return repl;
      });
    }
    Object.values(o).forEach(visit);
  };
  visit(json);
  if (JSON.stringify(json).includes('set_nbt')) throw new Error(`${where}: set_nbt left after conversion`);
  files++; fixed += n;
  if (!DRY) fs.writeFileSync(f, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`${n.toString().padStart(3)}  ${where}`);
}
console.log(`\n${fixed} old-format functions converted in ${files} files${DRY ? ' (dry run)' : ''}.`);
