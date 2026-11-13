// priority: 50
/* =============================================================================
 *  PixelGO — plafond des PNJ sauvages (dresseurs, tuteurs, marchands…)
 * =============================================================================
 *  Garde au plus PS_MAX PNJ sauvages autour de chaque joueur, et fait partir
 *  ceux qui sont là depuis plus de PS_DUREE_VIE_S.
 *
 *  POURQUOI LES DRESSEURS ENVAHISSENT L'ÎLE
 *  ----------------------------------------
 *  Vérifié dans Pixelmon 9.4.1 (bytecode) :
 *  - Les Pokémon sauvages ont leur propre minuteur de disparition
 *    (PixelmonEntity.despawnCounter). Les PNJ, eux, n'en ont aucun :
 *    entities/npcs/NPC (catégorie MISC) n'écrase pas checkDespawn et suit la
 *    règle vanilla de Mob.checkDespawn. Un PNJ n'est retiré que si aucun
 *    joueur n'est à moins de 32 blocs. Or, sur une île, le joueur est
 *    toujours à moins de 32 blocs.
 *  - `/pokekill` (57_pokekill_auto.js) ne vise que les Pokémon.
 *  Chaque dresseur qui apparaît reste donc pour de bon. Ils s'accumulent
 *  jusqu'à occuper une bonne partie du plafond `entities-per-player` (30) de
 *  config/pixelmon/spawning/wild.yml. Ensuite, pixelgoyourteamdieyoudie
 *  ([trainers], sightRadius 16) les fait marcher vers le joueur et lancer le
 *  combat : le joueur se retrouve encerclé.
 *  Constaté le 17/10/2026 sur une île en Mushroom Fields : une quinzaine de
 *  Gentleman et Rich Boy (data/pixelmon/spawning/npcs/trainers.set.json) pour
 *  quelques Shroomish et Morelull.
 *
 *  CE QUI COMPTE COMME « SAUVAGE »
 *  -------------------------------
 *  Un `pixelmon:npc` SANS PersistenceRequired. NPCPreset.createNPC (appelé par
 *  SpawnActionNPC) ne rend jamais le PNJ persistant. Les PNJ posés exprès le
 *  sont, eux : le constructeur de NPC appelle setPersistenceRequired quand le
 *  builder est « tracked », et la Battle Tower le fait dans TowerNpcs. Ils ne
 *  sont jamais touchés. Pour un PNJ non persistant, vanilla le supprime déjà
 *  dès que le joueur s'éloigne à plus de 128 blocs. On applique simplement la
 *  même règle sur une île, où personne ne s'éloigne.
 *
 *  COMBATS EN COURS
 *  ----------------
 *  Retirer un PNJ en plein combat risque de laisser l'écran de combat bloqué.
 *  Mais BattleRegistry n'enregistre QUE les joueurs (registerParticipant sort
 *  tout de suite quand !isPlayer()) : impossible de demander si un PNJ précis
 *  se bat. On épargne donc tout PNJ à moins de PS_RAYON_COMBAT blocs d'un
 *  joueur en combat. Le combat démarre à 6 blocs (challengeRadius) et le PNJ ne
 *  bouge plus ensuite : la marge est large. La comparaison ignore la dimension.
 *  Au pire, un PNJ d'une autre dimension est épargné pour un passage.
 *
 *  PIÈGES RHINO (voir 04_pg_lib.js et 70_skyblock_autocreate.js)
 *  -------------------------------------------------------------
 *  Aucun `let`/`const` dans un `try`, aucune méthode Java surchargée.
 *  `AABB.of`, `getEntitiesWithin`, `discard` et `BattleRegistry.inBattle` n'ont
 *  qu'une signature chacun.
 * ========================================================================== */

/* --- Réglages ------------------------------------------------------------ */
/** PNJ sauvages tolérés autour d'un joueur. Au-delà, les plus récents partent. */
const PS_MAX = 2

/**
 * Durée de vie d'un PNJ sauvage, en secondes. Égale au `battleCooldownSeconds`
 * de pixelgoyourteamdieyoudie : un dresseur battu s'en va au moment où il
 * aurait relancé le combat, et il laisse sa place à un nouveau visage.
 * Comptée depuis le chargement du PNJ (`tickCount` n'est pas sauvegardé) :
 * après un redémarrage, le compteur repart de zéro.
 */
const PS_DUREE_VIE_S = 5 * 60

/**
 * PixelGO - NPC (ajouté le 11/11/2026) : ses rivaux (Kyusama) et ses trois
 * marchands sont des PNJ non persistants comme les autres, mais ce sont des
 * objectifs du livre de quêtes. Un rival appelé par la Rival Beacon (objet
 * consommé) retiré au bout d'une seconde par le plafond, c'est une balise
 * perdue. Ils ne comptent donc pas dans PS_MAX. Les marchands gardent la durée
 * de vie normale ; un rival reste PS_DUREE_VIE_RIVAL_S.
 */
const PS_DUREE_VIE_RIVAL_S = 30 * 60
/** Rayon de comptage autour du joueur. 128 = distance de despawn vanilla. */
const PS_RAYON = 128

/** Rayon autour d'un joueur en combat dans lequel aucun PNJ n'est retiré. */
const PS_RAYON_COMBAT = 24

/** Fréquence du passage, en ticks (20 = 1 s). */
const PS_PERIODE_TICKS = 20

/** Trace chaque retrait dans les logs du serveur. */
const PS_DEBUG = false

const PS_TYPE = 'pixelmon:npc'
const PS_CLASSE_COMBATS = 'com.pixelmonmod.pixelmon.battles.BattleRegistry'

/* --- État ---------------------------------------------------------------- */
let PS_TICK = 0
let PS_COMBATS = undefined // classe BattleRegistry, ou null si introuvable

/** BattleRegistry, ou null. Chargée une seule fois. */
function psCombats () {
  if (PS_COMBATS === undefined) {
    try {
      PS_COMBATS = Java.tryLoadClass(PS_CLASSE_COMBATS)
    } catch (err) {
      PS_COMBATS = null
    }
    if (!PS_COMBATS) {
      console.error('[PixelGO/PnjSauvages] ' + PS_CLASSE_COMBATS + ' introuvable : ' +
        'impossible de savoir qui se bat, aucun PNJ ne sera retiré.')
    }
  }
  return PS_COMBATS
}

/**
 * `entity.type` donne l'id (« pixelmon:npc ») via KubeJS. On accepte aussi la
 * clé de traduction, au cas où Rhino retomberait sur EntityType.toString().
 */
function psEstSauvage (e) {
  const type = String(e.type)
  if (type !== PS_TYPE && type !== 'entity.pixelmon.npc') return false
  if (e.removed) return false
  /* `=== false` et pas `!` : si la propriété venait à manquer (undefined), le
   * PNJ est considéré comme persistant et laissé tranquille. */
  return e.persistenceRequired === false
}

/**
 * Genre d'un PNJ de PixelGO - NPC : 'rival', 'marchand', ou '' pour tout autre.
 * Lu comme le fait le mod (PixelmonBridge.rivalTier) : la clé du preset lié
 * (pixelgo_npc:rival/kyusama_N, pixelgo_npc:trader/...), sinon la clé de
 * traduction du titre (pixelgo_npc.rival.tier.N, pixelgo_npc.trader.title.X).
 */
function psGenreNpc (e) {
  var cle = ''
  var titre = ''
  try {
    cle = String(e.getLinkedPresetKey())
  } catch (err) {
    cle = ''
  }
  if (cle.indexOf('pixelgo_npc:rival') === 0) return 'rival'
  if (cle.indexOf('pixelgo_npc:trader') === 0) return 'marchand'
  try {
    titre = String(e.getTitle().getContents())
  } catch (err) {
    titre = ''
  }
  if (titre.indexOf('pixelgo_npc.rival.') >= 0) return 'rival'
  if (titre.indexOf('pixelgo_npc.trader.') >= 0) return 'marchand'
  return ''
}

/** Âge en secondes, ou -1 si `tickCount` n'est pas lisible. */
function psAge (e) {
  const ticks = e.tickCount
  return typeof ticks === 'number' ? ticks / 20 : -1
}

function psProteges (combattants, e) {
  const r2 = PS_RAYON_COMBAT * PS_RAYON_COMBAT
  for (let i = 0; i < combattants.length; i++) {
    const c = combattants[i]
    const dx = e.x - c.x
    const dy = e.y - c.y
    const dz = e.z - c.z
    if (dx * dx + dy * dy + dz * dz <= r2) return true
  }
  return false
}

function psRetirer (e, raison) {
  e.discard()
  if (PS_DEBUG) {
    console.info('[PixelGO/PnjSauvages] PNJ retiré (' + raison + ') en ' +
      Math.floor(e.x) + ' ' + Math.floor(e.y) + ' ' + Math.floor(e.z))
  }
}

/** Un passage autour d'un joueur. */
function psTraiter (joueur, combattants) {
  const x = joueur.x
  const y = joueur.y
  const z = joueur.z
  const boite = AABB.of(x - PS_RAYON, y - PS_RAYON, z - PS_RAYON, x + PS_RAYON, y + PS_RAYON, z + PS_RAYON)

  const pnj = []
  joueur.level.getEntitiesWithin(boite).forEach(e => {
    if (psEstSauvage(e)) pnj.push({ entite: e, age: psAge(e), genre: psGenreNpc(e) })
  })
  if (pnj.length === 0) return

  // Les plus anciens d'abord : ce sont eux qu'on garde.
  pnj.sort((a, b) => b.age - a.age)

  let gardes = 0
  pnj.forEach(p => {
    const protege = psProteges(combattants, p.entite)
    const vie = p.genre === 'rival' ? PS_DUREE_VIE_RIVAL_S : PS_DUREE_VIE_S
    if (!protege && p.age > vie) {
      psRetirer(p.entite, 'durée de vie')
      return
    }
    // Rivaux et marchands de PixelGO - NPC : hors plafond (voir PS_DUREE_VIE_RIVAL_S)
    if (p.genre !== '') return
    if (gardes < PS_MAX || protege) {
      gardes++
      return
    }
    psRetirer(p.entite, 'plafond')
  })
}

/* ---------------------------------------------------------------------------
 *  Boucle serveur
 * ------------------------------------------------------------------------ */
ServerEvents.tick(event => {
  PS_TICK++
  if (PS_TICK % PS_PERIODE_TICKS !== 0) return

  const server = event.server
  if (server.players.length === 0) return

  const combats = psCombats()
  if (!combats) return

  const combattants = []
  server.players.forEach(joueur => {
    try {
      if (combats.inBattle(joueur)) combattants.push({ x: joueur.x, y: joueur.y, z: joueur.z })
    } catch (err) {
      // État inconnu : traité comme un combat, par prudence.
      combattants.push({ x: joueur.x, y: joueur.y, z: joueur.z })
    }
  })

  server.players.forEach(joueur => {
    if (joueur.spectator) return
    try {
      psTraiter(joueur, combattants)
    } catch (err) {
      console.error('[PixelGO/PnjSauvages] Échec du passage pour ' + joueur.username + ' : ' + err)
    }
  })
})
