/* =============================================================================
 *  Œuf Mystère — donne un œuf de Pokémon aléatoire (jamais légendaire).
 * =============================================================================
 *  Correctif Phase 2 / module 1 :
 *   · BUG-03 — le script comparait `player.mainHandItem === 'kubejs:random_egg'`,
 *     soit un ItemStack contre une String : TOUJOURS faux. L'item ne faisait
 *     donc strictement rien depuis sa création. Le handler est maintenant
 *     filtré sur l'item, et la comparaison a disparu.
 *   · BUG-07 — handler filtré (était global).
 * ========================================================================== */

ItemEvents.rightClicked('kubejs:random_egg', event => {
  const player = event.player
  if (player.fake) return
  if (String(event.hand) !== 'MAIN_HAND') return


  event.item.count--

  player.server.runCommandSilent(
    `execute at ${player.username} as ${player.username} run pokegive ${player.username} random legendary:false egg`)

  PG.son(player, 'drop_reveal', 1.0, 1.0)
  PG.dire(player,
    PG.nomRare('Mystery Egg', 3),
    PG.txt(' — an egg joins your party.', PGC.couleurs.systeme))
})
