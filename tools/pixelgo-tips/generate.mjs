#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — tips (mod « Tips », darkhax)
 * =============================================================================
 *  Écrit kubejs/assets/pixelgo/tips/<id>.json.
 *
 *  FORMAT, lu dans tipsmod-neoforge-1.21.1-21.1.3.jar
 *  --------------------------------------------------
 *  Les tips sont des RESSOURCES CLIENT, pas des données serveur :
 *  `TipManager` est un SimpleJsonResourceReloadListener sur le dossier « tips »,
 *  accroché au rechargement des ressources (MixinTextureManager). D'où
 *  `kubejs/assets/<ns>/tips/`, que KubeJS sert comme resource pack.
 *
 *  Schéma de `SimpleTip.CODEC` :
 *    type        tipsmod:simple
 *    text        Component  — OBLIGATOIRE
 *    title       Component  — optionnel, défaut = config.default_title
 *    cycle_time  int (ms)   — optionnel, défaut = config.default_cycle_time
 *    conditions  objet      — optionnel, défaut = aucune condition
 *
 *  `title` et `text` sont de vrais `net.minecraft.network.chat.Component`,
 *  rendus par `Font.split` + `drawString` : couleurs, gras et `extra` marchent,
 *  et le texte se replie tout seul sur la largeur configurée (35 % de l'écran).
 *
 *  Le namespace est `pixelgo` et non `tipsmod` : ça permet de couper les tips
 *  vanilla sans toucher aux nôtres, en ajoutant « tipsmod » à
 *  `ignored_namespaces` dans config/tipsmod.json.
 *
 *    node tools/pixelgo-tips/generate.mjs --dry
 *    node tools/pixelgo-tips/generate.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const OUT = path.join(ROOT, 'kubejs', 'assets', 'pixelgo', 'tips');

/* ---------------------------------------------------------------- palette
 * Reprise de la charte du livre de quêtes (chapitre Welcome) :
 *   gris = corps, vert = bloc/objet/machine, violet clair = Pokémon,
 *   blanc gras = un chiffre ou une touche, rouge = ce qui peut coûter cher. */
const G = (t) => ({ text: t });                                   // corps, gris hérité
const N = (t) => ({ text: t, color: 'white', bold: true });       // nombre
const K = (t) => ({ text: t, color: 'white', bold: true });       // touche
const O = (t) => ({ text: t, color: 'green', bold: true });       // objet / bloc
const P = (t) => ({ text: t, color: 'light_purple', bold: true }); // Pokémon
const W = (t) => ({ text: t, color: 'red', bold: true });         // avertissement
const A = (t) => ({ text: t, color: 'aqua', bold: true });        // commande / système
const Y = (t) => ({ text: t, color: 'gold', bold: true });        // valeur, argent

const titre = (t, couleur) => ({ text: t, color: couleur, bold: true, underlined: true });

/* Titres par thème, pour que le bandeau change de couleur selon le sujet. */
const T = {
  skyblock: titre('Skyblock', 'green'),
  sieve: titre('Sieve & Hammer', 'gold'),
  money: titre('PokeDollars', 'gold'),
  keys: titre('Controls', 'white'),
  gates: titre('PixelGO Gates', 'light_purple'),
  timer: titre('Dimension Timer', 'dark_purple'),
  crates: titre('Crates', 'aqua'),
  pokemon: titre('Pokemon', 'light_purple'),
  danger: titre('Careful', 'red'),
};

/* ------------------------------------------------------------------ tips
 * Le contenu vient du chapitre Welcome du livre de quêtes, plus les chiffres
 * établis par les autres outils (paliers de loot, rangs de Gate, minuterie).
 * `s` = cycle_time en secondes ; laissé vide, le défaut de 5 s s'applique. */
const TIPS = [
  /* --- skyblock ------------------------------------------------------- */
  ['no_terrain', T.skyblock, 8, [
    W('There is no terrain and no ore anywhere in this world.'), G(' Everything you will ever own comes out of your island, through the '),
    O('sieve'), G(' and the '), O('crucible'), G('.')]],

  ['keep_dirt', T.skyblock, 7, [
    W('Do not throw your dirt away.'), G(' Cobblestone is infinite. Dirt is not, until the '),
    O('sieve'), G(' is running.')]],

  ['three_things', T.skyblock, 8, [
    G('The three things you need first: a '), O('cobblestone generator'), G(', a '),
    O('sieve'), G(', and a '), O('crucible'), G('. The chapter '), A('The beginning'),
    G(' walks you through all three.')]],

  ['crucible', T.sieve, 7, [
    G('A '), O('crucible'), G(' melts wood into '), O('lava'), G(', or stone into '),
    O('water'), G('. It is how a skyblock gets both.')]],

  ['hammer_chain', T.sieve, 7, [
    G('Hold a '), O('hammer'), G(' and break a block by hand: cobblestone becomes gravel, gravel becomes sand, sand becomes dust.')]],

  ['mesh_ladder', T.sieve, 9, [
    G('Mesh ladder: '), O('String'), G(' > '), O('Flint'), G(' > '), O('Iron'), G(' > '),
    O('Golden'), G(' > '), O('Diamond'), G(' > '), O('Netherite'),
    G('. Every mesh unlocks new drops and improves the odds of everything below it.')]],

  ['netherite_mesh', T.sieve, 7, [
    W('Some ores only ever come out of the netherite mesh.'),
    G(' If an ore refuses to appear, it is usually the mesh, not your luck.')]],

  ['ore_mesh_floor', T.sieve, 8, [
    G('Pixelmon ores - '), O('bauxite'), G(', '), O('silicon'), G(', '), O('silver'), G(', '),
    O('platinum'), G(' - come from gravel, sand and crushed deepslate, and never below the '),
    N('iron mesh'), G('.')]],

  ['empty_dimensions', T.skyblock, 9, [
    G('The Nether and the End are empty too, with two exceptions: '),
    O('Nether Fortresses'), G(' still generate, and the End keeps its main island. Blazes, wither skeletons and the '),
    O('dragon'), G(' are all still reachable.')]],

  /* --- argent ---------------------------------------------------------- */
  ['selling', T.money, 8, [
    A('/pixelsell'), G(' sells the item in your hand, '), A('/pixelsell all'),
    G(' sells everything sellable you are carrying, and '), A('/pixelvalue'),
    G(' tells you what something is worth first.')]],

  ['sell_button', T.money, 6, [
    G('There is a '), O('Sell'), G(' button on your inventory screen. Same thing as '),
    A('/pixelsell all'), G(', one click.')]],

  ['coins', T.money, 7, [
    G('The '), Y('Nickel'), G(', '), Y('Dime'), G(' and '), Y('Poke Coin'),
    G(' you find in chests are pure treasure. Sell them - nothing in the pack crafts with them.')]],

  /* --- touches --------------------------------------------------------- */
  ['recipe_keys', T.keys, 7, [
    G('Hover any item and press '), K('R'), G(' for '), O('how do I make this'),
    G(', or '), K('U'), G(' for '), O('what is this used for'), G('.')]],

  ['skill_key', T.keys, 7, [
    G('Press '), K('K'), G(' to open the '), O('skill tree'),
    G('. You have points waiting the first time you press it.')]],

  ['pokenav_key', T.keys, 7, [
    G('Press '), K('N'), G(' to open the '), O('PokeNav'),
    G('. It lists every Pokemon that can spawn where you stand.')]],

  ['radar_key', T.keys, 7, [
    G('Press '), K('F4'), G(' for the '), O('Radar'), G(' filter: shinies, legendaries, bosses, raids, Poke Stops.')]],

  ['autobattle_key', T.keys, 7, [
    G('Press '), K('V'), G(' to toggle '), O('AutoBattle'),
    G('. It picks your move for you - but it will never switch Pokemon or throw a ball.')]],

  ['inventory_keys', T.keys, 8, [
    G('Middle click sorts any inventory, anywhere. '), K('['), G(' and '), K(']'),
    G(' move a whole inventory in or out of a container.')]],

  ['map_keys', T.keys, 7, [
    K('M'), G(' opens the FTB Chunks map, '), K('J'), G(' opens JourneyMap, and '),
    K('B'), G(' drops a waypoint where you stand.')]],

  ['force_load', T.keys, 9, [
    G('On the FTB Chunks map, click a chunk to '), O('claim'), G(' it, then click again to '),
    O('force load'), G(' it. '), W('Force load the machine room, not the whole island'),
    G(' - you have a limited number.')]],

  /* --- gates ----------------------------------------------------------- */
  ['gates_open', T.gates, 9, [
    G('A '), O('Gate'), G(' tears open near you about once a minute, between '), N('3'),
    G(' and '), N('20'), G(' blocks away. Up to '), N('2'), G(' stay open at once, and an unused one closes after a Minecraft day.')]],

  ['gates_ranks', T.gates, 8, [
    G('Nine ranks: '), O('E'), G(' > '), O('D'), G(' > '), O('C'), G(' > '), O('B'),
    G(' > '), O('A'), G(' > '), O('S'), G(' > '), O('SS'), G(' > '), O('SSS'), G(' > '),
    W('DEMON'), G('. The rank decides everything.')]],

  ['gates_no_exit', T.danger, 9, [
    W('There is no way out of a Gate until the boss is dead.'),
    G(' Lose a battle and it ejects you, keeping only what you already picked up - and that dungeon is gone.')]],

  ['gates_prepare', T.gates, 9, [
    G('Before you step through a Gate: heal your party, bring balls, bring revives, and clear inventory space. '),
    W('There is no Pokecenter inside.')]],

  ['gates_legendary', T.gates, 7, [
    G('From rank '), O('A'), G(' upward, a Gate boss can be an actual '), P('Legendary Pokemon'),
    G('. It is the fastest legendary encounter in the pack.')]],

  ['gates_chests', T.gates, 8, [
    W('Search every room before you fight the boss.'),
    G(' Beating it opens the exit, and it is very easy to walk out with a chest still unopened behind you.')]],

  ['gates_demon', T.gates, 9, [
    G('The last rank is '), W('DEMON'), G(': twenty eight level '), N('100'),
    G(' Legendaries. One natural Gate in '), N('200'), G('. '),
    Y('Clear one and you have finished this modpack.')]],

  ['gates_catch', T.gates, 8, [
    G('Everything inside a Gate can be caught, and the level range is guaranteed. '),
    G('It is one of the best places in the pack to fill a '), O('Pokedex'), G('.')]],

  ['gate_beacons', T.gates, 8, [
    G('A '), O('Gate Beacon'), G(' opens the rank you want, on the spot. They come out of loot chests - the better the chest, the better the rank.')]],

  /* --- minuterie de dimension ------------------------------------------ */
  ['timer_shared', T.timer, 9, [
    G('The Nether, the End, the '), O('Overworld Mirror'), G(' and '), O('Ultra Space'),
    G(' share '), W('ONE'), G(' timer: '), N('20'), G(' minutes in total, not twenty each.')]],

  ['timer_leave', T.timer, 9, [
    Y('Leave a timed dimension on your own and the time left is banked'),
    G(' - you get it back next trip, with no cooldown. '),
    W('Let it hit zero and you lose it, plus a 20 minute lockout.')]],

  ['timer_hud', T.timer, 8, [
    W('There are no chat warnings.'), G(' The counter in the '), N('bottom right'),
    G(' of your screen is the only thing that will tell you. Look at it.')]],

  ['time_capsule', T.timer, 8, [
    G('A '), O('Time Capsule'), G(' adds '), N('60 seconds'),
    G(' to your dimension timer, permanently, kept through death. The '),
    A('PixelGO General Store'), G(' sells them.')]],

  ['golden_apple_timer', T.timer, 7, [
    G('Eating a '), O('Golden Apple'), G(' adds '), N('30 seconds'),
    G(' to the run in progress. Eat one before you set off and the bonus waits for you.')]],

  /* --- coffres --------------------------------------------------------- */
  ['crates_keys', T.crates, 8, [
    G('Four crates, four keys, and '), W('a key only ever fits its own crate'),
    G('. The key is consumed, with a '), N('7.5'), G(' second cooldown.')]],

  ['crates_preview', T.crates, 8, [
    Y('Shift click a crate to preview it'), G(' - the full list of rewards, with the exact percentages, before you spend a key.')]],

  ['crates_master', T.crates, 8, [
    G('A '), O('Master Crate'), G(' always gives a '), Y('Master Ball'),
    G(' and a hoard of Rare Candy, and can drop a '), Y('Shiny Ball'), G('.')]],

  ['crates_source', T.crates, 7, [
    G('Crate keys come from loot chests, and nowhere else. About '),
    N('one key in every eight chests'), G(' you open.')]],

  /* --- systemes pokemon ------------------------------------------------ */
  ['upgrade_orb', T.danger, 9, [
    W('The Upgrade Orb deletes your Pokemon if the roll fails.'),
    G(' Not fainted, not sent to the PC. Gone. Use it on something you caught twice.')]],

  ['skill_points', T.pokemon, 9, [
    G('The skill tree costs '), N('133'), G(' points and you will only ever earn '),
    N('101'), G('. '), W('You cannot take everything'),
    G(' - and each branch ends in pairs that lock each other out.')]],

  ['skill_xp', T.pokemon, 8, [
    Y('Your cobblestone generator levels up your skill tree on its own.'),
    G(' Mining an ore gives '), N('12'), G(', stone '), N('2'), G(', cobblestone '),
    N('1'), G('. Slowly, but it never stops.')]],

  ['radar_shiny', T.pokemon, 8, [
    G('Leave '), O('shiny tracking'), G(' on in the Radar permanently. It costs nothing and it will save you hours.')]],

  ['pokenav_checkspawn', T.pokemon, 9, [
    G('The '), O('PokeNav'), G(' is '), A('/checkspawn'),
    G(' in your pocket: every Pokemon that can spawn where you stand, with the same percentages and the conditions behind each one.')]],

  ['island_biome', T.pokemon, 8, [
    G('Your island is '), N('one'), G(' biome. The '), O('PokeNav'),
    G(' is how you find out what that biome will, and will not, ever give you.')]],
];

/* ----------------------------------------------------------------- écriture */
const problems = [];
const COULEURS = new Set(['black', 'dark_blue', 'dark_green', 'dark_aqua', 'dark_red', 'dark_purple',
  'gold', 'gray', 'dark_gray', 'blue', 'green', 'aqua', 'red', 'light_purple', 'yellow', 'white']);

const vus = new Set();
const fichiers = new Map();

for (const [id, title, secondes, morceaux] of TIPS) {
  if (!/^[a-z0-9_]+$/.test(id)) problems.push(`id invalide : ${id}`);
  if (vus.has(id)) problems.push(`id en double : ${id}`);
  vus.add(id);
  if (!morceaux.length) problems.push(`${id} : texte vide`);
  for (const m of morceaux) {
    if (typeof m.text !== 'string' || !m.text.length) problems.push(`${id} : morceau sans texte`);
    if (m.color && !COULEURS.has(m.color)) problems.push(`${id} : couleur inconnue « ${m.color} »`);
  }
  if (title.color && !COULEURS.has(title.color)) problems.push(`${id} : couleur de titre inconnue`);

  fichiers.set(id, {
    type: 'tipsmod:simple',
    title,
    // La racine porte le gris : tout morceau sans couleur en hérite.
    text: { text: '', color: 'gray', extra: morceaux },
    cycle_time: secondes * 1000,
  });
}

const lettres = (t) => t.text.extra.reduce((n, m) => n + m.text.length, 0);
/* Contrôle de lisibilité : un tip qui défile trop vite pour être lu ne sert à
 * rien. On compte large — 26 signes par seconde est déjà rapide. */
for (const [id, t] of fichiers) {
  const n = lettres(t);
  const vitesse = n / (t.cycle_time / 1000);
  if (vitesse > 26) problems.push(`${id} : ${n} signes en ${t.cycle_time / 1000} s (${vitesse.toFixed(1)}/s), trop rapide`);
}

console.log(`tips : ${fichiers.size}`);
console.log(`longueur moyenne : ${Math.round([...fichiers.values()].reduce((a, t) => a + lettres(t), 0) / fichiers.size)} signes`);
console.log(`durée totale du cycle : ${Math.round([...fichiers.values()].reduce((a, t) => a + t.cycle_time, 0) / 1000)} s`);

if (problems.length) {
  console.log(`\n${problems.length} PROBLÈME(S) — rien n'est écrit :`);
  for (const p of problems) console.log('  ! ' + p);
  process.exit(1);
}

if (DRY) { console.log('\n--dry : aucun fichier écrit.'); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
// On ne supprime que nos propres fichiers, jamais un ajout manuel non listé.
for (const f of fs.readdirSync(OUT)) {
  const id = f.replace(/\.json$/, '');
  if (f.endsWith('.json') && !fichiers.has(id)) fs.unlinkSync(path.join(OUT, f));
}
for (const [id, json] of fichiers) {
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(json, null, 2) + '\n', 'utf8');
}
console.log(`\nécrits dans ${path.relative(ROOT, OUT).split(path.sep).join('/')}`);
