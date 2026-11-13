// priority: 95
/* =============================================================================
 *  PixelGO — To the Sky : POKÉ BALLS
 * =============================================================================
 *  LES RECETTES DE BALL SONT CELLES D'ORIGINE (2026-11-07)
 *  -------------------------------------------------------
 *  La chaîne Mekanism (couvercles à la Chambre de Réaction sous pression,
 *  pigments, assemblage avec items enchantés + filet, Combinateur, balls
 *  directes Dream / Cherish / Beast / Origin) a été retirée à la demande.
 *  Les recettes des mods sont de nouveau actives, sans aucune retouche :
 *
 *    - Pixelmon      : couvercle = 3 abricots cuits (établi), ball = couvercle
 *                      + bouton en pierre + socle (établi, sans forme) ;
 *                      Dream Ball à l'infuseur (Dusk Ball + 2 baies Maron).
 *    - PixelGO - Ball (pixelballs) : ses 22 couvercles et 22 balls.
 *
 *  Cherish, Beast et Origin n'ont pas de recette d'origine : elles ne
 *  s'obtiennent que par le loot.
 *  Park Ball : toujours retirée (00_removals.js), comme en 1.16.5.
 *
 *  Sauvegarde de l'ancienne chaîne : backups/pokeballs-original-2026-11-07/.
 *
 *  Ce fichier garde le livre Catch Rate, qui n'est pas une recette de ball,
 *  et la Master Ball (2026-11-08) : une de chaque ball fabricable, en bas.
 *  Couvercle Shiny : lingots d'or -> blocs d'or, par surcharge de données
 *  (kubejs/data/pixelmon/recipe/pokeball/pixel_lid/shiny_ball_lid.json).
 * ========================================================================== */

ServerEvents.recipes(event => {
  const ACIER = { item: 'mekanism:ingot_steel' }
  const ITEM = id => ({ item: id })
  const ENCH = name => ({ item: `pixelgo_minions:${name}` })
  const CIRCUIT = tier => ({ item: `mekanism:${tier}_control_circuit` })

  /* =========================================================================
   *  LIVRE ENCHANTÉ « CATCH RATE » (mod pixelgo)
   * -------------------------------------------------------------------------
   *  `pixelgo:catch_rate` monte jusqu'au niveau V et ne s'applique qu'aux
   *  items du tag `pixelgo:poke_balls`.
   *
   *  IL NE SORT D'AUCUNE MACHINE, ET CE N'EST PAS UN CHOIX ESTHÉTIQUE.
   *  Depuis la 1.21, les enchantements vivent dans un registre de datapack. Un
   *  sérialiseur de recette sans accès aux registres ne peut donc pas encoder
   *  un livre enchanté, et le paquet `update_recipes` entier échoue : tout le
   *  monde est éjecté à la connexion. C'est ce qui s'est passé avec Industrial
   *  Foregoing (`Titanium.CodecRecipeSerializer` ->
   *  `FriendlyByteBuf.writeJsonWithCodec`), et c'est le même défaut que
   *  `ShopItem.encode` de Pixelmon, qui interdit de vendre un livre enchanté.
   *
   *  La TABLE ÉTENDUE, elle, a un vrai `StreamCodec<RegistryFriendlyByteBuf,
   *  …>` (vérifié dans `ShapedTableRecipe$Serializer`) : c'est là que vivent
   *  déjà les 11 livres des Minions. Les ingrédients, eux, restent Mekanism.
   *
   *  Les niveaux II et IV s'obtiennent à l'enclume, comme tout enchantement.
   * ====================================================================== */
  const LIVRE = { item: 'minecraft:book' }

  const catchBook = (level, pattern, key) =>
    event.custom({
      type: 'extendedcrafting:shaped_table',
      pattern: pattern,
      key: key,
      result: {
        id: 'minecraft:enchanted_book',
        count: 1,
        components: {
          'minecraft:stored_enchantments': { levels: { 'pixelgo:catch_rate': level } }
        }
      }
    }).id(`kubejs:pokeball/catch_rate_${level}`)

  /* --- Niveau I : table AVANCÉE 5x5 --------------------------------------
   *  2 circuits basiques, 6 lingots d'acier, 2 redstones enchantées,
   *  2 lapis enchantés, 1 livre. */
  catchBook(1, [
    '  C  ',
    ' PRP ',
    'PLBLP',
    ' PRP ',
    '  C  '
  ], {
    C: CIRCUIT('basic'),
    P: ACIER,
    R: ENCH('enchanted_redstone_dust'),
    L: ENCH('enchanted_lapis_lazuli'),
    B: LIVRE
  })

  /* --- Niveau III : table ÉLITE 7x7 --------------------------------------
   *  12 alliages infusés, 16 lingots d'acier, 4 lapis enchantés,
   *  2 circuits avancés, 2 diamants enchantés, 1 livre. */
  catchBook(3, [
    '  SSS  ',
    ' PPPPP ',
    'SPLCLPS',
    'SPDBDPS',
    'SPLCLPS',
    ' PPPPP ',
    '  SSS  '
  ], {
    S: ITEM('mekanism:alloy_infused'),
    P: ACIER,
    L: ENCH('enchanted_lapis_lazuli'),
    C: CIRCUIT('advanced'),
    D: ENCH('enchanted_diamond'),
    B: LIVRE
  })

  /* --- Niveau V : table ÉLITE 7x7 ----------------------------------------
   *  4 circuits ultimes, 4 mithrils enchantés, 8 diamants enchantés,
   *  12 lingots d'acier, 4 alliages atomiques, 4 lingots d'obsidienne raffinée. */
  catchBook(5, [
    '  MFM  ',
    ' SPPPS ',
    'DPDCDPD',
    'FPCBCPF',
    'DPDCDPD',
    ' SPPPS ',
    '  MFM  '
  ], {
    M: ENCH('enchanted_mithril'),
    F: CIRCUIT('ultimate'),
    S: ITEM('mekanism:alloy_atomic'),
    P: ACIER,
    D: ENCH('enchanted_diamond'),
    C: ITEM('mekanism:ingot_refined_obsidian'),
    B: LIVRE
  })

  /* =========================================================================
   *  MASTER BALL (2026-11-08, à la demande)
   * -------------------------------------------------------------------------
   *  La Master Ball n'a pas de couvercle ni de recette d'origine : elle ne
   *  venait que du butin. Or elle entre dans les bouchons d'argent et d'or,
   *  l'armure en gemme et le ticket SSR. Elle se fabrique désormais en TABLE
   *  ULTIME (9x9, sans forme) à partir d'UNE de CHAQUE ball fabricable :
   *  les 54 balls qui ont une recette active (Pixelmon, Hisui, PixelGO - Ball,
   *  Dream Ball à l'infuseur). Pas les balls sans recette (Cherish, Beast,
   *  Origin, Park, GS, Strange, Christmas) ni la Master Ball elle-même.
   *
   *  Si un mod ajoute une ball fabricable, l'ajouter ici (81 cases au plus).
   * ====================================================================== */
  const MASTER_BALL_INPUTS = [
    // Pixelmon
    'poke_ball', 'great_ball', 'ultra_ball', 'premier_ball', 'heal_ball',
    'net_ball', 'dive_ball', 'nest_ball', 'dusk_ball', 'quick_ball',
    'timer_ball', 'repeat_ball', 'luxury_ball', 'level_ball', 'lure_ball',
    'moon_ball', 'friend_ball', 'love_ball', 'heavy_ball', 'fast_ball',
    'sport_ball', 'safari_ball', 'dream_ball',
    // Hisui
    'ancient_poke_ball', 'ancient_great_ball', 'ancient_ultra_ball',
    'ancient_heavy_ball', 'leaden_ball', 'gigaton_ball', 'feather_ball',
    'wing_ball', 'jet_ball',
    // PixelGO - Ball
    'ev_hp_ball', 'ev_atk_ball', 'ev_def_ball', 'ev_spatk_ball', 'ev_spdef_ball', 'ev_spd_ball',
    'iv_hp_ball', 'iv_atk_ball', 'iv_def_ball', 'iv_spatk_ball', 'iv_spdef_ball', 'iv_spd_ball',
    'iv_all_ball', 'exp_xs_ball', 'exp_s_ball', 'exp_m_ball', 'exp_l_ball', 'exp_xl_ball',
    'shiny_ball', 'skin_ball', 'random_ball', 'boss_ball'
  ]
  event.custom({
    type: 'extendedcrafting:shapeless_table',
    tier: 4,
    ingredients: MASTER_BALL_INPUTS.map(name => PIXELGO_BALL_ING(name)),
    result: PIXELGO_BALL_RESULT('master_ball', 1)
  }).id('kubejs:pokeball/master_ball')
})
