// priority: 50
/* =============================================================================
 *  PixelGO — /pokekill automatique
 * =============================================================================
 *  Nettoie les Pokémon sauvages toutes les 10 minutes, avec préavis en chat.
 *
 *  POURQUOI DES AVERTISSEMENTS AVANT, ET PAS SEULEMENT UN MESSAGE APRÈS
 *  -------------------------------------------------------------------
 *  Un `/pokekill` sans préavis fait disparaître le shiny qu'on poursuit depuis
 *  deux minutes. On prévient donc à 60 s puis à 10 s : le joueur a le temps de
 *  lancer sa ball ou de renoncer. Le message d'après-coup sert seulement à
 *  expliquer pourquoi la zone s'est vidée.
 *
 *  HORLOGE PLUTÔT QUE COMPTEUR DE TICKS
 *  ------------------------------------
 *  Un `tick % 12000` dérive dès que le serveur descend sous 20 TPS : avec un
 *  pack de cette taille, « toutes les 10 minutes » deviendrait « toutes les
 *  12 ou 13 minutes » aux heures chargées, et les préavis tomberaient à côté.
 *  On planifie donc sur `Date.now()`, et la boucle de ticks ne sert qu'à venir
 *  regarder l'heure une fois par seconde.
 *
 *  Voir aussi la note de `PG.maintenant` dans 04_pg_lib.js : `getGameTime()`
 *  n'est de toute façon pas appelable depuis Rhino.
 * ========================================================================== */

/* --- Réglages ------------------------------------------------------------ */
/** Intervalle entre deux nettoyages. */
const PK_PERIODE_MS = 10 * 60 * 1000

/** Préavis, en secondes avant le nettoyage. Ordre libre. */
const PK_PREAVIS_S = [60, 10]

/** La commande lancée depuis la console du serveur (permission 4). */
const PK_COMMANDE = 'pokekill'

/** Fréquence de consultation de l'horloge, en ticks (20 = 1 s). */
const PK_VERIF_TICKS = 20

/**
 * Sauter le cycle quand personne n'est connecté. Évite de tourner dans le vide
 * et, surtout, garantit qu'un joueur qui se connecte ne se prend pas un
 * nettoyage dans les secondes qui suivent sans avoir vu le moindre préavis.
 */
const PK_SAUTER_SI_VIDE = true

/* --- État ---------------------------------------------------------------- */
let PK_PROCHAIN = 0        // horodatage du prochain nettoyage (0 = à initialiser)
let PK_PREAVIS_FAITS = {}  // secondes -> préavis déjà envoyé pour ce cycle
let PK_TICK = 0

/** Diffuse une ligne à tous les joueurs connectés. */
function pkAnnonce (server, texte, couleur) {
  const msg = Text.of(texte).color(couleur)
  server.players.forEach(joueur => {
    try {
      joueur.tell(msg)
    } catch (err) {
      console.warn('[PixelGO/PokekillAuto] Message non délivré à ' + joueur.username + ' : ' + err)
    }
  })
}

/** Repart pour un tour complet. */
function pkReplanifier (maintenant) {
  PK_PROCHAIN = maintenant + PK_PERIODE_MS
  PK_PREAVIS_FAITS = {}
}

function pkNettoyer (server) {
  let resultat = 0
  try {
    resultat = server.runCommandSilent(PK_COMMANDE)
  } catch (err) {
    console.error('[PixelGO/PokekillAuto] Échec de /' + PK_COMMANDE + ' : ' + err)
    return
  }

  /* `runCommandSilent` renvoie 0 quand la commande a échoué — commande
   * inconnue, permission refusée. Sans cette trace, la panne serait
   * silencieuse : le chat annoncerait un nettoyage qui n'a pas eu lieu. */
  if (!resultat) {
    console.warn('[PixelGO/PokekillAuto] /' + PK_COMMANDE +
      ' a renvoyé 0 — commande refusée, ou aucun Pokémon à retirer.')
  }

  pkAnnonce(server, '✖ Wild Pokémon have been cleared.', '#AAAAAA')
}

/* ---------------------------------------------------------------------------
 *  Boucle serveur
 * ------------------------------------------------------------------------ */
ServerEvents.tick(event => {
  PK_TICK++
  if (PK_TICK % PK_VERIF_TICKS !== 0) return

  const server = event.server
  const maintenant = Date.now()

  /* Premier passage, ou reprise après un /reload : on pose l'échéance. */
  if (!PK_PROCHAIN) {
    pkReplanifier(maintenant)
    return
  }

  if (PK_SAUTER_SI_VIDE && server.players.length === 0) {
    pkReplanifier(maintenant)
    return
  }

  const restantMs = PK_PROCHAIN - maintenant

  if (restantMs > 0) {
    PK_PREAVIS_S.forEach(secondes => {
      if (PK_PREAVIS_FAITS[secondes]) return
      if (restantMs > secondes * 1000) return
      PK_PREAVIS_FAITS[secondes] = true
      pkAnnonce(server,
        '⚠ Wild Pokémon will be cleared in ' + secondes + ' seconds.',
        secondes <= 10 ? '#FF5555' : '#FFAA00')
    })
    return
  }

  pkNettoyer(server)
  pkReplanifier(maintenant)
})
