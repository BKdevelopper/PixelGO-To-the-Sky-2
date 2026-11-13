// priority: 50
/* =============================================================================
 *  PixelGO — To the Sky : quêtes « Terminer un Gate » (2026-11-09)
 * =============================================================================
 *  Le chapitre Gates a une quête par rang (E … DEMON) à valider en TERMINANT un
 *  Gate de ce rang. Chacune est une tâche FTB Quests de type `stage` :
 *
 *      pixelgo_gate_clear_<rang>      (e, d, c, b, a, s, ss, sss, demon)
 *
 *  Ce script donne ce stage (stages KubeJS, lus par FTB Quests via FTB XMod
 *  Compat, `stage_selector: "default"`).
 *
 *  COMMENT ON SAIT QU'UN GATE EST TERMINÉ
 *  --------------------------------------
 *  pixelgo_dungeon 4.3 n'expose ni évènement ni advancement. Mais quand le boss
 *  tombe, DungeonManager passe l'instance en CLEARED et pose, dans la salle du
 *  boss, un GateEntity de SORTIE (`GateSpawner.placeExitGate`) qui porte le
 *  rang du donjon. Cette porte n'existe QUE pour un donjon terminé.
 *
 *  Donc : toutes les secondes, pour chaque joueur dans la dimension
 *  `pixelgo_dungeon:dungeon`, on cherche une porte de sortie autour de lui.
 *  S'il y en a une, il a terminé ce Gate. Le rayon est large (le joueur peut
 *  s'être éloigné du boss), et les donjons sont posés sur des emplacements
 *  très espacés : on ne peut pas voir la sortie d'un autre donjon.
 *
 *  Même motif que 58_pnj_sauvages.js (boucle ServerEvents.tick, et pas
 *  scheduleInTicks : voir 70_skyblock_autocreate.js).
 * ========================================================================== */

const GQ_PERIODE_TICKS = 20
const GQ_RAYON = 64
const GQ_DIMENSION = 'pixelgo_dungeon:dungeon'
const GQ_PREFIXE = 'pixelgo_gate_clear_'
const GQ_RANGS = ['e', 'd', 'c', 'b', 'a', 's', 'ss', 'sss', 'demon']
const GQ_DEBUG = false

let GQ_TICK = 0

/** Le rang d'une porte de SORTIE (en minuscules), ou null. */
function gqRangSortie (e) {
  const type = String(e.type)
  if (type.indexOf('pixelgo_dungeon') < 0 || type.indexOf('gate') < 0) return null
  if (e.removed) return null
  let sortie = false
  try {
    sortie = e.isExitGate() === true
  } catch (err) {
    return null
  }
  if (!sortie) return null
  let rang = null
  try {
    rang = String(e.getRank().getId()).toLowerCase()
  } catch (err) {
    try {
      rang = String(e.getRank().name()).toLowerCase()
    } catch (err2) {
      return null
    }
  }
  return GQ_RANGS.indexOf(rang) >= 0 ? rang : null
}

function gqTraiter (joueur) {
  if (String(joueur.level.dimension) !== GQ_DIMENSION) return
  const x = joueur.x
  const y = joueur.y
  const z = joueur.z
  const boite = AABB.of(x - GQ_RAYON, y - GQ_RAYON, z - GQ_RAYON, x + GQ_RAYON, y + GQ_RAYON, z + GQ_RAYON)

  let rang = null
  joueur.level.getEntitiesWithin(boite).forEach(e => {
    if (rang) return
    rang = gqRangSortie(e)
  })
  if (!rang) return

  const stage = GQ_PREFIXE + rang
  if (joueur.stages.has(stage)) return
  joueur.stages.add(stage)
  joueur.tell(Text.of('✔ Rank ' + rang.toUpperCase() + ' Gate cleared! ').color('#2CB67D').bold(true)
    .append(Text.of('The quest is done in the Gates chapter.').color('#AAAAAA').bold(false)))
  if (GQ_DEBUG) console.info('[PixelGO/Gates] ' + joueur.username + ' -> ' + stage)
}

ServerEvents.tick(event => {
  GQ_TICK++
  if (GQ_TICK % GQ_PERIODE_TICKS !== 0) return
  const server = event.server
  if (server.players.length === 0) return
  server.players.forEach(joueur => {
    try {
      gqTraiter(joueur)
    } catch (err) {
      console.error('[PixelGO/Gates] Échec du passage pour ' + joueur.username + ' : ' + err)
    }
  })
})
