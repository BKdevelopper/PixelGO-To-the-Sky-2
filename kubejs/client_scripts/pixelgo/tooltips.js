// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : infobulles
 * =============================================================================
 *  Portage de kubejs/client_scripts/tooltips.js (KubeJS 1605 / 1.16.5).
 *
 *  API : onEvent('item.tooltip', …)  ->  ItemEvents.modifyTooltips(…)
 *
 *  LANGUE : le pack tourne en `en_us` (options.txt) et l'intégralité du livre
 *  de quêtes est en anglais. Ces infobulles étaient restées en français au
 *  portage : elles sont repassées en anglais pour que tout ce que lit le
 *  joueur soit dans la même langue.
 *
 *  Entrées retirées (mods absents en 1.21.1) :
 *    compressium:*        (aucun mod de compression de blocs équivalent)
 *    pokehaancraftadd:*   (Pokéhaan Craft Additions)
 *    ftb-power-pots:*     -> powerpots:power_pot_1..3
 *    cobblefordays:*      -> havencobblegens:*_cobble_gen
 * ========================================================================== */

ItemEvents.modifyTooltips(event => {
  /* --- Objets PixelGO --------------------------------------------------- */
  // NB : ces infobulles étaient posées par `.tooltip(...)` dans
  // startup_scripts/main.js, méthode qui n'existe plus sur ItemBuilder en
  // KubeJS 2101. Elles sont donc regroupées ici.
  event.add('kubejs:random_egg', '§7Hatches into a random Pokémon egg')
  event.add('kubejs:ssr_ticket', '§7Summons a legendary — §b4%§7 shiny chance')
  event.add('kubejs:mega_key', '§7Summons a random Mega Pokémon')
  // Les boîtes mystères sont passées sous Treasure Bags : le mod pose déjà
  // sa propre info-bulle (type, groupe, table de butin), inutile d'en ajouter.
  event.add('treasurebags:treasure_bag', '§7Right-click to open')

  /* --- Certificat de récolte : le mur entre l'étape 2 et l'étape 3 ------ */
  event.add('kubejs:harvest_certificate', [
    '§7§oProof that your field can feed a machine.§r',
    '§8',
    '§6§lCost§r',
    '§78 Enchanted Hay Bales + 1 enchanted crop',
    '§8≈ 11 680 units of crop',
    '§8',
    '§6§lUnlocks§r',
    '§7· §fIron§7, §fGolden§7 and §fDiamond Mesh',
    '§7· §fFlower Pots§7 — and every §aBotany Pot',
    '§7· §fCobblestone Generator§7, §fItem Collector§7, §fBackpack'    
  ])

  /* --- Steak infini ------------------------------------------------------ */
  event.add('kubejs:infinite_steak', [
    '§7Eat it as often as you like:',
    '§7it feeds you like a steak and is §anever used up§7.'
  ])

  /* --- Essence d'Aura et formes compactées ------------------------------ */
  event.add('kubejs:aura_essence', [
    '§7Condensed inside the Rifts.',
    '§7Required for end-game upgrades and crafts.',
    '§8Cannot be bought or sold.'
  ])
  event.add('kubejs:condensed_aura', [
    '§7Worth 9 Aura Essences.',
    '§8Cannot be bought or sold.'
  ])
  event.add('kubejs:aura_core', [
    '§7Worth 81 Aura Essences.',
    '§7The heart of end-game crafting.',
    '§8Cannot be bought or sold.'
  ])

  // Tickets : IV minimum et chance de shiny, alignés sur 50_interactions.js.
  const TICKET_TIERS = [
    { id: 'light_gray', ivs: 0, shiny: 0 }, { id: 'gray', ivs: 6, shiny: 1 },
    { id: 'red', ivs: 12, shiny: 2 }, { id: 'magenta', ivs: 18, shiny: 3 },
    { id: 'pink', ivs: 24, shiny: 4 }, { id: 'purple', ivs: 30, shiny: 5 },
    { id: 'blue', ivs: 36, shiny: 6 }, { id: 'cyan', ivs: 42, shiny: 7 },
    { id: 'light_blue', ivs: 48, shiny: 8 }, { id: 'green', ivs: 54, shiny: 9 },
    { id: 'lime', ivs: 60, shiny: 10 }, { id: 'yellow', ivs: 66, shiny: 11 },
    { id: 'orange', ivs: 72, shiny: 12 }, { id: 'brown', ivs: 78, shiny: 13 },
    { id: 'white', ivs: 84, shiny: 14 }, { id: 'black', ivs: 90, shiny: 15 },
    { id: 'rainbow', ivs: 100, shiny: 20 }
  ]
  TICKET_TIERS.forEach(t => {
    event.add(`kubejs:${t.id}_ticket`,
      `§7Minimum IV §c${t.ivs}%§7 §5| §7Shiny chance §c${t.shiny}%`)
  })

  /* --- Pixelmon --------------------------------------------------------- */
  event.add('pixelmon:holo_caster',
    "§7Right-click: prints the Pokémon's stats in chat")

  /* --- Pots de culture (valeurs de config/PowerPots.json) ---------------- */
  event.add('powerpots:power_pot_1', '§7Speed x2 · Yield x1')
  event.add('powerpots:power_pot_2', '§7Speed x3 · Yield x1.5')
  event.add('powerpots:power_pot_3', '§7Speed x4 · Yield x2')

  /* --- Générateurs de pierre (remplace Cobble For Days) ----------------- */
  event.add('havencobblegens:wooden_cobble_gen', '§7Generates cobblestone slowly')
  event.add('havencobblegens:stone_cobble_gen', '§7Generates cobblestone')
  event.add('havencobblegens:iron_cobble_gen', '§7Generates cobblestone quickly')
  event.add('havencobblegens:gold_cobble_gen', '§7Generates cobblestone very quickly')
  event.add('havencobblegens:diamond_cobble_gen', '§7Almost instant generation')
  event.add('havencobblegens:emerald_cobble_gen', '§7Instant generation')
  event.add('havencobblegens:netherite_cobble_gen', '§7Instant generation, in bulk')

  /* --- Nourriture : effets ajoutés par le pack --------------------------- */
  event.add('minecraft:cake', '§7Speed II')
  event.add('minecraft:mushroom_stew', '§7Regeneration II')
  event.add('minecraft:rabbit_stew', '§7Jump Boost II')
  event.add('minecraft:beetroot_soup', '§7Health Boost')
  event.add('minecraft:cookie', '§7Speed')
  event.add('minecraft:pumpkin_pie', '§7Haste')
  event.add('minecraft:pufferfish', '§7Water Breathing')
  event.add('minecraft:honey_bottle', '§7Instant Health')
  event.add('minecraft:dried_kelp', '§7Clears Blindness, Nausea and Poison')

  /* --- Disques musicaux personnalisés ------------------------------------ */
  const DISCS = {
    music_disc_strad: 'Unravel — Tokyo Ghoul OP (piano)',
    music_disc_stal: 'Pokémon Theme (piano)',
    music_disc_mellohi: 'Pokémon HGSS — Champion Red Battle',
    music_disc_mall: 'Pokémon Red/Blue — Pewter City',
    music_disc_far: 'Pikachu Thunderbolt (remix)',
    music_disc_chirp: 'Parasyte — Next to You',
    music_disc_blocks: 'Genjutsu Beats — Santa Drill',
    music_disc_cat: 'Pallet Town',
    music_disc_13: 'Genjutsu Beats — Drill Potter',
    music_disc_pigstep: 'Pokémon Red/Blue — Trap remix',
    music_disc_wait: "Who's that Pokémon? It's Pikachu!",
    music_disc_11: 'Dragonborn',
    music_disc_ward: 'Nanoka Hara — Suzume'
  }
  Object.keys(DISCS).forEach(d => event.add(`minecraft:${d}`, `§9♪ ${DISCS[d]}`))

  /* --- Refined Storage : rappel du système de teinture ------------------- */
  ;['grid', 'crafting_grid', 'pattern_grid', 'controller', 'relay',
    'autocrafter', 'autocrafter_manager', 'autocrafting_monitor',
    'security_manager', 'network_receiver', 'network_transmitter',
    'disk_interface', 'detector', 'wireless_transmitter'
  ].forEach(id => {
    event.add(`refinedstorage:${id}`,
      '§8Hover and press §7U§8 to see the dyeing recipes')
  })
  // Waystones 21.1 n'enregistre PAS de `waystones:sharestone` générique : seules
  // 15 déclinaisons colorées existent (pas de blanche). Le `sharestone.json` du
  // jar n'est qu'un modèle de base, sans item derrière — le référencer faisait
  // planter ce script au chargement.
  ;['black', 'blue', 'brown', 'cyan', 'gray', 'green', 'light_blue',
    'light_gray', 'lime', 'magenta', 'orange', 'pink', 'purple', 'red', 'yellow'
  ].forEach(c => {
    event.add(`waystones:${c}_sharestone`,
      '§8Hover and press §7U§8 to see the dyeing recipes')
  })
})
