#!/usr/bin/env node
/**
 * PixelGO key layout, applied to options.txt (the file shipped in the export).
 * Rules:
 *  - Pixelmon keeps its default keys.
 *  - PixelGO menus and origin skills live on an Alt layer.
 *  - Armour modes (Mekanism / ProjectE) and debug keys stay unbound.
 * Re-run after adding a mod that grabs a busy key:  node tools/pixelgo-keys/keys.mjs
 * It prints every in-game key still shared by several actions.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'options.txt');
const OFF = 'key.keyboard.unknown';
const k = (c, mod) => `key.keyboard.${c}${mod ? ':' + mod : ''}`;

export const LAYOUT = {
  // PixelGO menus
  'key.pixelnav.open_pokenav': k('p'),
  'key.pixelgo_npc.open_codex': k('c', 'ALT'),
  'key.pixelgo_minions.fortune_stats': k('k', 'ALT'),
  'key.pixelgo_autobattle.toggle': k('v', 'ALT'),
  // origin skills (NeoOrigins)
  'key.neoorigins.skill_1': k('1', 'ALT'),
  'key.neoorigins.skill_2': k('2', 'ALT'),
  'key.neoorigins.skill_3': k('3', 'ALT'),
  'key.neoorigins.skill_4': k('4', 'ALT'),
  'key.neoorigins.class_skill': k('5', 'ALT'),
  'key.neoorigins.view_info': k('o', 'ALT'),
  'key.neoorigins.toggle_night_vision': k('n', 'ALT'),
  // Pixelmon: keeps its keys, only the secondary ones move off shared keys
  'key.wiki': k('w', 'ALT'),
  'key.nextexternalmove': k('g', 'ALT'),
  'key.socialInteractions': OFF, // P goes to the Pokénav
  'key.research': k('m', 'ALT'), // M = FTB Chunks map
  'iris.keybind.shaderPackSelection': OFF, // O = Pixelmon overlay; shaders stay in Video Settings
  // other mods moved to a free combination
  'key.usetiab': k('t', 'ALT'),
  'key.curios.open.desc': k('i', 'ALT'),
  'key.journeymap.create_waypoint': k('b', 'ALT'),
  'key.squatgrow.toggle': k('u', 'ALT'),
  'key.enderio.toggle_magnet': k('j', 'ALT'),
  'key.constructionwand.wand_undo': k('z', 'CONTROL'),
  'key.buildinggadgets2.undo': k('z', 'CONTROL'),
  // unbound: armour modes, debug / dev tools, duplicates
  'iris.keybind.toggleShaders': OFF,
  'key.fancytoasts.config_menu': OFF,
  'key.kubejs.kubedex': OFF,
  'key.mekanism.head_mode': OFF,
  'key.mekanism.chest_mode': OFF,
  'key.mekanism.legs_mode': OFF,
  'key.mekanism.feet_mode': OFF,
  'key.mekanism.key_hud': OFF,
  'key.projecte.boots_toggle': OFF,
  'key.journeymap.toggle_entity_names': OFF,
  'key.enderio.travel_staff': OFF,
  'key.saveToolbarActivator': OFF,
  'key.loadToolbarActivator': OFF,
  'key.integratedterminals.terminal.portable.open': OFF,
  'key.storagenetwork.remote': OFF,
  'key.toastcontrol.clear': OFF,
  'key.openManual': OFF, // RFTools manual on F1 = opened when hiding the HUD for a screenshot
  'placebo.toggleTrails': OFF,
  'key.craftpresence.config_keycode.name': OFF,
};

if (process.argv[1] && process.argv[1].endsWith('keys.mjs')) {
  const eol = fs.readFileSync(FILE, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  const seen = new Set();
  const out = lines.map((l) => {
    if (!l.startsWith('key_')) return l;
    const name = l.slice(4, l.indexOf(':'));
    if (!(name in LAYOUT)) return l;
    seen.add(name);
    return `key_${name}:${LAYOUT[name]}`;
  });
  for (const n of Object.keys(LAYOUT)) if (!seen.has(n)) out.splice(out.findLastIndex((l) => l.startsWith('key_')) + 1, 0, `key_${n}:${LAYOUT[n]}`);
  fs.writeFileSync(FILE, out.join(eol), 'utf8');

  // report what is still shared, outside screen-only keys
  const ui = /^key_key\.(pc|battle\.|jei\.|ftbquests\.gui|journeymap\.fullscreen|integratedterminals\.terminal\.(tab|craftinggrid)|sophisticatedcore|refinedstorage\.focus|camera\.(zoom|tilt|filter))/;
  const by = {};
  for (const l of out.filter((x) => x.startsWith('key_') && !ui.test(x))) {
    const i = l.indexOf(':'); const key = l.slice(i + 1);
    if (key === OFF) continue;
    (by[key] ||= []).push(l.slice(4, i));
  }
  console.log(`${Object.keys(LAYOUT).length} bindings applied (${seen.size} existed). Still shared:`);
  for (const [key, v] of Object.entries(by).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${key.padEnd(28)} ${v.join(', ')}`);
}
