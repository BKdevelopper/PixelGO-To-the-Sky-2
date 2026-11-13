// priority: 50
/* =============================================================================
 *  PixelGO — Origines Pixelmon : migration des anciennes origines
 * =============================================================================
 *  Les calques NeoOrigins sont remplacés par tools/pixelgo-origins : seul le
 *  calque `neoorigins:origin` reste, avec uniquement les origines
 *  `pixelgo_origins:*`, et le calque `neoorigins:class` est désactivé.
 *
 *  Les anciennes origines existent toujours (elles ne sont plus proposées),
 *  donc un joueur qui en avait choisi une la garderait. À la connexion, tout
 *  joueur qui porte une origine hors `pixelgo_origins` (ou une classe) est
 *  réinitialisé : `/neoorigins reset` retire tous ses pouvoirs et rouvre
 *  l'écran de choix, gratuitement.
 * ========================================================================== */

const POM_NAMESPACE = 'pixelgo_origins'
const POM_DELAI_TICKS = 60

let POM_ATTACHEMENT = undefined

function pomAttachement () {
  if (POM_ATTACHEMENT === undefined) {
    try {
      POM_ATTACHEMENT = Java.loadClass('com.cyberday1.neoorigins.attachment.OriginAttachments').originData()
    } catch (err) {
      POM_ATTACHEMENT = null
      console.warn('[PixelGO/Origines] OriginAttachments indisponible, migration désactivée : ' + err)
    }
  }
  return POM_ATTACHEMENT
}

/** Liste « calque=origine » des choix qui ne sont plus valides. */
function pomOriginesObsoletes (player) {
  const attachement = pomAttachement()
  if (!attachement) return []
  const origines = player.getData(attachement).getOrigins()
  const obsoletes = []
  const it = origines.entrySet().iterator()
  while (it.hasNext()) {
    const e = it.next()
    const calque = String(e.getKey())
    const origine = String(e.getValue())
    if (calque !== 'neoorigins:origin' || origine.split(':')[0] !== POM_NAMESPACE) {
      obsoletes.push(calque + '=' + origine)
    }
  }
  return obsoletes
}

PlayerEvents.loggedIn(event => {
  const player = event.player
  if (player.fake) return
  const nom = player.username
  event.server.scheduleInTicks(POM_DELAI_TICKS, () => {
    try {
      let joueur = null
      event.server.players.forEach(p => { if (p.username === nom) joueur = p })
      if (!joueur) return
      const obsoletes = pomOriginesObsoletes(joueur)
      if (obsoletes.length === 0) return
      console.info('[PixelGO/Origines] ' + nom + ' : ancienne origine (' + obsoletes.join(', ') +
        '), réinitialisation')
      event.server.runCommandSilent('neoorigins reset ' + nom)
      joueur.tell(Text.gold('Les origines sont désormais 100 % Pixelmon : choisissez votre nouvelle origine !'))
    } catch (err) {
      console.error('[PixelGO/Origines] Migration impossible pour ' + nom + ' : ' + err)
    }
  })
})
