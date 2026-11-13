// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : recettes Pixelmon
 * =============================================================================
 *  Portage de kubejs/server_scripts/pixelmon/*.js (KubeJS 1605 / 1.16.5).
 *
 *  LES POKÉ BALLS NE SONT PAS ICI
 *  -------------------------------
 *  Balls et couvercles utilisent les recettes d'origine de Pixelmon et du
 *  mod PixelGO - Ball (depuis 2026-11-07). Le livre Catch Rate est dans
 *  25_pokeballs.js. Les helpers d'ingrédient à composants
 *  PIXELGO_BALL_ING / PIXELGO_LID_ING restent dans 05_lib.js.
 * ========================================================================== */

ServerEvents.recipes(event => {
  /* =========================================================================
   *  1. POKÉ BALLS — recettes d'origine des mods, rien à faire ici.
   * ====================================================================== */

  /* =========================================================================
   *  2. PLAQUES D'ARCEUS — 9 gemmes du type correspondant.
   * ====================================================================== */
  const PLATE_BY_GEM = {
    dragon: 'draco', water: 'splash', ground: 'earth', rock: 'stone',
    poison: 'toxic', psychic: 'mind', fire: 'flame', electric: 'zap',
    bug: 'insect', grass: 'meadow', ghost: 'spooky', ice: 'icicle',
    fighting: 'fist', steel: 'iron', flying: 'sky', dark: 'dread',
    fairy: 'pixie'
  }
  Object.keys(PLATE_BY_GEM).forEach(gem => {
    event.shaped(`pixelmon:${PLATE_BY_GEM[gem]}_plate`, ['111', '111', '111'], {
      1: `pixelmon:${gem}_gem`
    })
  })

  /* =========================================================================
   *  3. BONBONS EXP & CHARMES
   * ====================================================================== */
  event.shaped('pixelmon:s_exp_candy', ['111', '1 1', '111'], { 1: 'pixelmon:xs_exp_candy' })
  event.shaped('pixelmon:m_exp_candy', ['222', '111', '111'], {
    1: 'pixelmon:xs_exp_candy',
    2: 'pixelmon:s_exp_candy'
  })
  event.shaped('pixelmon:l_exp_candy', ['   ', '222', '313'], {
    1: 'pixelmon:s_exp_candy',
    2: 'pixelmon:m_exp_candy',
    3: 'pixelmon:xs_exp_candy'
  })
  event.shaped('pixelmon:xl_exp_candy', ['111'], { 1: 'pixelmon:l_exp_candy' })

  event.shaped('pixelmon:exp_charm', ['222', '212', '222'], {
    1: 'pixelmon:xl_exp_candy',
    2: 'pixelmon:exp_all'
  })

  // Charme chromatique : 8 leurres faibles + 1 leurre puissant.
  // Les leurres sont des items à durabilité : on accepte n'importe quel état.
  event.shaped('pixelmon:shiny_charm', ['111', '121', '111'], {
    1: 'pixelmon:lure_shiny_weak',
    2: 'pixelmon:lure_shiny_strong'
  })

  /* =========================================================================
   *  4. OBJETS D'ENTRAÎNEMENT (Power items) — anneau de fer ProjectE au centre.
   * ====================================================================== */
  const POWER_ITEMS = {
    power_lens: 'pink', power_anklet: 'blue', power_bracer: 'red',
    power_band: 'yellow', power_weight: 'green', power_belt: 'white'
  }
  Object.keys(POWER_ITEMS).forEach(item => {
    event.shaped(`pixelmon:${item}`, ['111', '121', '111'], {
      1: `pixelmon:${POWER_ITEMS[item]}_apricorn`,
      2: 'projecte:iron_band'
    })
  })

  /* =========================================================================
   *  5. BLOCS & MACHINES PIXELMON
   * ====================================================================== */
  event.shaped('pixelmon:fossil', ['222', '212', '222'], {
    1: 'minecraft:diamond',
    2: 'minecraft:coal_block'
  })

  // Plaque de mouvement : l'aluminium vient maintenant de Pixelmon lui-même
  // (emendatusenigmatica:aluminum_ingot n'existe plus, EE n'a aucun matériau).
  event.shaped('pixelmon:movement_plate', ['121', '232', '121'], {
    1: 'minecraft:redstone',
    2: 'pixelmon:aluminum_ingot',
    3: 'minecraft:slime_ball'
  })

  // Plaque d'aluminium : Pixelmon 9.4.1 n'a plus d'enclume, la plaque n'avait
  // donc aucune source (elle entre dans le PokéNav de PixelNav). Un lingot
  // battu au marteau : n'importe quel `#minecraft:hammers` (Pixelmon, Ex
  // Deorum, Ex Compressum), qui perd 1 point de durabilité et reste dans la
  // grille.
  event.shapeless('pixelmon:aluminum_plate', [
    'pixelmon:aluminum_ingot',
    '#minecraft:hammers'
  ]).damageIngredient('#minecraft:hammers').id('kubejs:aluminum_plate')

  event.shaped('pixelmon:key_stone', ['111', '121', '111'], {
    1: 'ironfurnaces:rainbow_plating',
    2: 'projecte:klein_star_omega'
  })

  // Remplace `compressium:lapis_2` (81 blocs de lapis) : le bloc d'insanium
  // représente un palier de grind comparable dans la version 1.21.1.
  event.shaped('pixelmon:ultra_deep_stone', ['111', '121', '111'], {
    1: 'minecraft:lapis_block',
    2: 'mysticalagradditions:insanium_block'
  })

  event.shaped('pixelmon:trade_holder_left', ['   ', '112', ' 11'], {
    1: 'pixelmon:aluminum_ingot',
    2: 'pixelmon:poke_ball'
  })
  event.shaped('pixelmon:trade_holder_right', ['   ', '211', '11 '], {
    1: 'pixelmon:aluminum_ingot',
    2: 'pixelmon:poke_ball'
  })

  event.shaped('pixelmon:poke_display', ['215', '414', '333'], {
    1: 'pixelmon:silver_ingot',
    2: 'pixelmon:poke_ball',
    3: 'minecraft:smooth_stone_slab',
    4: 'minecraft:redstone',
    5: 'minecraft:lead'
  })

  event.shaped('pixelmongo:incubator', ['222', '131', '222'], {
    1: 'minecraft:glass',
    2: 'minecraft:quartz_slab',
    3: 'minecraft:egg'
  })

  /* --- Sacs à Pokémon, une couleur = un colorant ------------------------ */
  ;['black', 'blue', 'yellow', 'lime', 'green', 'gray', 'pink', 'purple',
    'orange', 'magenta', 'light_gray', 'light_blue', 'cyan', 'brown'
  ].forEach(color => {
    event.shaped(`pixelmon:${color}_poke_bag`, ['343', '131', '333'], {
      1: 'minecraft:string',
      3: 'minecraft:leather',
      4: `minecraft:${color}_dye`
    })
  })

  /* =========================================================================
   *  6. POKÉSTOPS — chaîne en table étendue (tier 3, grille 7x7)
   * ====================================================================== */
  // Ingrédient « singularité X » — défini dans 05_lib.js.
  const singIng = PIXELGO_SING_ING

  const pokestopFrame = (concrete, core, ring, result) =>
    event.custom({
      type: 'extendedcrafting:shaped_table',
      tier: 3,
      pattern: [
        'AAAAAAA',
        'ACCCCCA',
        'ACDDDCA',
        'ACDBDCA',
        'ACDDDCA',
        'ACCCCCA',
        'AAAAAAA'
      ],
      key: {
        A: { item: concrete },
        B: { item: core },
        C: { item: 'mysticalagradditions:insanium_block' },
        D: ring
      },
      result: { id: result, count: 1 }
    })

  pokestopFrame('minecraft:blue_concrete', 'pixelmongo:pokestop',
    singIng('nether_star'), 'pixelmon:common_pokestop')

  pokestopFrame('minecraft:green_concrete', 'pixelmon:common_pokestop',
    singIng('master_ball'), 'pixelmon:rare_pokestop')

  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 3,
    pattern: [
      'AAAAAAA',
      'ACCCCCA',
      'ACDDDCA',
      'ACDBDCA',
      'ACDDDCA',
      'ACCCCCA',
      'AAAAAAA'
    ],
    key: {
      A: { item: 'mysticalagradditions:insanium_coal_block' },
      B: { item: 'pixelmon:rare_pokestop' },
      C: { item: 'projecte:dark_matter_block' },
      D: { item: 'extendedcrafting:the_ultimate_catalyst' }
    },
    result: { id: 'pixelmon:legendary_pokestop', count: 1 }
  })

  // Pokéstop PixelmonGo (le premier de la chaîne).
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 3,
    pattern: [
      'AAAAAAA',
      'ACCCCCA',
      'ACDDDCA',
      'ACDBDCA',
      'ACDDDCA',
      'ACCCCCA',
      'AAAAAAA'
    ],
    key: {
      A: { item: 'minecraft:blue_concrete' },
      B: { item: 'projecte:red_matter_block' }, // ex-projectexpansion:blue_matter
      C: { item: 'mysticalagradditions:insanium_block' },
      D: { item: 'minecraft:nether_star' }
    },
    result: { id: 'pixelmongo:pokestop', count: 1 }
  })

  /* =========================================================================
   *  7. EXP ALL — table étendue tier 2
   * ====================================================================== */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 2,
    pattern: ['A A A', ' CBC ', ' BAB ', ' CBC ', 'B   B'],
    key: {
      A: { item: 'minecraft:emerald_block' },
      B: { item: 'minecraft:coal_block' },
      C: { item: 'mysticalagriculture:prosperity_ingot_block' }
    },
    result: { id: 'pixelmon:exp_all', count: 1 }
  })

  /* =========================================================================
   *  8. BOUCHONS DE BOUTEILLE — plus de recette (2026-11-09) :
   *  Silver / Gold Bottle Cap uniquement en loot, boutique et quêtes.
   * ====================================================================== */

  /* =========================================================================
   *  9. TICKETS & ŒUFS — infusion Mystical Agriculture
   * ====================================================================== */
  const rep = (obj, n) => {
    const out = []
    for (let i = 0; i < n; i++) out.push(obj)
    return out
  }

  // Ticket SSR : 4 étoiles de Klein Omega + 4 tickets d'invocation.
  // (Ex-collecteurs comprimés « fading » de Project Expansion, retiré 2026-11-08.)
  event.custom({
    type: 'mysticalagriculture:infusion',
    input: PIXELGO_BALL_ING('master_ball'),
    ingredients: [
      { item: 'projecte:klein_star_omega' }, { tag: 'c:summon_tickets' },
      { item: 'projecte:klein_star_omega' }, { tag: 'c:summon_tickets' },
      { item: 'projecte:klein_star_omega' }, { tag: 'c:summon_tickets' },
      { item: 'projecte:klein_star_omega' }, { tag: 'c:summon_tickets' }
    ],
    result: { id: 'kubejs:ssr_ticket' }
  })

  // Œuf mystère : 8 essences fertilisées autour d'un œuf.
  event.custom({
    type: 'mysticalagriculture:infusion',
    input: { item: 'minecraft:egg' },
    ingredients: rep({ item: 'mysticalagriculture:fertilized_essence' }, 8),
    result: { id: 'kubejs:random_egg' }
  })

  // Clé Méga.
  event.shaped('kubejs:mega_key', ['  1', ' 2 ', '2  '], {
    1: 'pixelmon:key_stone',
    2: 'minecraft:stick'
  })
  event.shaped('pixelmon:key_stone', ['111', '121', '111'], {
    1: 'kubejs:random_egg',
    2: '#c:summon_tickets'
  })

  /* -------------------------------------------------------------------------
   *  Montée de palier des tickets et fabrication des œufs PixelmonGo.
   *
   *  `pixelmongo:egg` stocke désormais ses données dans le composant
   *  `pixelmongo:egg_data` (record : key / distance / hatching / pos_*),
   *  au lieu du NBT `{"pixelmongo:key": "..."}` de la 1.16.5.
   *  Les noms d'œufs correspondent à config/pixelmongo/eggs.json.
   * ---------------------------------------------------------------------- */
  /* Catalyseur de chaque palier : un objet ProjectE, du moins cher au plus
   * cher (coût approximatif en carburant aeternalis entre parenthèses).
   * Avant le 2026-11-08 c'étaient les 16 collecteurs de Project Expansion,
   * retiré du pack ; aucun de ces objets ne génère d'EMC.               */
  const TICKET_UPGRADES = [
    { id: 'gray', label: 'Gray', mk: 1, catalyst: 'projecte:alchemical_coal_block' }, // (~0,5)
    { id: 'red', label: 'Red', mk: 2, catalyst: 'projecte:mobius_fuel_block' }, // (2)
    { id: 'magenta', label: 'Magenta', mk: 3, catalyst: 'projecte:klein_star_ein' }, // (2)
    { id: 'pink', label: 'Pink', mk: 4, catalyst: 'projecte:dark_matter' }, // (8)
    { id: 'purple', label: 'Purple', mk: 5, catalyst: 'projecte:klein_star_zwei' }, // (8)
    { id: 'blue', label: 'Blue', mk: 6, catalyst: 'projecte:aeternalis_fuel_block' }, // (9)
    { id: 'cyan', label: 'Cyan', mk: 7, catalyst: 'projecte:red_matter' }, // (30)
    { id: 'light_blue', label: 'Light Blue', mk: 8, catalyst: 'projecte:klein_star_drei' }, // (32)
    { id: 'green', label: 'Green', mk: 9, catalyst: 'projecte:dark_matter_block' }, // (72)
    { id: 'lime', label: 'Lime', mk: 10, catalyst: 'projecte:klein_star_vier' }, // (128)
    { id: 'yellow', label: 'Yellow', mk: 11, catalyst: 'projecte:red_matter_block' }, // (270)
    { id: 'orange', label: 'Orange', mk: 12, catalyst: 'projecte:dm_pedestal' }, // (480)
    { id: 'brown', label: 'Brown', mk: 13, catalyst: 'projecte:klein_star_sphere' }, // (512)
    { id: 'white', label: 'White', mk: 14, catalyst: 'projecte:condenser_mk2' }, // (~1 370)
    { id: 'black', label: 'Black', mk: 15, catalyst: 'projecte:rm_furnace' }, // (~1 390)
    { id: 'rainbow', label: 'Ultimate', mk: 16, catalyst: 'projecte:klein_star_omega' } // (2 048)
  ]

  /* Œuf PixelmonGo d'un palier donné.
   *
   * `Item.of('id', '{…}')` ne convient PAS : en KubeJS 2101 les surcharges sont
   * of(stack), of(stack, DataComponentMap), of(stack, int) et
   * of(stack, int, DataComponentMap) — Rhino choisissait `int` et échouait
   * avec « Cannot convert {…} to int ». On écrit donc le résultat en JSON brut,
   * comme pour les Poké Balls plus haut.                                      */
  const oeuf = (label, mk, ingredients) =>
    event.custom({
      type: 'minecraft:crafting_shapeless',
      ingredients: ingredients,
      result: {
        id: 'pixelmongo:egg',
        count: 1,
        components: {
          'pixelmongo:egg_data': {
            key: `${label} Egg [MK ${mk}]`,
            distance: 5000.0
          }
        }
      }
    }).id(`kubejs:pixelmongo_egg/mk${mk}`)

  TICKET_UPGRADES.forEach(t => {
    // Ticket de base + catalyseur du palier -> ticket coloré.
    event.shapeless(`kubejs:${t.id}_ticket`, [
      'kubejs:light_gray_ticket',
      t.catalyst
    ])

    // Œuf PixelmonGo du même palier.
    oeuf(t.label, t.mk, [
      { item: 'kubejs:random_egg' },
      { item: t.catalyst }
    ])
  })

  // Œuf de base (MK 0) directement depuis l'œuf mystère.
  oeuf('Light Gray', 0, [
    { item: 'kubejs:random_egg' },
    { item: 'minecraft:gold_ingot' }
  ])

  /* =========================================================================
   *  10. OBJETS « PixelGO Items » — à usage unique sur un Pokémon.
   * -------------------------------------------------------------------------
   *  Remplace les anciens coupons `pixelmon:discount_coupon`, qui encodaient
   *  leur effet dans le niveau d'un `binding_curse` et leur nom dans un
   *  composant `custom_name`. Ces coupons ont été retirés du pack : le mod
   *  PixelGO Items fournit de vrais items, avec leur propre logique, leur
   *  texture et leur description.
   *
   *  Correspondances retenues :
   *    Skin-AR  -> pixelgoitems:skin_swapper   (skin alternatif aléatoire)
   *    Shiny-AR -> pixelgoitems:shiny_swapper  (bascule shiny)
   * ====================================================================== */
  const pixelgoItem = (result, ticket) =>
    event.custom({
      type: 'minecraft:crafting_shaped',
      pattern: [' 1 ', '121', ' 1 '],
      key: {
        1: ticket.startsWith('#') ? { tag: ticket.slice(1) } : { item: ticket },
        2: { item: 'minecraft:nether_star' }
      },
      result: { id: `pixelgoitems:${result}`, count: 1 }
    }).id(`kubejs:pixelgoitems/${result}`)

  pixelgoItem('skin_swapper', '#c:summon_tickets')
  pixelgoItem('shiny_swapper', 'kubejs:rainbow_ticket')
})
