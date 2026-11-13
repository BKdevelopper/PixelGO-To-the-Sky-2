// priority: 80
/* =============================================================================
 *  PixelGO — To the Sky : apparition naturelle des Lucky Blocks Pixelmon
 * =============================================================================
 *  Fait apparaitre des blocs du mod `hainypixelmonluckyblocks` au sol, DEVANT
 *  les joueurs, dans l'Overworld, le Nether et l'End.
 *
 *  Le tier du bloc pose est tire au sort selon des poids de rarete propres a
 *  chaque dimension : le Nether tire nettement plus souvent les tiers forts
 *  (Shiny / Legendary / Boss / Jackpot), l'End se situe entre les deux.
 *
 *  CE SCRIPT EST LE COMPLEMENT DU DATAPACK, PAS LA SOURCE PRINCIPALE
 *  -----------------------------------------------------------------
 *  L'essentiel des Lucky Blocks est desormais genere par le datapack
 *  kubejs/data/pixelgo_luckyblocks/ : ils font partie du terrain, donc ils sont
 *  deja en place bien avant que le joueur arrive. Mais un datapack de worldgen
 *  ne s'applique QU'AUX CHUNKS NEUFS.
 *
 *  Ce script couvre les deux trous que le datapack ne peut pas boucher :
 *    - les chunks deja generes (toute la zone explayee avant l'installation) ;
 *    - un Overworld skyblock, ou il n'y a pas de terrain a decorer.
 *
 *  Il pose donc dans un cone DEVANT le joueur (voir LB_CONE_DEGRES) et a au
 *  moins LB_RAYON_MIN blocs de distance, pour qu'aucun bloc ne se materialise
 *  dans son dos ni sous ses yeux. Pour t'en remettre entierement au datapack,
 *  passe LB_ACTIF a false.
 *
 *  AUTRES CHOSES A SAVOIR
 *  ----------------------
 *  1. Le mod possede DEJA son propre systeme d'apparition, le « Sillage de
 *     Chance » (section [sillage_de_chance] de config/hainypixelmonluckyblocks-
 *     common.toml), qui pose lui aussi des blocs autour des joueurs qui se
 *     deplacent. Ce script s'ajoute par-dessus, il ne le remplace pas. Pour
 *     n'avoir QUE ce script, mets tous les `tierWeight` du .toml a 0.0 ;
 *     pour n'avoir que le mod, passe LB_ACTIF a false ci-dessous.
 *  2. Les tiers reglent uniquement QUEL bloc apparait. Ce que chaque bloc donne
 *     une fois casse (niveau, IV, chance de shiny/legendaire) reste pilote par
 *     le .toml du mod, pas par ce script.
 *  3. Le suivi des blocs poses vit en memoire : un redemarrage du serveur ou un
 *     /reload remet le registre a zero. Les blocs deja dans le monde restent
 *     cassables, ils ne seront simplement plus nettoyes automatiquement.
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 *  1. REGLAGES GENERAUX
 * ------------------------------------------------------------------------ */

/* Interrupteur general du script. */
const LB_ACTIF = true

/* Periode (en ticks) entre deux tentatives d'apparition pour un joueur donne.
   100 ticks = 5 secondes. C'est la cadence a laquelle on lance un de ; la
   probabilite de reussite de ce de est reglee par dimension (`chance`). */
const LB_PERIODE_TICKS = 100

/* Rayon (en blocs) de la zone de recherche, DEVANT le joueur.
   LB_RAYON_MIN est assez grand pour que le bloc ne se materialise jamais sous
   le nez du joueur : il le decouvre en avancant, comme s'il avait toujours ete
   la. LB_RAYON_MAX reste volontairement sous 32 : au-dela, les chunks ne sont
   pas garantis charges et lire un bloc forcerait leur generation. */
const LB_RAYON_MIN = 16
const LB_RAYON_MAX = 30

/* Demi-angle (en degres) du cone de recherche, mesure depuis la direction dans
   laquelle le joueur avance (ou regarde, s'il est immobile). 70 donne un cone
   de 140 degres devant lui : rien n'apparait plus dans son dos.
   Mets 180 pour revenir a une recherche tout autour du joueur. */
const LB_CONE_DEGRES = 70

/* Nombre d'emplacements tires au hasard avant d'abandonner la tentative.
   Monte un peu cette valeur sur une map tres encombree ou tres aerienne. */
const LB_ESSAIS_PAR_TENTATIVE = 12

/* Hauteur de scan vertical, relative au joueur, pour trouver un sol. */
const LB_SCAN_HAUT = 6
const LB_SCAN_BAS = 16

/* Distance minimale entre deux Lucky Blocks poses par ce script. */
const LB_ECART_MIN = 6

/* Nombre maximum de Lucky Blocks suivis simultanement, toutes dimensions
   confondues. Au-dela, plus rien n'apparait tant que des blocs ne sont pas
   casses ou n'ont pas expire. */
const LB_MAX_SUIVIS = 120

/* Duree de vie (en minutes) d'un bloc jamais casse, apres quoi le script le
   retire pour ne pas polluer le monde. Mets 0 pour desactiver le nettoyage. */
const LB_EXPIRATION_MINUTES = 30

/* Rang minimal (voir LB_TIERS) a partir duquel le joueur recoit une alerte en
   barre d'action + un son. Mets 99 pour ne jamais prevenir. */
const LB_ALERTE_RANG_MIN = 5

/* Mode diagnostic : ecrit dans logs/kubejs/server.log a chaque bloc pose, et
   signale les tirages ou aucun emplacement valide n'a ete trouve. A activer le
   temps de verifier que tout fonctionne, puis a repasser a false : ca bavarde
   beaucoup. */
const LB_DEBUG = true

/* Blocs sur lesquels on refuse de poser un Lucky Block. */
const LB_SOL_INTERDIT = [
  'minecraft:bedrock',
  'minecraft:barrier',
  'minecraft:end_portal_frame',
  'minecraft:spawner',
  'minecraft:chest',
  'minecraft:trapped_chest',
  'minecraft:ender_chest'
]

/* ---------------------------------------------------------------------------
 *  2. LES TIERS
 * ------------------------------------------------------------------------
 *  `rang` sert uniquement a l'alerte : plus il est haut, plus le bloc est fort.
 *  `couleur` est le code couleur de l'alerte en barre d'action.
 * ------------------------------------------------------------------------ */
const LB_TIERS = [
  { nom: 'common_lucky_block',         rang: 1,  couleur: '§7' },
  { nom: 'item_lucky_block',           rang: 2,  couleur: '§a' },
  { nom: 'rare_lucky_block',           rang: 3,  couleur: '§9' },
  { nom: 'master_lucky_block',         rang: 4,  couleur: '§d' },
  { nom: 'alternate_form_lucky_block', rang: 5,  couleur: '§b' },
  { nom: 'boss_lucky_block',           rang: 6,  couleur: '§c' },
  { nom: 'shiny_lucky_block',          rang: 7,  couleur: '§e' },
  { nom: 'legendary_lucky_block',      rang: 8,  couleur: '§6' },
  { nom: 'jackpot_lucky_block',        rang: 9,  couleur: '§5' },
  { nom: 'super_jackpot_lucky_block',  rang: 10, couleur: '§4' }
]

/* ---------------------------------------------------------------------------
 *  3. REGLAGES PAR DIMENSION
 * ------------------------------------------------------------------------
 *  `chance` : probabilite qu'un bloc apparaisse a chaque tirage (toutes les
 *             LB_PERIODE_TICKS, par joueur). C'EST LE REGLAGE DU TAUX DE SPAWN
 *             de ce script. 0.04 toutes les 5 s donne en moyenne un bloc toutes
 *             les ~2 min d'exploration, quand un emplacement valide est trouve
 *             devant le joueur. Divise ces valeurs pour en avoir moins.
 *
 *             Le taux du datapack, lui, se regle dans
 *             tools/luckyblocks-worldgen.js (constante DENSITE), qu'il faut
 *             relancer ensuite avec `node tools/luckyblocks-worldgen.js`.
 *
 *  `poids`  : poids relatifs des tiers. Ce ne sont PAS des pourcentages : la
 *             chance d'un tier vaut son poids divise par la somme des poids de
 *             la dimension. Un tier absent de la liste, ou a 0, n'apparait
 *             jamais dans cette dimension. Les trois listes sont calibrees pour
 *             totaliser 2000 : un poids vaut donc directement son pourcentage
 *             multiplie par 20, ce qui rend les reglages lisibles a l'oeil.
 *
 *  `yMin` / `yMax` : bornes de securite pour ne pas poser hors du monde
 *             (le plafond du Nether est a 127).
 *
 *  Repartition obtenue avec les valeurs ci-dessous :
 *
 *    Tier                Overworld    Nether      End
 *    ------------------------------------------------
 *    Commun                49,95 %    28,50 %   40,50 %
 *    Objet                 22,00 %    13,00 %   16,50 %
 *    Rare                  15,00 %    19,00 %   17,00 %
 *    Master                 6,00 %    15,00 %   10,50 %
 *    Forme alternative      2,50 %     6,50 %    4,50 %
 *    Boss                   2,50 %     8,50 %    5,25 %
 *    Shiny                  1,20 %     5,25 %    3,25 %
 *    Legendaire             0,60 %     3,00 %    1,80 %
 *    Jackpot                0,20 %     1,00 %    0,55 %
 *    Super Jackpot          0,05 %     0,25 %    0,15 %
 *
 *  Soit un tier « fort » (Boss ou mieux) dans 4,55 % des cas en Overworld,
 *  18,00 % dans le Nether (pres de 4x plus) et 11,00 % dans l'End.
 * ------------------------------------------------------------------------ */
const LB_DIMENSIONS = {

  'minecraft:overworld': {
    chance: 0.04,
    yMin: -60,
    yMax: 316,
    poids: {
      'common_lucky_block': 999,
      'item_lucky_block': 440,
      'rare_lucky_block': 300,
      'master_lucky_block': 120,
      'alternate_form_lucky_block': 50,
      'boss_lucky_block': 50,
      'shiny_lucky_block': 24,
      'legendary_lucky_block': 12,
      'jackpot_lucky_block': 4,
      'super_jackpot_lucky_block': 1
    }
  },

  /* Le Nether est la dimension « a risque » : les Lucky Blocks y sont a la fois
     plus frequents et bien meilleurs, ce qui donne une raison d'y aller. */
  'minecraft:the_nether': {
    chance: 0.06,
    yMin: 2,
    yMax: 124,
    poids: {
      'common_lucky_block': 570,
      'item_lucky_block': 260,
      'rare_lucky_block': 380,
      'master_lucky_block': 300,
      'alternate_form_lucky_block': 130,
      'boss_lucky_block': 170,
      'shiny_lucky_block': 105,
      'legendary_lucky_block': 60,
      'jackpot_lucky_block': 20,
      'super_jackpot_lucky_block': 5
    }
  },

  'minecraft:the_end': {
    chance: 0.05,
    yMin: 2,
    yMax: 252,
    poids: {
      'common_lucky_block': 810,
      'item_lucky_block': 330,
      'rare_lucky_block': 340,
      'master_lucky_block': 210,
      'alternate_form_lucky_block': 90,
      'boss_lucky_block': 105,
      'shiny_lucky_block': 65,
      'legendary_lucky_block': 36,
      'jackpot_lucky_block': 11,
      'super_jackpot_lucky_block': 3
    }
  }
}

/* =============================================================================
 *  4. IMPLEMENTATION — rien a regler en dessous de cette ligne
 * ========================================================================== */

const LB_MODID = 'hainypixelmonluckyblocks'

/* Tables de tirage pre-calculees : { total, entrees: [{ tier, cumul }] }.
   Construites une seule fois au chargement, pas a chaque apparition. */
const LB_TABLES = (function () {
  const tables = {}

  Object.keys(LB_DIMENSIONS).forEach(dim => {
    const poids = LB_DIMENSIONS[dim].poids
    const entrees = []
    let total = 0

    LB_TIERS.forEach(tier => {
      const p = poids[tier.nom] || 0
      if (p <= 0) return
      total += p
      entrees.push({ tier: tier, cumul: total })
    })

    tables[dim] = { total: total, entrees: entrees }
  })

  return tables
})()

/* Etat courant, remis a zero a chaque rechargement des scripts serveur. */
const LB_ETAT = {
  tick: 0,   // compteur de ticks propre au script
  poses: []  // [{ dim, x, y, z, id, expire }]
}

/* Identifiant de dimension, sous la forme `minecraft:the_nether`.
   `level.dimension` (fourni par KubeJS) renvoie deja une ResourceLocation ;
   le repli couvre le cas ou l'accesseur resout vers le ResourceKey vanilla. */
function lbDimension(niveau) {
  const dim = niveau.dimension
  const texte = String(dim)

  if (texte.indexOf(':') !== -1 && texte.indexOf(' ') === -1) return texte
  return String(dim.location())
}

/* Tire un tier au hasard dans la table de la dimension. */
function lbTirerTier(dim) {
  const table = LB_TABLES[dim]
  if (!table || table.total <= 0) return null

  const de = Math.random() * table.total
  for (let i = 0; i < table.entrees.length; i++) {
    if (de < table.entrees[i].cumul) return table.entrees[i].tier
  }
  return table.entrees[table.entrees.length - 1].tier
}

/* Un bloc solide sur lequel on accepte de poser ? */
function lbSolValide(bloc) {
  const etat = bloc.blockState
  if (etat.isAir()) return false
  if (!etat.getFluidState().isEmpty()) return false
  if (!etat.blocksMotion()) return false

  const id = bloc.id
  if (id.startsWith(LB_MODID + ':')) return false
  if (LB_SOL_INTERDIT.indexOf(id) !== -1) return false

  return true
}

/* Un espace libre ou poser le bloc ? */
function lbEspaceLibre(bloc) {
  return bloc.blockState.isAir()
}

/* Direction vers laquelle le joueur avance, en radians sur le plan horizontal.

   On privilegie son vecteur de deplacement : c'est la ou il va reellement
   arriver. S'il est a l'arret (ou qu'il monte une echelle), on retombe sur la
   direction de son regard. Le resultat sert de centre au cone de recherche,
   pour que les blocs soient poses sur son chemin et jamais dans son dos. */
function lbCapDuJoueur(joueur) {
  const v = joueur.deltaMovement

  if (v && (v.x * v.x + v.z * v.z) > 0.0025) return Math.atan2(v.z, v.x)

  const regard = joueur.lookAngle
  return Math.atan2(regard.z, regard.x)
}

/* Trop pres d'un Lucky Block deja pose par le script ?

   NOTE RHINO : le moteur JS de KubeJS refuse `const`/`let` declares A
   L'INTERIEUR d'une boucle `for` classique — a la deuxieme iteration il leve
   « TypeError: redeclaration of var … », et cette erreur-la n'est PAS attrapee
   par un try/catch JS. Toutes les variables de boucle de ce fichier sont donc
   declarees avant la boucle, et seulement affectees a l'interieur. */
function lbTropPres(dim, x, y, z) {
  let p, dx, dy, dz

  for (let i = 0; i < LB_ETAT.poses.length; i++) {
    p = LB_ETAT.poses[i]
    if (p.dim !== dim) continue

    dx = p.x - x
    dy = p.y - y
    dz = p.z - z
    if (dx * dx + dy * dy + dz * dz < LB_ECART_MIN * LB_ECART_MIN) return true
  }
  return false
}

/* Cherche un emplacement valide autour du joueur. Renvoie { x, y, z } ou null. */
function lbChercherEmplacement(niveau, dim, reglages, px, py, pz, capBase) {
  const yBas = Math.max(reglages.yMin, Math.floor(py) - LB_SCAN_BAS)
  const yHaut = Math.min(reglages.yMax, Math.floor(py) + LB_SCAN_HAUT)
  const cone = LB_CONE_DEGRES * Math.PI / 180

  /* Declarations hors boucle : voir la NOTE RHINO de lbTropPres. */
  let angle, dist, x, z, y

  for (let essai = 0; essai < LB_ESSAIS_PAR_TENTATIVE; essai++) {
    /* Tire un angle dans le cone centre sur la direction du joueur. */
    angle = capBase + (Math.random() * 2 - 1) * cone
    dist = LB_RAYON_MIN + Math.random() * (LB_RAYON_MAX - LB_RAYON_MIN)
    x = Math.floor(px + Math.cos(angle) * dist)
    z = Math.floor(pz + Math.sin(angle) * dist)

    /* On descend depuis le haut du scan : le premier couple
       (air pose sur un sol solide) rencontre gagne. */
    for (y = yHaut; y > yBas; y--) {
      if (!lbEspaceLibre(niveau.getBlock(x, y, z))) continue
      if (!lbSolValide(niveau.getBlock(x, y - 1, z))) continue

      /* Deux blocs d'air : evite les recoins ou le bloc serait invisible. */
      if (y + 1 <= reglages.yMax && !lbEspaceLibre(niveau.getBlock(x, y + 1, z))) continue
      if (lbTropPres(dim, x, y, z)) continue

      return { x: x, y: y, z: z }
    }
  }

  return null
}

/* Retire les blocs expires, et oublie ceux que les joueurs ont deja casses. */
function lbNettoyer(serveur) {
  if (LB_ETAT.poses.length === 0) return

  const restants = []

  /* Declarations hors boucle : voir la NOTE RHINO de lbTropPres. */
  let p, niveau, bloc

  for (let i = 0; i < LB_ETAT.poses.length; i++) {
    p = LB_ETAT.poses[i]

    niveau = null
    try {
      niveau = serveur.getLevel(p.dim)
    } catch (err) {
      niveau = null
    }
    if (!niveau) continue

    bloc = niveau.getBlock(p.x, p.y, p.z)

    /* Casse (ou remplace) entre-temps : on arrete simplement de le suivre. */
    if (bloc.id !== p.id) continue

    if (LB_EXPIRATION_MINUTES > 0 && LB_ETAT.tick >= p.expire) {
      bloc.set('minecraft:air')
      continue
    }

    restants.push(p)
  }

  LB_ETAT.poses = restants
}

/* Previent le joueur qu'un bloc interessant vient d'apparaitre. */
function lbAlerter(serveur, joueur, tier, pos) {
  if (tier.rang < LB_ALERTE_RANG_MIN) return

  joueur.setStatusMessage(
    Component.string(tier.couleur + '✦ ')
      .append(Component.translate('block.' + LB_MODID + '.' + tier.nom))
      .append(Component.string(tier.couleur + ' est apparu a proximite !'))
  )

  try {
    serveur.runCommandSilent(
      'playsound minecraft:block.note_block.chime player ' + joueur.username +
      ' ' + pos.x + ' ' + pos.y + ' ' + pos.z + ' 1.0 1.6'
    )
  } catch (err) {
    /* Pas de son : sans importance, on n'interrompt pas l'apparition pour ca. */
  }
}

/* Tentative d'apparition pour un joueur. */
function lbTenter(serveur, joueur) {
  const niveau = joueur.level
  const dim = lbDimension(niveau)
  const reglages = LB_DIMENSIONS[dim]
  if (!reglages) return

  if (Math.random() >= reglages.chance) return

  if (LB_ETAT.poses.length >= LB_MAX_SUIVIS) {
    if (LB_DEBUG) console.info('[LuckyBlocks] Plafond de ' + LB_MAX_SUIVIS + ' blocs suivis atteint.')
    return
  }

  const pos = lbChercherEmplacement(
    niveau, dim, reglages,
    joueur.x, joueur.y, joueur.z,
    lbCapDuJoueur(joueur)
  )

  if (!pos) {
    if (LB_DEBUG) {
      console.info('[LuckyBlocks] Aucun emplacement valide autour de ' + joueur.username +
        ' (' + dim + ', y=' + Math.floor(joueur.y) + ').')
    }
    return
  }

  const tier = lbTirerTier(dim)
  if (!tier) return

  const id = LB_MODID + ':' + tier.nom
  niveau.getBlock(pos.x, pos.y, pos.z).set(id)

  LB_ETAT.poses.push({
    dim: dim,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    id: id,
    expire: LB_ETAT.tick + LB_EXPIRATION_MINUTES * 60 * 20
  })

  if (LB_DEBUG) {
    console.info('[LuckyBlocks] ' + tier.nom + ' pose en ' + dim + ' ' +
      pos.x + ' ' + pos.y + ' ' + pos.z + ' (pour ' + joueur.username + ').')
  }

  lbAlerter(serveur, joueur, tier, pos)
}

/* ---------------------------------------------------------------------------
 *  Boucle serveur
 * ------------------------------------------------------------------------ */
ServerEvents.tick(event => {
  if (!LB_ACTIF) return

  LB_ETAT.tick++

  /* Nettoyage une fois par minute. */
  if (LB_ETAT.tick % 1200 === 0) lbNettoyer(event.server)

  if (LB_ETAT.tick % LB_PERIODE_TICKS !== 0) return

  event.server.players.forEach(joueur => {
    if (joueur.spectator) return

    try {
      lbTenter(event.server, joueur)
    } catch (err) {
      console.error('[PixelGO/LuckyBlocks] Echec de l\'apparition pour ' + joueur.username + ' : ' + err)
    }
  })
})
