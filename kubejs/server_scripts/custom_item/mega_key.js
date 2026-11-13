/* =============================================================================
 *  Clé Méga — invoque un Pokémon Méga en boss « ultimate ».
 * =============================================================================
 *  Correctifs Phase 2 / module 1 :
 *   · BUG-07 — le handler était global (exécuté à CHAQUE clic droit de CHAQUE
 *     joueur). Il est maintenant filtré sur l'item.
 *   · §10 — ajout du cooldown d'invocation (PGC.events.invocationBossCooldown),
 *     sans quoi l'item inondait le serveur de boss.
 *   · CORRECTIF — `player.level.getGameTime()` levait « Cannot find function
 *     getGameTime in object ServerLevel » : Rhino n exposait pas cet accesseur.
 *     Le cooldown passe par PG.maintenant() / PG.restant(), en millisecondes
 *     d horloge réelle (voir 04_pg_lib.js).
 * ========================================================================== */

/* Liste régénérée depuis `data/pixelmon/species/*.json` de Pixelmon 9.4.0 :
 * les 54 formes dont le nom commence par « mega », en ordre de Pokédex.
 * Corrections au passage :
 *   · Lapras Méga RETIRÉ — cette forme n'existe pas (Lapras n'a que base et
 *     gmax), la Clé Méga tombait donc sur un `pokespawn` qui échouait.
 *   · AJOUTÉS : Raichu MégaX/MégaY, Starmie, Dragonite, Darkrai, Chandelure.
 * Pixelmon 9.4.2 (2026-10-24) : 59 formes. AJOUTÉS : Clefable, Chimecho,
 * Eelektross, Drampa, Zeraora. La palette « festival » de Méga-Chimecho ne peut
 * pas sortir d'ici : le palier de boss `ultimate` impose sa palette
 * (`alwaysPalette: shiny`, data/pixelmon/bosstiers/ultimate.json) après le spec.
 * Le palier donne aussi la méga-gemme du boss vaincu (megaStoneObtainChance 1). */
const MK_MEGAS = [
  { pokemon: 'Venusaur',    forme: 'Mega'  }, { pokemon: 'Charizard',   forme: 'MegaX' },
  { pokemon: 'Charizard',   forme: 'MegaY' }, { pokemon: 'Blastoise',   forme: 'Mega'  },
  { pokemon: 'Beedrill',    forme: 'Mega'  }, { pokemon: 'Pidgeot',     forme: 'Mega'  },
  { pokemon: 'Raichu',      forme: 'MegaX' }, { pokemon: 'Raichu',      forme: 'MegaY' },
  { pokemon: 'Clefable',    forme: 'Mega'  },
  { pokemon: 'Alakazam',    forme: 'Mega'  }, { pokemon: 'Slowbro',     forme: 'Mega'  },
  { pokemon: 'Gengar',      forme: 'Mega'  }, { pokemon: 'Kangaskhan',  forme: 'Mega'  },
  { pokemon: 'Starmie',     forme: 'Mega'  }, { pokemon: 'Pinsir',      forme: 'Mega'  },
  { pokemon: 'Gyarados',    forme: 'Mega'  }, { pokemon: 'Aerodactyl',  forme: 'Mega'  },
  { pokemon: 'Dragonite',   forme: 'Mega'  }, { pokemon: 'Mewtwo',      forme: 'MegaX' },
  { pokemon: 'Mewtwo',      forme: 'MegaY' }, { pokemon: 'Ampharos',    forme: 'Mega'  },
  { pokemon: 'Steelix',     forme: 'Mega'  }, { pokemon: 'Scizor',      forme: 'Mega'  },
  { pokemon: 'Heracross',   forme: 'Mega'  }, { pokemon: 'Houndoom',    forme: 'Mega'  },
  { pokemon: 'Tyranitar',   forme: 'Mega'  }, { pokemon: 'Sceptile',    forme: 'Mega'  },
  { pokemon: 'Blaziken',    forme: 'Mega'  }, { pokemon: 'Swampert',    forme: 'Mega'  },
  { pokemon: 'Gardevoir',   forme: 'Mega'  }, { pokemon: 'Sableye',     forme: 'Mega'  },
  { pokemon: 'Mawile',      forme: 'Mega'  }, { pokemon: 'Aggron',      forme: 'Mega'  },
  { pokemon: 'Medicham',    forme: 'Mega'  }, { pokemon: 'Manectric',   forme: 'Mega'  },
  { pokemon: 'Sharpedo',    forme: 'Mega'  }, { pokemon: 'Camerupt',    forme: 'Mega'  },
  { pokemon: 'Altaria',     forme: 'Mega'  }, { pokemon: 'Banette',     forme: 'Mega'  },
  { pokemon: 'Chimecho',    forme: 'Mega'  },
  { pokemon: 'Absol',       forme: 'Mega'  }, { pokemon: 'Glalie',      forme: 'Mega'  },
  { pokemon: 'Salamence',   forme: 'Mega'  }, { pokemon: 'Metagross',   forme: 'Mega'  },
  { pokemon: 'Latias',      forme: 'Mega'  }, { pokemon: 'Latios',      forme: 'Mega'  },
  { pokemon: 'Rayquaza',    forme: 'Mega'  }, { pokemon: 'Lopunny',     forme: 'Mega'  },
  { pokemon: 'Garchomp',    forme: 'Mega'  }, { pokemon: 'Lucario',     forme: 'Mega'  },
  { pokemon: 'Abomasnow',   forme: 'Mega'  }, { pokemon: 'Gallade',     forme: 'Mega'  },
  { pokemon: 'Darkrai',     forme: 'Mega'  }, { pokemon: 'Audino',      forme: 'Mega'  },
  { pokemon: 'Eelektross',  forme: 'Mega'  }, { pokemon: 'Chandelure',  forme: 'Mega'  },
  { pokemon: 'Diancie',     forme: 'Mega'  }, { pokemon: 'Drampa',      forme: 'Mega'  },
  { pokemon: 'Zeraora',     forme: 'Mega'  }
]


ItemEvents.rightClicked('kubejs:mega_key', event => {
  const player = event.player
  if (player.fake) return
  // Le clic droit peut remonter pour les deux mains : on n'agit qu'une fois.
  if (String(event.hand) !== 'MAIN_HAND') return

  const maintenant = PG.maintenant()
  const prochain = PG.lire(player, PG_CLE_INVOCATION, 0)

  if (maintenant < prochain) {
    const restant = PG.restant(prochain)
    PG.erreur(player, `Summon on cooldown — ${restant} s left.`)
    return
  }

  const cible = MK_MEGAS[Math.floor(Math.random() * MK_MEGAS.length)]
  event.item.count--
  PG.ecrire(player, PG_CLE_INVOCATION,
    maintenant + PGC.events.invocationBossCooldown * 1000)

  player.server.runCommandSilent(
    `execute at ${player.username} as ${player.username} run pokespawn ${cible.pokemon} f:${cible.forme} boss:ultimate`)

  PG.son(player, 'boss_invoc', 1.0, 1.0)
  PG.feedbackRarete(player, 6,
    `Mega ${cible.pokemon}`,
    PG.txt('bursts from the Mega Key!', PGC.couleurs.systeme))
  PG.dire(player,
    PG.nomRare(`Mega ${cible.pokemon}`, 6),
    PG.txt(' has been summoned.', PGC.couleurs.systeme))
})
