// priority: 95
/* =============================================================================
 *  PixelGO — To the Sky : PÉAGES DE FERME
 * =============================================================================
 *  Ce fichier existe pour une seule raison : garantir que la trame principale
 *  se joue dans l'ordre, sans raccourci.
 *
 *      Étape 1 — farm manuel  : cultiver, vendre, encaisser.
 *      Étape 2 — rendement    : réinvestir (outils, enchantements, boutiques).
 *      Étape 3 — génération   : Ex Deorum (minerais) et Botany Pots.
 *      Étape 4 — accélération : Click Machine, collecteurs, sacs, Power Pots.
 *
 *  UN MUR, PUIS UN COÛT COURANT
 *  ----------------------------
 *  Les péages s'appuient sur les items « enchantés » de PixelGO Minions
 *  (recette `pixelgo_minions:enchanted` : 5 cases de 32 dans un établi
 *  ordinaire, soit 160 unités de la matière première). AUCUN marchand ne les
 *  vend : ils ne peuvent venir que de la récolte du joueur. Deux tags les
 *  regroupent (voir 40_tags.js) :
 *
 *      #pixelgo:farm_seal      160 unités d'une culture brute
 *                              (blé, carotte, pomme de terre, graines…)
 *
 *      #pixelgo:farm_harvest   1 440 unités, sous forme compactée
 *                              (ballot de foin, melon-bloc)
 *
 *  De là, deux objets de nature différente :
 *
 *      kubejs:harvest_certificate   LE MUR. 8 récoltes + 1 sceau, soit
 *      « Certificat de récolte »    11 680 unités de culture, ~15 h de ferme
 *                                   manuelle. NON CONSOMMÉ : c'est un
 *                                   laissez-passer, fabriqué une seule fois.
 *                                   Ouvre l'étape 3 (Ex Deorum, Botany Pots,
 *                                   générateurs) et les deux objets d'étape 4
 *                                   qui ne dépendent pas du minerai.
 *
 *      #pixelgo:farm_harvest        LE COÛT COURANT de l'étape 4, consommé,
 *                                   1 440 unités par accélérateur. Le reste
 *                                   de l'étape 4 vient forcément après le mur :
 *                                   fer, or, diamant, redstone et plastique
 *                                   passent tous par le maillage de fer.
 *
 *  PRIORITÉ 95
 *  -----------
 *  Inférieure à 100 : ce script passe donc APRÈS 10_minecraft / 30_tech, et
 *  peut retirer aussi bien les recettes des mods que celles du pack.
 *  Supérieure à 90 : 35_machines (replaceInput) travaille ensuite sur le
 *  résultat, comme avant.
 * ========================================================================== */

ServerEvents.recipes(event => {
  const SEAL = '#pixelgo:farm_seal'        // 160 unités de culture brute
  const HARVEST = '#pixelgo:farm_harvest'  // 1 440 unités (récolte compactée)
  const CERT = 'kubejs:harvest_certificate' // le mur des 15 heures, non consommé
  const rm = id => event.remove({ id: id })

  /* =========================================================================
   *  0. LE CERTIFICAT DE RÉCOLTE — le mur des 15 heures
   * -------------------------------------------------------------------------
   *  Un seul objet tient toute la frontière entre l'étape 2 et l'étape 3.
   *  Tant qu'il n'est pas fabriqué, ni Ex Deorum (minerais), ni les Botany
   *  Pots, ni les générateurs de cobble ne sont accessibles : il ne reste
   *  que la ferme à la main, sa vente, et les outils qu'on achète avec.
   *
   *  COÛT — 11 680 unités de culture
   *    8 x #pixelgo:farm_harvest  = 8 x 1 440 = 11 520
   *    1 x #pixelgo:farm_seal     =                160
   *
   *  Soit, en pratique, huit ballots de foin enchantés : 8 x 160 ballots,
   *  c'est-à-dire 11 520 blés moissonnés, bottelés puis compactés à la main.
   *
   *  POURQUOI CE CHIFFRE. Une ferme manuelle mûre — parcelle agrandie à la
   *  terre du tonneau, outils de récolte en zone de la boutique Minions,
   *  SquatGrow pour forcer la pousse — produit de l'ordre de 800 unités à
   *  l'heure une fois le temps de replantage, d'attente et d'aller-retour
   *  en boutique compté. 11 680 / 800 ≈ 14,6 heures. Un joueur très efficace
   *  (1 500/h) tombera vers 8 h, un joueur tranquille (500/h) vers 23 h.
   *  Le seul curseur à bouger est le nombre de `H` dans le motif ci-dessous :
   *  chaque case vaut 1 440 unités, soit ~1 h 45 de ferme.
   *
   *  IL N'EST PAS CONSOMMÉ. `containerItem` (voir startup_scripts/
   *  pixelgo_items.js) le renvoie dans la grille à chaque utilisation. C'est
   *  un laissez-passer : le mur se franchit une fois, pas à chaque pot de
   *  fleur. Sans cela, un Botany Pot coûterait 11 680 cultures pièce, ce qui
   *  n'aurait aucun sens.
   * ====================================================================== */
  event.shaped(CERT, ['HHH', 'HSH', 'HHH'], {
    H: HARVEST,
    S: SEAL
  }).id('kubejs:harvest_certificate')

  /* =========================================================================
   *  1. EX DEORUM — le tamis ne rend plus de minerai avant le péage
   * -------------------------------------------------------------------------
   *  CONSTAT : le maillage de FICELLE, craftable dès la première heure avec
   *  9 ficelles (ver à soie + feuillage), rendait DÉJÀ au tamis le fer, l'or,
   *  le cuivre, le diamant, l'émeraude, le lapis, le charbon, l'osmium,
   *  l'étain, le plomb, l'argent, l'aluminium… Autrement dit : « l'accès à
   *  l'ensemble des ressources du jeu », qui est censé être l'étape 3, tombait
   *  avant même la première vente de blé.
   *
   *  CORRECTIF : on retire de `exdeorum:sieve` et `exdeorum:compressed_sieve`
   *  toutes les sorties MINÉRALES des maillages ficelle et silex. Ce qui reste
   *  à ces deux paliers est exactement le nécessaire d'amorçage :
   *    terre   -> graines de blé / melon / citrouille / betterave, carotte,
   *               pomme de terre, canne à sucre, bambou, baies, cailloux ;
   *    mousse  -> les 34 pousses d'arbre ;
   *    gravier -> silex et cailloux de pierre ;
   *    sable   -> cactus, varech, quartz certus ;
   *    sable des âmes -> os, larmes de ghast, verrue du Nether.
   *
   *  Le premier minerai passe donc obligatoirement par le MAILLAGE DE FER,
   *  dont la recette porte le certificat (voir plus bas). Et comme les quatre
   *  lingots de fer ne peuvent alors venir que de la boutique (600 $ pièce)
   *  ou d'un coffre d'exploration, la boucle voulue se referme :
   *  cultiver -> vendre -> acheter du fer -> tamiser.
   * ====================================================================== */
  const ORE_OUT = '([a-z_]+_ore_chunk|coal|diamond|emerald|lapis_lazuli' +
    '|amethyst_shard|gold_nugget|iron_nugget|raw_gold|raw_iron' +
    '|quartz|glowstone_dust|redstone|ancient_debris)'

  event.remove({
    id: new RegExp('^exdeorum:sieve/[a-z_]+/(string|flint)/' + ORE_OUT + '$')
  })
  event.remove({
    id: new RegExp('^exdeorum:compressed_sieve/[a-z_]+/(string|flint)/' + ORE_OUT + '$')
  })

  /* --- Les maillages porteurs de minerai -------------------------------
   *  Motif d'origine : 'S#S' / '#S#' / 'S#S' (5 ficelles + 4 lingots).
   *  La ficelle centrale devient le CERTIFICAT : le coût en métal ne bouge
   *  pas, mais le maillage — donc le premier minerai — n'existe pas avant
   *  le mur des 15 heures. Le certificat n'étant pas consommé, monter
   *  ensuite le maillage doré puis le maillage de diamant ne le recoûte pas.
   * -------------------------------------------------------------------- */
  const mesh = (id, ingot) => {
    rm(`exdeorum:${id}`)
    event.shaped(`exdeorum:${id}`, ['SIS', 'IFI', 'SIS'], {
      S: '#c:strings',
      I: ingot,
      F: CERT
    })
  }
  mesh('iron_mesh', '#c:ingots/iron')
  mesh('golden_mesh', '#c:ingots/gold')
  mesh('diamond_mesh', '#c:gems/diamond')

  // Voies d'amélioration (maillage inférieur + 4 métaux) : même péage, sinon
  // elles court-circuitent les trois recettes ci-dessus. `rm` vise ici le
  // FICHIER de recette (`..._from_...`), dont le résultat est le maillage.
  const meshUpgrade = (recipeId, result, from, ingot) => {
    rm(`exdeorum:${recipeId}`)
    event.shaped(`exdeorum:${result}`, [' I ', 'IMI', 'IFI'], {
      I: ingot,
      M: from,
      F: CERT
    })
  }
  meshUpgrade('iron_mesh_from_flint_mesh', 'iron_mesh', 'exdeorum:flint_mesh', '#c:ingots/iron')
  meshUpgrade('golden_mesh_from_iron_mesh', 'golden_mesh', 'exdeorum:iron_mesh', '#c:ingots/gold')
  meshUpgrade('diamond_mesh_from_golden_mesh', 'diamond_mesh', 'exdeorum:golden_mesh', '#c:gems/diamond')

  /* =========================================================================
   *  2. BOTANY POTS — par le pot de fleur
   * -------------------------------------------------------------------------
   *  Botany Pots publie 245 recettes d'établi (une par matériau et par
   *  variante simple / entonnoir / cirée). Les retirer une à une serait
   *  ingérable et supprimerait 240 variantes purement décoratives.
   *
   *  Or TOUTES passent par un `minecraft:flower_pot`. On déplace donc le
   *  péage sur le pot de fleur lui-même : une seule recette à toucher, et
   *  les 245 variantes sont verrouillées d'un coup. (Cela verrouillait aussi
   *  le semoir d'Industrial Foregoing, qui demandait un pot — mod depuis
   *  retiré du pack.)
   *
   *  Le certificat n'étant pas consommé, les pots redeviennent bon marché
   *  UNE FOIS LE MUR FRANCHI (5 briques les quatre) : on ne veut pas taxer
   *  l'agrandissement de la ferme, on veut en retarder l'ouverture.
   *
   *  La voie « achat » reste ouverte : le marchand PixelGO vend un pot à
   *  entonnoir tout fait. Son prix a été porté de 2 500 à 400 000 $, soit
   *  l'équivalent en argent des 11 680 cultures du certificat — sans quoi
   *  63 blés vendus auraient suffi à sauter le mur.
   * ====================================================================== */
  rm('minecraft:flower_pot')
  event.shaped('4x minecraft:flower_pot', ['BFB', 'BBB'], {
    B: 'minecraft:brick',
    F: CERT
  })

  /* =========================================================================
   *  3. GÉNÉRATEURS DE COBBLE — la roue libre du skyblock
   * -------------------------------------------------------------------------
   *  6 bûches + 1 verre + 2 seaux : le générateur de base donnait du cobble
   *  à l'infini (donc gravier, sable, et tout le tamisage) sans qu'aucune
   *  graine n'ait été plantée. Seul le palier 1 est verrouillé : les paliers
   *  suivants s'améliorent à partir de lui.
   * ====================================================================== */
  rm('havencobblegens:craft/wooden_cobble_gen')
  event.shaped('havencobblegens:wooden_cobble_gen', ['III', 'WGL', 'IFI'], {
    I: 'minecraft:oak_log',
    G: 'minecraft:glass',
    W: 'minecraft:water_bucket',
    L: 'minecraft:lava_bucket',
    F: CERT
  })

  /* =========================================================================
   *  4. ÉTAPE 4 — LES ACCÉLÉRATEURS
   * -------------------------------------------------------------------------
   *  Tout ce qui multiplie le débit plutôt que de le créer coûte une RÉCOLTE
   *  (#pixelgo:farm_harvest), soit 1 440 unités de culture, consommée à chaque
   *  fabrication. À ce stade la ferme automatisée de l'étape 3 tourne déjà :
   *  le prix se paie en temps de machine, plus en temps de joueur.
   *
   *  Deux exceptions portent le CERTIFICAT plutôt qu'une récolte : l'Item
   *  Collector et le sac à dos Sophisticated. Ce sont les deux seuls objets
   *  de l'étape 4 dont la recette ne touche ni au fer, ni à l'or, ni au
   *  diamant, ni à la redstone — sans le certificat, ils se fabriqueraient
   *  avant le mur.
   * ====================================================================== */

  /* --- Click Machine (clic droit automatique) ---------------------------- */
  rm('clickmachine:click_machine')
  event.shaped('clickmachine:click_machine', ['SRS', 'RFR', 'SLS'], {
    S: 'minecraft:stone',
    R: 'minecraft:redstone_block',
    L: 'minecraft:slime_ball',
    F: HARVEST
  })

  /* --- Item Collector ---------------------------------------------------- */
  rm('itemcollectors:basic_collector')
  event.shaped('itemcollectors:basic_collector', [' A ', ' B ', 'BFB'], {
    A: '#c:ender_pearls',
    B: '#c:obsidians',
    F: CERT
  })

  /* --- Sophisticated Backpacks ------------------------------------------- */
  rm('sophisticatedbackpacks:backpack')
  event.shaped('sophisticatedbackpacks:backpack', ['SLS', 'SCS', 'LFL'], {
    S: '#c:strings',
    L: '#c:leathers',
    C: '#c:chests/wooden',
    F: CERT
  })

  /* --- Power Pots (x2 / x3 / x4 sur la pousse, config/PowerPots.json) ---------------------------
   *  Reprises de 10_minecraft.js : un bloc de métal du motif laisse la place
   *  à la récolte.
   * -------------------------------------------------------------------- */
  const powerPot = (tier, base, block) => {
    event.shaped(`powerpots:power_pot_${tier}`, ['MFM', 'MPM', 'MMM'], {
      P: base,
      M: block,
      F: HARVEST
    })
  }
  powerPot(1, 'botanypots:terracotta_hopper_botany_pot', 'minecraft:iron_block')
  powerPot(2, 'powerpots:power_pot_1', 'minecraft:gold_block')
  powerPot(3, 'powerpots:power_pot_2', 'minecraft:diamond_block')

  /* --- Ex Deorum : tamis et marteau mécaniques --------------------------- */
  rm('exdeorum:mechanical_sieve')
  event.shaped('exdeorum:mechanical_sieve', ['BGB', 'IHI', 'IFI'], {
    B: 'minecraft:iron_block',
    G: 'minecraft:glass',
    I: 'minecraft:iron_bars',
    H: 'minecraft:hopper',
    F: HARVEST
  })

  rm('exdeorum:mechanical_hammer')
  event.shaped('exdeorum:mechanical_hammer', ['IFI', 'ITI', 'BHB'], {
    I: 'minecraft:iron_ingot',
    T: '#exdeorum:hammers',
    B: 'minecraft:iron_block',
    H: 'minecraft:hopper',
    F: HARVEST
  })

  /* --- Ex Compressum : la gamme « auto » --------------------------------- */
  rm('excompressum:auto_sieve')
  event.shaped('excompressum:auto_sieve', ['BGB', 'GSG', 'IFI'], {
    B: 'minecraft:iron_block',
    G: 'minecraft:glass_pane',
    I: 'minecraft:iron_ingot',
    S: '#excompressum:sieves',
    F: HARVEST
  })

  rm('excompressum:auto_heavy_sieve')
  event.shaped('excompressum:auto_heavy_sieve', ['BGB', 'GSG', 'IFI'], {
    B: 'minecraft:iron_block',
    G: 'minecraft:glass_pane',
    I: 'minecraft:iron_ingot',
    S: '#excompressum:heavy_sieves',
    F: HARVEST
  })

  rm('excompressum:auto_hammer')
  event.shaped('excompressum:auto_hammer', ['IPI', 'IHI', 'IFI'], {
    I: 'minecraft:iron_ingot',
    P: 'minecraft:heavy_weighted_pressure_plate',
    H: '#excompressum:diamond_hammers',
    F: HARVEST
  })

  rm('excompressum:auto_compressed_hammer')
  event.shaped('excompressum:auto_compressed_hammer', ['BPB', 'IHI', 'BFB'], {
    B: 'minecraft:iron_block',
    P: 'minecraft:heavy_weighted_pressure_plate',
    I: 'minecraft:iron_ingot',
    H: 'excompressum:compressed_diamond_hammer',
    F: HARVEST
  })

  rm('excompressum:auto_compressor')
  event.shaped('excompressum:auto_compressor', ['CIC', 'IBI', 'CFC'], {
    C: 'minecraft:crafting_table',
    I: 'minecraft:iron_ingot',
    B: 'minecraft:iron_block',
    F: HARVEST
  })

  /* --- Time in a Bottle (accélérateur de temps local) --------------------- */
  rm('tiab:time_in_a_bottle')
  event.shaped('tiab:time_in_a_bottle', ['GFG', 'DCD', 'LBL'], {
    G: 'minecraft:gold_ingot',
    D: 'minecraft:diamond',
    C: 'minecraft:clock',
    L: 'minecraft:lapis_lazuli',
    B: 'minecraft:glass_bottle',
    F: HARVEST
  })

  /* --- Industrial Foregoing : la ferme entièrement automatique ------------
   *  Récolteuse + semoir + fertiliseur = la ferme se passe du joueur.
   *  C'est le dernier palier d'accélération, pas un raccourci d'entrée.
   *
   *  LE MOD A ÉTÉ RETIRÉ DU PACK. Ces trois recettes restent écrites mais
   *  sous condition : sans le mod, KubeJS échouait à lire le résultat et
   *  jetait trois erreurs au chargement. Si Industrial Foregoing revient un
   *  jour, le péage se remet en place tout seul.
   * -------------------------------------------------------------------- */
  if (Platform.isLoaded('industrialforegoing')) {
    rm('industrialforegoing:plant_gatherer')
    event.shaped('industrialforegoing:plant_gatherer', ['PHP', 'AMA', 'GFG'], {
      P: '#c:plastics',
      H: 'minecraft:iron_hoe',
      A: 'minecraft:iron_axe',
      M: '#industrialforegoing:machine_frame/pity',
      G: '#c:gears/gold',
      F: HARVEST
    })

    rm('industrialforegoing:plant_sower')
    event.shaped('industrialforegoing:plant_sower', ['PBP', 'LML', 'GFG'], {
      P: '#c:plastics',
      B: 'minecraft:flower_pot',
      L: 'minecraft:piston',
      M: '#industrialforegoing:machine_frame/pity',
      G: '#c:gears/iron',
      F: HARVEST
    })

    rm('industrialforegoing:plant_fertilizer')
    event.shaped('industrialforegoing:plant_fertilizer', ['PBP', 'LML', 'GFG'], {
      P: '#c:plastics',
      B: 'minecraft:glass_bottle',
      L: 'minecraft:leather',
      M: '#industrialforegoing:machine_frame/simple',
      G: '#c:gears/iron',
      F: HARVEST
    })
  }

  /* =========================================================================
   *  5. PROJECTE — refermer les deux fuites qui annulaient toute la trame
   * -------------------------------------------------------------------------
   *  a) LA PIERRE PHILOSOPHALE AVAIT UNE SECONDE RECETTE.
   *     `00_removals.js` retire bien `projecte:philosophers_stone`, mais
   *     ProjectE en publie DEUX : `philosophers_stone` et
   *     `philosophers_stone_alt` — même coût (4 poudres de redstone,
   *     4 poudres de pierre lumineuse, 1 diamant), motif simplement pivoté.
   *     La variante `_alt` restait donc active : la pierre, que le pack fait
   *     coûter 80 items enchantés et une singularité ultime en table 9x9,
   *     se craftait en réalité pour neuf items banals. Toute la fin de trame
   *     sautait d'un coup.
   *
   *  b) LE CONDENSATEUR MK1 N'EXIGEAIT PAS LA PIERRE.
   *     Il se craftait sans elle (coffre alchimique + diamants + obsidienne).
   *     On l'aligne sur les paliers MK2 (matière noire, donc carburant
   *     aeternalis, donc la pierre) : la pierre entre dans sa recette. Elle
   *     n'est pas consommée (ProjectE la rend au joueur, comme pour le
   *     charbon alchimique), ce qui garde l'énoncé « la Pierre Philosophale
   *     débloque le endgame » littéralement vrai.
   *
   *     Les collecteurs et relais, qui rendaient le condensateur infini, ne
   *     se craftent plus du tout depuis le 2026-11-08 (00_removals.js) :
   *     ProjectE ne génère plus d'EMC.
   * ====================================================================== */
  rm('projecte:philosophers_stone_alt')

  const STONE = 'projecte:philosophers_stone'

  rm('projecte:condenser_mk1')
  event.shaped('projecte:condenser_mk1', ['ODO', 'DCD', 'OPO'], {
    O: '#c:obsidians/normal',
    D: '#c:gems/diamond',
    C: 'projecte:alchemical_chest',
    P: STONE
  })

  /* =========================================================================
   *  6. TAMIS — LES CULTURES N'EN SORTENT PLUS QU'EN QUANTITÉ D'AMORÇAGE
   * -------------------------------------------------------------------------
   *  CONSTAT (voir ECONOMIE.md) : un bloc de terre tamisé rendait en moyenne
   *  0,3 à 0,45 carotte / pomme de terre / canne à sucre, et jusqu'à 3,15 au
   *  tamis compressé. À 40 $ la culture, un tamis automatique Ex Compressum
   *  (~7 200 blocs/h) nourri de terre achetée 1 $ au distributeur rapportait
   *  plus de 150 000 $/h — sans rien planter. Le tamis court-circuitait la
   *  ferme, qui est la SEULE source de revenus voulue par la trame.
   *
   *  CORRECTIF : toutes les sorties « culture revendable » (carotte, pomme de
   *  terre, canne, cactus, verrue, graines de blé) sont retirées des tamis et
   *  tamis compressés d'Ex Deorum, tous maillages. On ne les remet QUE sur les
   *  maillages de ficelle et de silex, au tamis simple, avec une chance
   *  d'amorçage : il suffit d'UNE carotte pour lancer un champ, pas d'un stock.
   *
   *      terre       -> carotte, pomme de terre, canne 1 % ; graines de blé 5 %
   *      sable(s)    -> cactus 1 %
   *      sable des âmes -> verrue du Nether 1 %
   *
   *  Valeur espérée d'un bloc de terre tamisé : ~2 $ au lieu de 23,5 $
   *  (ficelle) et 504 $ (compressé, netherite). Les graines de melon, de
   *  citrouille et de betterave, qui ne se revendent pas, ne sont pas touchées.
   * ====================================================================== */
  event.remove({
    id: new RegExp('^exdeorum:(compressed_)?sieve/[a-z_]+/[a-z_]+/' +
      '(carrot|potato|sugar_cane|cactus|nether_wart|wheat_seeds)$')
  })

  const AMORCE = [
    ['minecraft:dirt', 'minecraft:carrot', 0.01],
    ['minecraft:dirt', 'minecraft:potato', 0.01],
    ['minecraft:dirt', 'minecraft:sugar_cane', 0.01],
    ['minecraft:dirt', 'minecraft:wheat_seeds', 0.05],
    ['minecraft:sand', 'minecraft:cactus', 0.01],
    ['minecraft:red_sand', 'minecraft:cactus', 0.01],
    ['minecraft:soul_sand', 'minecraft:nether_wart', 0.01]
  ]
  ;['string', 'flint'].forEach(mesh => {
    AMORCE.forEach(([source, culture, p]) => {
      event.custom({
        type: 'exdeorum:sieve',
        ingredient: { item: source },
        mesh: { item: `exdeorum:${mesh}_mesh` },
        result: { count: 1, id: culture },
        result_amount: { type: 'minecraft:binomial', n: 1, p: p }
      }).id(`kubejs:exdeorum/sieve/amorce/${source.split(':')[1]}/${mesh}/${culture.split(':')[1]}`)
    })
  })
})
