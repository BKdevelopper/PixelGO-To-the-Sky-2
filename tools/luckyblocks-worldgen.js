/* =============================================================================
 *  PixelGO — To the Sky : generateur du datapack de worldgen des Lucky Blocks
 * =============================================================================
 *  Ecrit (ou reecrit) les 43 fichiers de kubejs/data/pixelgo_luckyblocks/ :
 *  les Lucky Blocks du mod `hainypixelmonluckyblocks` deviennent une decoration
 *  du terrain, donc ils sont deja en place avant que le joueur arrive.
 *
 *  UTILISATION
 *  -----------
 *      node tools/luckyblocks-worldgen.js
 *
 *  POUR CHANGER LE TAUX DE SPAWN, une seule ligne suffit : DENSITE ci-dessous.
 *  C'est le nombre de Lucky Blocks par chunk, tous tiers confondus. Les rapports
 *  de rarete entre tiers (PCT) ne bougent pas : seule la quantite change.
 *  Divise les trois valeurs par 2 pour deux fois moins de blocs, etc. Relance
 *  ensuite le script et redemarre le monde.
 *
 *  A NOTER : un datapack de worldgen ne s'applique QU'AUX CHUNKS NEUFS. Changer
 *  ces valeurs ne modifie pas les zones deja explorees.
 *
 *  Le pendant « temps reel » de ce datapack (pour les chunks deja generes et
 *  l'Overworld skyblock) est kubejs/server_scripts/pixelgo/60_lucky_blocks.js ;
 *  son propre taux se regle par le champ `chance` de chaque dimension.
 * ========================================================================== */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'kubejs', 'data', 'pixelgo_luckyblocks')
const NS = 'pixelgo_luckyblocks'
const MOD = 'hainypixelmonluckyblocks'

/* Densite totale visee, en Lucky Blocks par chunk (tous tiers confondus).
   C'EST LE REGLAGE DU TAUX DE SPAWN. */
const DENSITE = {
  overworld: 0.07,  // 1 bloc tous les ~14 chunks
  nether: 0.13,     // 1 bloc tous les ~8 chunks
  the_end: 0.08     // 1 bloc tous les ~13 chunks
}

/* Repartition des tiers, en pourcentages. Identique a celle du script
   60_lucky_blocks.js : le Nether tire bien plus souvent les tiers forts. */
const PCT = {
  overworld: { common: 49.95, item: 22.00, rare: 15.00, master: 6.00, alternate_form: 2.50, boss: 2.50, shiny: 1.20, legendary: 0.60, jackpot: 0.20, super_jackpot: 0.05 },
  nether:    { common: 28.50, item: 13.00, rare: 19.00, master: 15.00, alternate_form: 6.50, boss: 8.50, shiny: 5.25, legendary: 3.00, jackpot: 1.00, super_jackpot: 0.25 },
  the_end:   { common: 40.50, item: 16.50, rare: 17.00, master: 10.50, alternate_form: 4.50, boss: 5.25, shiny: 3.25, legendary: 1.80, jackpot: 0.55, super_jackpot: 0.15 }
}

const TIERS = [
  'common_lucky_block', 'item_lucky_block', 'rare_lucky_block', 'master_lucky_block',
  'alternate_form_lucky_block', 'boss_lucky_block', 'shiny_lucky_block',
  'legendary_lucky_block', 'jackpot_lucky_block', 'super_jackpot_lucky_block'
]

const BIOMES = {
  overworld: '#minecraft:is_overworld',
  nether: '#minecraft:is_nether',
  the_end: '#minecraft:is_end'
}

function ecrire(rel, obj) {
  const p = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n')
}

/* --- configured_feature : un simple_block par tier ---------------------- */
for (const tier of TIERS) {
  ecrire('worldgen/configured_feature/' + tier + '.json', {
    type: 'minecraft:simple_block',
    config: {
      to_place: {
        type: 'minecraft:simple_state_provider',
        state: { Name: MOD + ':' + tier }
      }
    }
  })
}

/* --- placed_feature : un par tier et par dimension ---------------------- */
const rarete = {}

for (const dim of Object.keys(PCT)) {
  rarete[dim] = {}

  for (const tier of TIERS) {
    const cle = tier.replace('_lucky_block', '')
    const densiteTier = DENSITE[dim] * (PCT[dim][cle] / 100)
    const chance = Math.max(1, Math.round(1 / densiteTier))
    rarete[dim][tier] = chance

    let placement

    if (dim === 'nether') {
      /* Pas de heightmap exploitable sous le plafond de bedrock : on part
         d'une altitude au hasard et on descend jusqu'a trouver
         « de l'air pose sur un bloc solide ». */
      placement = [
        { type: 'minecraft:rarity_filter', chance: chance },
        { type: 'minecraft:in_square' },
        {
          type: 'minecraft:height_range',
          height: {
            type: 'minecraft:uniform',
            min_inclusive: { above_bottom: 8 },
            max_inclusive: { below_top: 12 }
          }
        },
        {
          type: 'minecraft:environment_scan',
          direction_of_search: 'down',
          max_steps: 24,
          allowed_search_condition: { type: 'minecraft:true' },
          target_condition: {
            type: 'minecraft:all_of',
            predicates: [
              { type: 'minecraft:matching_blocks', blocks: ['minecraft:air'] },
              { type: 'minecraft:solid', offset: [0, -1, 0] }
            ]
          }
        },
        { type: 'minecraft:biome' }
      ]
    } else {
      /* Surface classique : on vise le dessus du terrain, puis on verifie que
         la case est vide et que le bloc dessous est solide (ce qui ecarte
         l'eau, la lave et le vide de l'End). */
      placement = [
        { type: 'minecraft:rarity_filter', chance: chance },
        { type: 'minecraft:in_square' },
        { type: 'minecraft:heightmap', heightmap: 'MOTION_BLOCKING_NO_LEAVES' },
        {
          type: 'minecraft:block_predicate_filter',
          predicate: {
            type: 'minecraft:all_of',
            predicates: [
              { type: 'minecraft:matching_blocks', blocks: ['minecraft:air'] },
              { type: 'minecraft:solid', offset: [0, -1, 0] }
            ]
          }
        },
        { type: 'minecraft:biome' }
      ]
    }

    ecrire('worldgen/placed_feature/' + dim + '/' + tier + '.json', {
      feature: NS + ':' + tier,
      placement: placement
    })
  }
}

/* --- biome_modifier : un par dimension ---------------------------------- */
for (const dim of Object.keys(PCT)) {
  ecrire('neoforge/biome_modifier/' + dim + '.json', {
    type: 'neoforge:add_features',
    biomes: BIOMES[dim],
    step: 'vegetal_decoration',
    features: TIERS.map(t => NS + ':' + dim + '/' + t)
  })
}

/* --- recapitulatif ------------------------------------------------------ */
console.log('Fichiers ecrits sous kubejs/data/' + NS + '/\n')
console.log('Rarete (1 bloc sur N chunks) :\n')
console.log('Tier'.padEnd(26) + 'Overworld'.padStart(10) + 'Nether'.padStart(10) + 'End'.padStart(10))

for (const tier of TIERS) {
  console.log(
    tier.replace('_lucky_block', '').padEnd(26) +
    String('1/' + rarete.overworld[tier]).padStart(10) +
    String('1/' + rarete.nether[tier]).padStart(10) +
    String('1/' + rarete.the_end[tier]).padStart(10)
  )
}

console.log('')

for (const dim of Object.keys(PCT)) {
  const reelle = TIERS.reduce((a, t) => a + 1 / rarete[dim][t], 0)
  console.log(
    dim.padEnd(12) + ' densite reelle = ' + reelle.toFixed(3) +
    ' bloc/chunk (1 bloc tous les ' + (1 / reelle).toFixed(1) + ' chunks)'
  )
}
