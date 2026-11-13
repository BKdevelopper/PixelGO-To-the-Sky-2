// priority: 50
/* =============================================================================
 *  PixelGO — Ticket horaire
 * =============================================================================
 *  Offre un `kubejs:light_gray_ticket` par HEURE DE JEU EFFECTIVE.
 *
 *  POURQUOI DU TEMPS DE JEU ET PAS DE L'HORLOGE
 *  --------------------------------------------
 *  Deux implémentations naïves ouvrent chacune une faille :
 *
 *    1. Un compteur de session (non persistant) : la déconnexion remet la
 *       progression à zéro. Un joueur qui tombe à 59 min perd tout.
 *    2. Un `prochainTicket = maintenant + 1 h` stocké en dur : le temps passé
 *       HORS LIGNE compte. Il suffit de se connecter une fois par jour pour
 *       encaisser la récolte — on est payé à ne pas jouer.
 *
 *  On stocke donc un CUMUL de seulement le temps réellement passé en ligne :
 *
 *    - le cumul vit dans les données persistantes du joueur -> la déco/reco ne
 *      le remet pas à zéro, et il survit à un redémarrage du serveur ;
 *    - à chaque passage on ne crédite que l'écart écoulé DEPUIS LE PASSAGE
 *      PRÉCÉDENT de ce joueur. À la connexion aucune référence n'existe : on
 *      l'initialise sans rien créditer, donc le temps hors ligne est perdu ;
 *    - l'écart est plafonné (`TH_DELTA_MAX_MS`). Même si un lag serveur ou une
 *      entrée fantôme laissait traîner un horodatage périmé, le joueur ne peut
 *      pas encaisser d'un coup plusieurs minutes qu'il n'a pas jouées.
 *
 *  Conséquence voulue : se déconnecter ne fait ni perdre ni gagner de temps.
 *  Le reliquat est conservé (on soustrait une heure, on ne remet pas à zéro),
 *  donc rien ne se perd entre deux tickets.
 *
 *  Horloge : `Date.now()`, jamais `level.getGameTime()` — voir la note de
 *  `PG.maintenant` dans 04_pg_lib.js, cet accesseur n'est pas appelable depuis
 *  Rhino. `Date.now()` est côté serveur : le client ne peut pas le manipuler.
 * ========================================================================== */

/* --- Réglages ------------------------------------------------------------ */
const TH_TICKET = 'kubejs:light_gray_ticket'

/** Temps de jeu à accumuler pour un ticket.
 *  ÉCONOMIE : la valeur de test (30 min) était restée en place — deux tickets
 *  par heure au lieu d'un. Un ticket MK 0 se fabrique avec 8 cannes à sucre
 *  enchantées, soit 1 280 cannes (~51 000 $ de ventes) : le doubler revenait à
 *  offrir une ferme entière toutes les heures. Retour à UNE heure. */
const TH_OBJECTIF_MS = 60 * 60 * 1000

/** Période de la boucle de comptage, en ticks (100 = 5 s). */
const TH_PERIODE_TICKS = 100

/** Plafond d'un crédit unitaire : garde-fou anti-rattrapage. */
const TH_DELTA_MAX_MS = 15 * 1000

/** Clé du cumul dans les données persistantes du joueur. */
const TH_CLE_CUMUL = 'pixelgo_ticket_horaire_cumul'

/** custom/challenge.ogg, déclaré dans kubejs/assets/minecraft/sounds.json. */
const TH_SON = 'minecraft:ui.toast.challenge_complete'

/**
 * Ne créditer que le temps d'un joueur ACTIF.
 *
 * ÉCONOMIE : désactivé, un joueur posé AFK 24 h encaissait 24 tickets (48 avec
 * l'ancienne valeur de test). La version stricte d'origine — avoir bougé entre
 * deux passages de 5 s — pénalisait un combat Pixelmon ou un menu. On garde
 * donc une TOLÉRANCE : le temps compte tant que le joueur a bougé d'au moins
 * un bloc dans les `TH_INACTIVITE_MAX_MS` précédentes. Un combat, un tri
 * d'inventaire ou un élevage passent sans perte ; une nuit d'AFK ne rapporte
 * rien au-delà des 5 premières minutes.
 */
const TH_EXIGER_ACTIVITE = true

/** Fenêtre de tolérance d'immobilité avant que le compteur ne se fige. */
const TH_INACTIVITE_MAX_MS = 5 * 60 * 1000

/* --- État en mémoire -----------------------------------------------------
 *  uuid -> { t: horodatage du dernier passage, e: empreinte de position }
 *  Volontairement NON persistant : c'est ce qui fait qu'une reconnexion ne
 *  crédite pas le temps hors ligne.
 * ------------------------------------------------------------------------ */
const TH_SUIVI = {}
let TH_TICK = 0

/** Identifiant stable du joueur, avec repli sur le pseudo. */
function thCle (player) {
  try {
    return String(player.uuid)
  } catch (e) {
    return String(player.username)
  }
}

/* --- Accès au cumul ------------------------------------------------------
 *  On n'utilise PAS `PG.lire` ici. Ce helper renvoie sa valeur par défaut
 *  quand la lecture échoue, ce qui convient à un cooldown (au pire on
 *  autorise l'action) mais est destructeur pour un COMPTEUR : « illisible »
 *  deviendrait « zéro », et le cumul repartirait de rien à chaque passage
 *  sans jamais atteindre l'objectif — c'est exactement le symptôme qu'avait
 *  produit le bug `redeclaration of var data` de 04_pg_lib.js.
 *
 *  Ici une lecture ratée renvoie `null`, distinct de 0, et le passage est
 *  abandonné sans rien écrire : on préfère perdre 5 s de comptage plutôt que
 *  d'écraser la progression du joueur.
 * ------------------------------------------------------------------------ */
let TH_ALERTE_LECTURE = false

function thLireCumul (player) {
  /* PIÈGE RHINO : ne JAMAIS écrire `const`/`let` directement dans un bloc
   * `try`. Rhino (le moteur JS de KubeJS) le traite comme une redéclaration
   * et lève « redeclaration of var <nom> » à chaque appel — l'exception part
   * dans le catch, et la fonction renvoie son cas d'échec pour toujours.
   * Renommer la variable ne change rien, c'est la POSITION qui compte : la
   * déclaration doit vivre dans le corps de la fonction, l'affectation peut
   * rester dans le try. Même correctif appliqué à `PG.lire` (04_pg_lib.js).
   * Les blocs `if` et `for` ne posent pas ce problème. */
  let donnees = null
  try {
    donnees = player.persistentData
    return donnees.contains(TH_CLE_CUMUL) ? Number(donnees.getLong(TH_CLE_CUMUL)) : 0
  } catch (err) {
    if (!TH_ALERTE_LECTURE) {
      TH_ALERTE_LECTURE = true
      console.error('[PixelGO/HourlyTicket] Could not read the playtime counter, counting paused: ' + err)
    }
    return null
  }
}

function thEcrireCumul (player, valeur) {
  try {
    player.persistentData.putLong(TH_CLE_CUMUL, Math.floor(valeur))
    return true
  } catch (err) {
    console.error('[PixelGO/HourlyTicket] Could not save the playtime counter: ' + err)
    return false
  }
}

/** Empreinte grossière de la position, pour la détection d'inactivité. */
function thEmpreinte (player) {
  try {
    return Math.floor(player.x) + ':' + Math.floor(player.y) + ':' + Math.floor(player.z)
  } catch (e) {
    return ''
  }
}

/* --- Message arc-en-ciel -------------------------------------------------
 *  Codes couleur hérités (§) dans UNE seule chaîne, plutôt qu'un composant
 *  `Text` par caractère. Deux raisons :
 *    - un message de 9 caractères produisait 8 composants imbriqués, chacun
 *      avec sa couleur et son gras : beaucoup de surface pour un simple
 *      « +1 ticket » ;
 *    - les codes § sont interprétés par le client lui-même, donc le rendu ne
 *      dépend plus de la façon dont la chaîne de composants est sérialisée.
 *  AUCUNE EXTRACTION DE CARACTÈRE DEPUIS UNE CHAÎNE
 *  ------------------------------------------------
 *  Sous Rhino, `texte.charAt(k)` ET `texte.substring(k, k + 1)` renvoient
 *  tous deux le PREMIER caractère quel que soit `k` : l'appel part vers
 *  `java.lang.String` sans que l'index suive. Vérifié en jeu — la fonction
 *  produisait « +++++++++ », neuf fois le « + » de « +1 ticket », espace
 *  compris, ce que le chat affichait fidèlement.
 *
 *  Les lettres sont donc écrites une par une dans un tableau JS. Un tableau
 *  littéral ne traverse aucune interop Java : c'est le seul moyen sûr.
 * ------------------------------------------------------------------------ */
const TH_LETTRES = ['+', '1', ' ', 'T', 'i', 'c', 'k', 'e', 't']
const TH_PALETTE = ['#FF5555', '#FFAA00', '#FFFF55', '#55FF55', '#55FFFF', '#5555FF', '#FF55FF']

/** Composant JSON du titre, une couleur par lettre. */
function thTitreJson () {
  const parties = []
  let i = 0
  TH_LETTRES.forEach(c => {
    if (c === ' ') {
      parties.push({ text: ' ' })
      return
    }
    parties.push({ text: c, color: TH_PALETTE[i % TH_PALETTE.length], bold: true })
    i++
  })
  return JSON.stringify(parties)
}

/** Le même texte en clair, pour le journal. */
function thTexteBrut () {
  return TH_LETTRES.join('')
}

function thRecompenser (player) {
  const json = thTitreJson()
  try {
    player.give(Item.of(TH_TICKET))

    /* Affichage au CENTRE DE L'ÉCRAN plutôt que dans le chat. Le titre prend
     * un composant JSON complet : chaque lettre porte sa propre couleur sans
     * code § et sans la moindre manipulation de chaîne.
     * `times` : 5 ticks d'apparition, 40 de maintien, 10 de disparition. */
    player.server.runCommandSilent('title ' + player.username + ' times 5 40 10')
    player.server.runCommandSilent('title ' + player.username + ' title ' + json)

    PG.son(player, TH_SON, 1.0, 1.0)
    /* Trace serveur : le son seul ne prouve rien, `ui.toast.challenge_complete`
     * est aussi l'évènement des toasts de succès vanilla (remplacé par
     * challenge.ogg dans assets/minecraft/sounds.json). */
    console.info('[PixelGO/HourlyTicket] Ticket given to ' + player.username +
      ' — title shown: ' + thTexteBrut())
  } catch (err) {
    console.error('[PixelGO/HourlyTicket] Could not give the ticket to ' + player.username + ': ' + err)
  }
}

/* ---------------------------------------------------------------------------
 *  Comptabilisation
 *  Retourne le nombre de tickets remis (0 ou plus).
 * ------------------------------------------------------------------------ */
function thComptabiliser (player, maintenant, recompenser) {
  const cle = thCle(player)
  const etat = TH_SUIVI[cle]

  /* Première vue depuis la connexion (ou depuis un redémarrage) : on pose la
   * référence sans rien créditer. C'est ici que le temps hors ligne est
   * écarté. */
  if (!etat) {
    TH_SUIVI[cle] = { t: maintenant, e: thEmpreinte(player), a: maintenant }
    return 0
  }

  let delta = maintenant - etat.t
  etat.t = maintenant

  if (delta <= 0) return 0
  if (delta > TH_DELTA_MAX_MS) delta = TH_DELTA_MAX_MS

  /* Spectateurs et faux joueurs ne cumulent rien — l'horodatage a déjà été
   * rafraîchi, ils ne rattraperont donc pas ce temps en redevenant actifs. */
  if (player.fake || player.spectator) return 0

  if (TH_EXIGER_ACTIVITE) {
    const empreinte = thEmpreinte(player)
    if (empreinte !== etat.e) {
      etat.e = empreinte
      etat.a = maintenant            // dernière activité constatée
    }
    // `a` absent (état posé avant ce correctif, /reload en cours de partie) :
    // on part du principe que le joueur vient d'agir.
    if (!etat.a) etat.a = maintenant
    if (maintenant - etat.a > TH_INACTIVITE_MAX_MS) return 0
  }

  const precedent = thLireCumul(player)
  if (precedent === null) return 0   // lecture cassée : on ne touche à rien

  let cumul = precedent + delta
  let remis = 0

  while (cumul >= TH_OBJECTIF_MS) {
    cumul -= TH_OBJECTIF_MS
    remis++
  }

  /* On n'annonce le ticket QUE si le nouveau cumul est bien enregistré :
   * sinon le joueur serait payé en boucle sur la même heure. */
  if (!thEcrireCumul(player, cumul)) return 0

  if (recompenser) {
    for (let i = 0; i < remis; i++) thRecompenser(player)
  }

  return remis
}

/* ---------------------------------------------------------------------------
 *  Boucle serveur
 * ------------------------------------------------------------------------ */
ServerEvents.tick(event => {
  TH_TICK++
  if (TH_TICK % TH_PERIODE_TICKS !== 0) return

  const maintenant = Date.now()

  event.server.players.forEach(joueur => {
    try {
      thComptabiliser(joueur, maintenant, true)
    } catch (err) {
      console.error('[PixelGO/HourlyTicket] Counting failed for ' + joueur.username + ': ' + err)
    }
  })
})

/* ---------------------------------------------------------------------------
 *  Connexion / déconnexion
 * ------------------------------------------------------------------------ */
PlayerEvents.loggedIn(event => {
  /* Pose la référence tout de suite : sans ça, le premier passage de la boucle
   * la poserait de toute façon, mais on perdrait jusqu'à 5 s de comptage. */
  TH_SUIVI[thCle(event.player)] = { t: Date.now(), e: thEmpreinte(event.player), a: Date.now() }
})

PlayerEvents.loggedOut(event => {
  const joueur = event.player
  const cle = thCle(joueur)
  if (!TH_SUIVI[cle]) return

  /* Dernier crédit avant de partir, pour ne pas perdre la fraction en cours.
   * On ne remet PAS de ticket ici (l'inventaire se ferme) : si le cumul
   * dépasse l'objectif, la boucle le remettra au retour du joueur. */
  try {
    thComptabiliser(joueur, Date.now(), false)
  } catch (err) {
    console.error('[PixelGO/HourlyTicket] Logout credit failed for ' + joueur.username + ': ' + err)
  }

  delete TH_SUIVI[cle]
})
