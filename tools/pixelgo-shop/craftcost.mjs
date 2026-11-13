/**
 * PixelGO — To the Sky : coût de fabrication de n'importe quel objet, au barème du guide de prix.
 *
 * Base : `unit_buy` de l'export minecraft-economy-price-guide (`prices_1_21_*.json`). Ces prix font
 * foi et ne sont jamais recalculés. Tout le reste coûte la somme de ses ingrédients, par le chemin
 * le moins cher, en suivant toute la chaîne (minerai -> four -> lingot -> craft…), avec la même
 * règle que le guide :
 *   - craft (établi, tailleur de pierre, forge) : somme des ingrédients / nombre produit ;
 *   - cuisson (four, haut fourneau, fumoir, feu de camp) : + 1 $ par objet ;
 *   - machine de mod : + 1 $ par opération.
 *
 * Recettes lues : jar vanilla 1.21.1, NeoForge, tous les mods, `kubejs/data`, puis les scripts
 * `kubejs/server_scripts` exécutés avec un faux `event` (ajouts, retraits, remplacements).
 *
 * Module : `import { loadCosts } from './craftcost.mjs'` -> { cost, how, name, exists, key }
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { readZip } from '../pixelgo-economy/zip.mjs';

const ROOT = process.cwd();
const INSTALL = path.join(ROOT, '..', '..', 'Install');
const MC_JAR = path.join(INSTALL, 'versions', '1.21.1', '1.21.1.jar');
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const COOK = new Set(['minecraft:smelting', 'minecraft:blasting', 'minecraft:smoking', 'minecraft:campfire_cooking']);
const CRAFT = new Set(['minecraft:crafting_shaped', 'minecraft:crafting_shapeless', 'minecraft:stonecutting',
  'minecraft:smithing_transform', 'kubejs:shaped', 'kubejs:shapeless']);

/** Clé d'un objet : id, plus ses composants s'il en a (Poké Balls, CT, singularités…). */
const stable = (v) => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}' : JSON.stringify(v);
export const key = (id, comp) => id + (comp && Object.keys(comp).length ? '|' + stable(comp) : '');
const norm = (id) => typeof id === 'string' && !id.includes(':') ? 'minecraft:' + id : id;

/* ---------------------------------------------------------------------------
 *  Normalisation d'une recette en { out, count, ins: [{ ing, n }], step }
 * ------------------------------------------------------------------------- */
const parseStack = (s) => {
  if (s == null) return null;
  if (typeof s === 'string') { const m = s.match(/^(\d+)x\s+(.+)$/); return m ? { id: norm(m[2]), count: +m[1] } : { id: norm(s), count: 1 }; }
  if (Array.isArray(s)) return parseStack(s[0]);
  if (s.id || s.item) return { id: norm(s.id || s.item), count: s.count || s.amount || 1, comp: s.components };
  if (s.stack) return parseStack(s.stack);
  return null;
};
const sized = (x) => {
  if (x == null) return null;
  if (typeof x === 'string') { const m = x.match(/^(\d+)x\s+(.+)$/); return m ? { ing: m[2], n: +m[1] } : { ing: x, n: 1 }; }
  if (Array.isArray(x)) return { ing: x, n: 1 };
  if (x.ingredient) return { ing: x.ingredient, n: x.count || x.amount || 1 };
  if (x.chemical || x.fluid || (x.tag && x.amount && !x.item)) return { ing: { fluidlike: x.chemical || x.fluid || x.tag, amount: x.amount }, n: 1 };
  return { ing: x, n: x.count || 1 };
};
export function parseRecipe(r) {
  if (!r || typeof r !== 'object' || !r.type) return null;
  const t = r.type;
  let out = parseStack(r.result ?? r.output ?? r.item_output ?? r.results ?? r.outputs ?? r.output_item ?? r.main_output);
  if (!out || !out.id) return null;
  let ins = [];
  if (r.pattern && r.key) {
    const chars = (Array.isArray(r.pattern) ? r.pattern : [r.pattern]).join('').split('').filter(c => c !== ' ');
    for (const c of chars) { const k = r.key[c]; if (k == null) return null; ins.push(sized(k)); }
  }
  for (const f of ['ingredients', 'ingredient', 'input', 'inputs', 'item_input', 'input_item', 'base', 'addition',
    'template', 'catalyst_free_input', 'chemical_input', 'fluid_input', 'gas_input', 'main_input', 'extra_input', 'input_fluid',
    'mix', 'fluid', 'fluidInput', 'inputFluid']) {
    if (r[f] == null) continue;
    if (f === 'template' && t === 'minecraft:smithing_transform') { ins.push(sized(r[f])); continue; }
    const v = r[f];
    if (Array.isArray(v) && f !== 'ingredient') v.forEach(x => ins.push(sized(x))); else ins.push(sized(v));
  }
  ins = ins.filter(Boolean);
  if (!ins.length) return null;
  const step = COOK.has(t) ? 1 : CRAFT.has(t) ? 0 : 1;
  return { type: t, out: key(out.id, out.comp), count: out.count || 1, ins, step };
}

/* ---------------------------------------------------------------------------
 *  Faux KubeJS : exécute les scripts de recettes et de tags
 * ------------------------------------------------------------------------- */
function runKubeJS(recipes, tags, log) {
  const files = walk(path.join(ROOT, 'kubejs', 'server_scripts')).filter(f => f.endsWith('.js'))
    .map(f => { const t = fs.readFileSync(f, 'utf8'); const m = t.match(/\/\/\s*priority:\s*(-?\d+)/); return { f, t, p: m ? +m[1] : 0 }; })
    .sort((a, b) => b.p - a.p || a.f.localeCompare(b.f));
  const recipeCbs = [], tagCbs = [];
  const noop = new Proxy(function () { }, { get: (_, k) => k === Symbol.toPrimitive ? () => '' : noop, apply: () => noop });
  const chain = (r) => { const o = { id: (id) => { r.id = id; return o; } }; return new Proxy(o, { get: (t, k) => k in t ? t[k] : () => o }); };
  const add = (json) => { const r = { json }; recipes.push(r); return chain(r); };
  const match = (filter, r) => {
    if (!filter || typeof filter !== 'object') return false;
    if (Array.isArray(filter)) return filter.some(f => match(f, r));
    if (filter.not) return !match(filter.not, r);
    if (filter.or) return filter.or.some(f => match(f, r));
    const p = r.parsed; const id = r.id || '';
    const test = (v, s) => v instanceof RegExp ? v.test(s) : v === s;
    if (filter.id && !test(filter.id, id)) return false;
    if (filter.mod && !id.startsWith(filter.mod + ':')) return false;
    if (filter.type && !(p && test(filter.type, p.type))) return false;
    if (filter.output && !(p && test(norm(filter.output), p.out.split('|')[0]))) return false;
    if (filter.input && !(p && JSON.stringify(p.ins).includes(JSON.stringify(norm(filter.input)).slice(1, -1)))) return false;
    return true;
  };
  const event = {
    shaped: (out, pattern, k) => add({ type: 'minecraft:crafting_shaped', result: out, pattern, key: k }),
    shapeless: (out, ins) => add({ type: 'minecraft:crafting_shapeless', result: out, ingredients: ins }),
    smelting: (out, i) => add({ type: 'minecraft:smelting', result: out, ingredient: i }),
    blasting: (out, i) => add({ type: 'minecraft:blasting', result: out, ingredient: i }),
    smoking: (out, i) => add({ type: 'minecraft:smoking', result: out, ingredient: i }),
    campfireCooking: (out, i) => add({ type: 'minecraft:campfire_cooking', result: out, ingredient: i }),
    stonecutting: (out, i) => add({ type: 'minecraft:stonecutting', result: out, ingredient: i }),
    smithing: (out, tpl, base, addn) => add({ type: 'minecraft:smithing_transform', result: out, template: tpl, base, addition: addn }),
    custom: (json) => add(json),
    remove: (filter) => {
      for (const r of recipes) { r.parsed ??= parseRecipe(r.json); if (!r.removed && match(filter, r)) { r.removed = true; log.removed++; } }
    },
    replaceInput: (filter, from, to) => {
      for (const r of recipes) { r.parsed ??= parseRecipe(r.json); if (!r.removed && match(filter, r)) {
        const s = JSON.stringify(r.json).split(JSON.stringify(from)).join(JSON.stringify(to));
        r.json = JSON.parse(s); r.parsed = null; } }
    },
    replaceOutput: () => { },
    forEachRecipe: () => { }, findRecipes: () => [], server: noop
  };
  event.recipes = new Proxy({}, { get: (_, ns) => new Proxy({}, { get: (_, ty) => (...a) => {
    // event.recipes.minecraft.crafting_shaped(...) & co. : rares ici, enregistrés tels quels
    if (ty === 'crafting_shaped') return event.shaped(...a);
    if (ty === 'crafting_shapeless') return event.shapeless(...a);
    if (ty === 'smelting') return event.smelting(...a);
    return add({ type: `${ns}:${ty}`, ...a[0] }); } }) });
  const tagEvent = {
    add: (t, v) => { (tags[t] ||= []).push(...[v].flat()); },
    remove: (t, v) => { const s = new Set([v].flat()); tags[t] = (tags[t] || []).filter(x => !s.has(x)); },
    removeAll: (t) => { tags[t] = []; }, get: () => noop
  };
  const sandbox = {
    ServerEvents: new Proxy({}, { get: (_, k) => k === 'recipes' ? (cb) => recipeCbs.push(cb)
      : k === 'tags' ? (type, cb) => { if (type === 'item') tagCbs.push(cb); } : noop }),
    Item: { of: (id, a, b) => ({ id, count: typeof a === 'number' ? a : 1, components: typeof b === 'object' ? b : undefined }) },
    Ingredient: { of: (x) => x }, Platform: { isLoaded: () => true },
    console: { log: () => { }, info: () => { }, warn: () => { }, error: () => { } },
    JsonIO: noop, Utils: noop, Java: noop, Text: noop, NBT: noop, global: {}, Component: noop,
    BlockEvents: noop, ItemEvents: noop, PlayerEvents: noop, EntityEvents: noop, LootJS: noop, ServerEvents2: noop
  };
  vm.createContext(sandbox);
  // les scripts partagent une même portée globale (const/let de 05_lib visibles ailleurs) : on les concatène
  vm.runInContext(files.map(x => `\n// ${x.f}\n` + x.t).join('\n'), sandbox, { filename: 'kubejs.js' });
  for (const cb of tagCbs) cb(tagEvent);
  for (const cb of recipeCbs) cb(event);
}

/* ---------------------------------------------------------------------------
 *  Chargement complet
 * ------------------------------------------------------------------------- */
export function loadCosts({ extraBase = {}, extraRecipes = [], revive = () => false, anyComponents = new Set() } = {}) {
  const recipes = []; const byId = new Map(); const tags = {}; const items = new Set(); const lang = { en_us: {}, fr_fr: {} };
  const addTag = (name, body) => { const t = (tags[name] ||= []); if (body.replace) t.length = 0; for (const v of body.values || []) t.push(typeof v === 'string' ? v : v.id); };
  const putRecipe = (id, json) => { if (byId.has(id)) byId.get(id).removed = true; const r = { id, json }; byId.set(id, r); recipes.push(r); };
  const neo = walk(path.join(INSTALL, 'libraries', 'net', 'neoforged', 'neoforge')).filter(f => /neoforge-21\.1\.250-universal\.jar$/.test(f));
  const jars = [MC_JAR, ...neo, ...fs.readdirSync(path.join(ROOT, 'mods')).filter(f => f.endsWith('.jar')).map(f => path.join(ROOT, 'mods', f))];
  const readEntries = (entries) => {
    for (const [n, b] of entries) {
      let m; let j;
      if ((m = n.match(/^data\/([a-z0-9_.-]+)\/recipes?\/(.+)\.json$/))) { try { j = JSON.parse(b); } catch { continue; } putRecipe(m[1] + ':' + m[2], j); }
      else if ((m = n.match(/^data\/([a-z0-9_.-]+)\/tags\/items?\/(.+)\.json$/))) { try { addTag(m[1] + ':' + m[2], JSON.parse(b)); } catch { } }
      else if ((m = n.match(/^assets\/([a-z0-9_.-]+)\/(?:items|models\/item)\/([a-z0-9_/]+)\.json$/))) items.add(m[1] + ':' + m[2]);
      else if ((m = n.match(/^assets\/[a-z0-9_.-]+\/lang\/(en_us|fr_fr)\.json$/))) { try { Object.assign(lang[m[1]], JSON.parse(b)); } catch { } }
    }
  };
  for (const f of jars) {
    try {
      readEntries(readZip(f, n => /^data\/[^/]+\/(recipes?|tags\/items?)\//.test(n) || /^assets\/[^/]+\/(items|models\/item)\//.test(n) || /^assets\/[^/]+\/lang\/(en_us|fr_fr)\.json$/.test(n)));
    } catch { }
  }
  // kubejs/data (surcharges) et kubejs/assets (noms)
  const KD = path.join(ROOT, 'kubejs', 'data');
  readEntries(walk(KD).filter(f => f.endsWith('.json')).map(f => ['data/' + path.relative(KD, f).split(path.sep).join('/'), fs.readFileSync(f)]));
  const KA = path.join(ROOT, 'kubejs', 'assets');
  readEntries(walk(KA).filter(f => f.endsWith('.json')).map(f => ['assets/' + path.relative(KA, f).split(path.sep).join('/'), fs.readFileSync(f)]));
  const log = { removed: 0 };
  runKubeJS(recipes, tags, log);

  // prix de base : le guide
  const exportFile = fs.readdirSync(ROOT).filter(f => /^prices_1_21_.*\.json$/.test(f)).sort().pop();
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, exportFile), 'utf8')); delete guide._export_metadata;
  const base = {};
  for (const [k, v] of Object.entries(guide)) if (!k.startsWith('enchanted_book_')) base['minecraft:' + k] = v.unit_buy;
  Object.assign(base, extraBase);

  const tagCache = {};
  const tagMembers = (t, seen = new Set()) => {
    if (tagCache[t]) return tagCache[t]; if (seen.has(t)) return []; seen.add(t);
    const out = []; for (const v of tags[t] || []) { if (v.startsWith('#')) out.push(...tagMembers(v.slice(1), seen)); else out.push(norm(v)); }
    return (tagCache[t] = out);
  };
  const cost = { ...base }; const how = {};
  for (const k of Object.keys(base)) how[k] = extraBase[k] != null ? { base: 'fixé' } : { base: 'guide' };
  const FLUID = { 'minecraft:water': 0, 'c:water': 0, 'minecraft:lava': 0.025, 'c:lava': 0.025 }; // seau de lave ≈ 25 $
  const ingCost = (ing) => {
    if (ing == null) return Infinity;
    if (Array.isArray(ing)) return ing.length ? Math.min(...ing.map(ingCost)) : Infinity;
    if (typeof ing === 'string') {
      if (ing.startsWith('#')) return Math.min(Infinity, ...tagMembers(ing.slice(1)).map(i => cost[i] ?? Infinity));
      return cost[norm(ing)] ?? Infinity;
    }
    // fluide / produit chimique Mekanism : prix au mB, issu des recettes de conversion (1 redstone -> 10 mB…)
    if (ing.fluidlike) { const f = FLUID[ing.fluidlike] ?? cost[norm(ing.fluidlike)]; return f == null ? Infinity : f * (ing.amount || 1); }
    if (ing.type === 'neoforge:components') {
      const ids = [ing.items].flat();
      return Math.min(...ids.map(i => { const id = norm(typeof i === 'string' ? i : i.item || i.id);
        return cost[key(id, ing.components)] ?? (anyComponents.has(id) ? cost[id] : undefined) ?? Infinity; }));
    }
    if (ing.type === 'neoforge:compound') return ingCost(ing.children);
    if (ing.type === 'neoforge:difference') return ingCost(ing.base);
    if (ing.type === 'neoforge:intersection') {
      const sets = ing.children.map(c => new Set(c.tag ? tagMembers(c.tag) : [norm(c.item)]));
      return Math.min(Infinity, ...[...sets[0]].filter(i => sets.every(s => s.has(i))).map(i => cost[i] ?? Infinity));
    }
    if (ing.tag) return Math.min(Infinity, ...tagMembers(ing.tag).map(i => cost[i] ?? Infinity));
    if (ing.item || ing.id) return cost[norm(ing.item || ing.id)] ?? Infinity;
    if (ing.items) return ingCost(ing.items);
    return Infinity;
  };
  // `revive(id)` : recettes retirées par KubeJS mais qui disent encore ce qu'un objet contient
  // (outils de minion : plus craftables, vendus au prix de leurs anciens ingrédients)
  const live = recipes.filter(r => !r.removed || revive(r.id)).map(r => (r.parsed ??= parseRecipe(r.json)) && Object.assign(r.parsed, { id: r.id })).filter(Boolean);
  // procédés hors recettes (compaction des minions…) : { type, out, count, ins: [{ ing, n }], step }
  live.push(...extraRecipes);
  /* Deux niveaux de confiance. Les recettes « sûres » (établi, four, tailleur, forge, tables de
   * craft des mods, KubeJS, procédés connus) font foi. Les autres machines de mods ne servent que
   * pour un objet qu'aucune recette sûre ne fabrique : leurs raccourcis (scie : 9 bâtons par
   * escalier, broyeur : 2 colorants par cactus…) ne cassent pas le barème du guide, et une entrée
   * de machine mal lue (fluide, énergie) ne peut pas faire tomber un prix vanilla. */
  const trusted = (r) => /^minecraft:(crafting_|smelting|blasting|smoking|campfire|stonecutting|smithing)/.test(r.type)
    || /shaped|shapeless|^kubejs:|^extendedcrafting:|^mekanism:reaction$|^pixelgo_minions:|^pixelmon:infuser$/.test(r.type);
  const tierOf = {};
  for (let pass = 0; pass < 60; pass++) {
    let moved = 0;
    for (const r of live) {
      if (r.out in base) continue;
      const t = trusted(r) ? 1 : 2;
      if (t === 2 && tierOf[r.out] === 1) continue;
      let s = 0; for (const { ing, n } of r.ins) { s += ingCost(ing) * n; if (s === Infinity) break; }
      if (s === Infinity) continue;
      const c = (s + r.step) / r.count;
      const better = t === 1 && tierOf[r.out] === 2 || c < (cost[r.out] ?? Infinity) - 1e-9;
      if (better) { cost[r.out] = c; how[r.out] = r; tierOf[r.out] = t; moved++; }
    }
    if (!moved) break;
  }
  const name = (id) => { const [ns, p] = id.split('|')[0].split(':');
    for (const L of ['fr_fr', 'en_us']) { const v = lang[L][`item.${ns}.${p}`] ?? lang[L][`block.${ns}.${p}`]; if (v) return v; } return null; };
  /** Pourquoi un objet n'a pas de prix : ses recettes et leurs ingrédients sans prix. */
  const why = (k) => live.filter(r => r.out === k).map(r => r.type + ' <- ' + r.ins.map(({ ing, n }) =>
    (n > 1 ? n + '× ' : '') + JSON.stringify(ing).slice(0, 90) + ' = ' + (ingCost(ing) === Infinity ? '∞' : +ingCost(ing).toFixed(2))).join(' + '));
  return { cost, how, name, items, tags, tagMembers, recipes: live, base, log, why, ingCost };
}
