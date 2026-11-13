/* =============================================================================
 *  Ticket SSR — invoque un Pokémon légendaire (4 % de chance shiny).
 * =============================================================================
 *  Correctifs Phase 2 / module 1 :
 *   · BUG-07 — handler filtré sur l'item (était global).
 *   · BUG-08 — `player.tell('l§e…')` : le § manquant affichait un « l » parasite.
 *   · §10 — cooldown d'invocation partagé avec la Clé Méga.
 *  Le cri du Pokémon invoqué est joué : les 857 événements sonores Pixelmon
 *  incluent `pixelmon:pixelmon.mob.<nom>` pour l'essentiel du roster.
 *   · CORRECTIF — `player.level.getGameTime()` levait « Cannot find function
 *     getGameTime in object ServerLevel » : Rhino n exposait pas cet accesseur.
 *     Le cooldown passe par PG.maintenant() / PG.restant(), en millisecondes
 *     d horloge réelle (voir 04_pg_lib.js).
 * ========================================================================== */

/* Liste vérifiée contre `data/pixelmon/species/*.json` de Pixelmon 9.4.0 :
 * ce sont EXACTEMENT les 71 espèces dont une forme porte le tag `legendary`.
 * Les noms sont ceux du champ `name` des fichiers d'espèce (TapuKoko sans
 * espace, Ho-Oh avec tiret, etc.) : ce sont ceux que `pokespawn` attend.
 * Les 23 « mythiques » (Mew, Celebi, Arceus...) et les 11 Ultra-Chimères ne
 * sont volontairement PAS dans le ticket SSR. */
const SSR_LEGENDAIRES = [
  // Gen I
  'Articuno', 'Zapdos', 'Moltres', 'Mewtwo',
  // Gen II
  'Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh',
  // Gen III
  'Regirock', 'Regice', 'Registeel', 'Latias', 'Latios', 'Groudon', 'Kyogre', 'Rayquaza',
  // Gen IV
  'Uxie', 'Mesprit', 'Azelf', 'Dialga', 'Palkia', 'Giratina', 'Heatran', 'Regigigas', 'Cresselia',
  // Gen V
  'Cobalion', 'Terrakion', 'Virizion', 'Tornadus', 'Thundurus', 'Landorus',
  'Reshiram', 'Zekrom', 'Kyurem',
  // Gen VI
  'Xerneas', 'Yveltal', 'Zygarde',
  // Gen VII
  'TypeNull', 'Silvally',
  'TapuKoko', 'TapuLele', 'TapuBulu', 'TapuFini', 'Cosmog', 'Cosmoem',
  'Solgaleo', 'Lunala', 'Necrozma',
  // Gen VIII
  'Zacian', 'Zamazenta', 'Eternatus', 'Kubfu', 'Urshifu', 'Regieleki', 'Regidrago',
  'Glastrier', 'Spectrier', 'Calyrex', 'Enamorus',
  // Gen IX
  'WoChien', 'ChienPao', 'TingLu', 'ChiYu', 'Koraidon', 'Miraidon',
  'Okidogi', 'Munkidori', 'Fezandipiti', 'Ogerpon', 'Terapagos'
]

const SSR_CHANCE_SHINY = 0.04

ItemEvents.rightClicked('kubejs:ssr_ticket', event => {
  const player = event.player
  if (player.fake) return
  if (String(event.hand) !== 'MAIN_HAND') return

  const maintenant = PG.maintenant()
  const prochain = PG.lire(player, PG_CLE_INVOCATION, 0)

  if (maintenant < prochain) {
    const restant = PG.restant(prochain)
    PG.erreur(player, `Summon on cooldown — ${restant} s left.`)
    return
  }

  const nom = SSR_LEGENDAIRES[Math.floor(Math.random() * SSR_LEGENDAIRES.length)]
  const shiny = Math.random() < SSR_CHANCE_SHINY

  event.item.count--
  PG.ecrire(player, PG_CLE_INVOCATION,
    maintenant + PGC.events.invocationBossCooldown * 1000)

  player.server.runCommandSilent(
    `execute at ${player.username} as ${player.username} run pokespawn ${nom}${shiny ? ' shiny' : ''}`)

  // Cri du Pokémon (silencieux sans erreur si l'espèce n'en a pas).
  PG.son(player, `pixelmon:pixelmon.mob.${nom.toLowerCase()}`, 1.0, 1.0)

  if (shiny) {
    PG.feedbackRarete(player, 7,
      `✨ ${nom} SHINY ✨`,
      PG.txt('A shiny legendary!', PGC.couleurs.argent))
    PG.dire(player,
      PG.nomRare(`${nom} shiny`, 7),
      PG.txt(' answered your call.', PGC.couleurs.systeme))
  } else {
    PG.feedbackRarete(player, 5,
      nom,
      PG.txt('A legendary appears!', PGC.couleurs.systeme))
    PG.dire(player,
      PG.nomRare(nom, 5),
      PG.txt(' answered your call.', PGC.couleurs.systeme))
  }
})
