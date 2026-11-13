// priority: 2000
/* =============================================================================
 *  PixelGO — bibliothèque commune `PG` / `PGC`
 * =============================================================================
 *  CORRECTIF DE CONVERSION
 *  -----------------------
 *  Les scripts `kubejs/server_scripts/custom_item/{mega_key,random_egg,
 *  ssr_ticket}.js` présents dans l'instance 1.21.1 appelaient déjà `PG.*`,
 *  `PGC.*` et `PG_CLE_INVOCATION`, mais AUCUN fichier ne les définissait :
 *  la Clé Méga, l'Œuf Mystère et le Ticket SSR levaient une ReferenceError à
 *  chaque clic droit. Ce fichier fournit l'implémentation manquante.
 *
 *  Chargé en priorité 2000 pour être évalué avant tous les autres scripts.
 * ========================================================================== */

/* --- Configuration ------------------------------------------------------- */
const PGC = {
  couleurs: {
    systeme: '#AAAAAA',   // gris : texte informatif
    argent: '#C0C0C0',    // shiny
    or: '#FFAA00',
    // Palette par palier de rareté (0 = banal … 7 = shiny légendaire).
    rarete: [
      '#AAAAAA', '#FFFFFF', '#55FF55', '#55FFFF',
      '#5555FF', '#AA00AA', '#FFAA00', '#FF55FF'
    ]
  },
  events: {
    // Temps de recharge partagé entre la Clé Méga et le Ticket SSR (secondes).
    invocationBossCooldown: 300
  },
  // Noms courts -> évènements sonores réels.
  sons: {
    boss_invoc: 'minecraft:entity.wither.spawn',
    drop_reveal: 'minecraft:entity.player.levelup',
    pikachu: 'minecraft:pixelgo.pikachu',
    magikarp: 'minecraft:pixelgo.magikarp'
  }
}

/** Clé NBT du cooldown d'invocation, stockée sur le joueur. */
const PG_CLE_INVOCATION = 'pixelgo_invocation_cooldown'

const PG = {
  /* --- Temps ------------------------------------------------------------
   *  `player.level.getGameTime()` NE FONCTIONNE PAS dans KubeJS 2101 :
   *  Rhino remonte « Cannot find function getGameTime in object ServerLevel ».
   *  Les accesseurs Java du style `getX()` ne sont exposés que sous forme de
   *  propriété (`level.gameTime`), et rien ne garantit que ce nom survive à un
   *  changement de mappings.
   *
   *  On passe donc les temps de recharge à l'horloge réelle, en millisecondes :
   *  `Date.now()` est du JavaScript pur, aucune réflexion Java, aucun mapping.
   *  Pour un cooldown de 60 s ou de 5 min le comportement est identique.
   *
   *  Les anciennes valeurs stockées (en ticks de monde, donc très inférieures à
   *  un timestamp en ms) sont automatiquement considérées comme expirées : la
   *  transition ne bloque personne.
   * -------------------------------------------------------------------- */
  maintenant () {
    return Date.now()
  },

  /** Secondes restantes avant `echeance` (timestamp ms), au moins 1. */
  restant (echeance) {
    return Math.max(1, Math.ceil((echeance - Date.now()) / 1000))
  },

  /* --- Données persistantes du joueur ----------------------------------
   *  Filet de sécurité : si l'accès aux données persistantes venait à casser
   *  (changement d'API KubeJS), on dégrade vers « pas de recharge » plutôt que
   *  de faire planter le handler — l'item continue de fonctionner et
   *  l'avertissement part dans le log serveur.
   * -------------------------------------------------------------------- */
  lire (player, cle, defaut) {
    /* PIÈGE RHINO : la déclaration doit rester HORS du bloc `try`. Écrite à
     * l'intérieur (`const donnees = player.persistentData`), Rhino lève
     * « redeclaration of var donnees » à chaque appel ; l'exception partait
     * dans le catch ci-dessous et TOUTES les lectures renvoyaient
     * silencieusement la valeur par défaut — les cooldowns de la Clé Méga,
     * du Ticket SSR et des sacs ne s'appliquaient donc jamais. Le nom de la
     * variable n'y est pour rien, seule sa position compte. */
    let donnees = null
    try {
      donnees = player.persistentData
      return donnees.contains(cle) ? donnees.getLong(cle) : (defaut || 0)
    } catch (e) {
      console.warn(`[PixelGO] lecture de ${cle} impossible : ${e}`)
      return defaut || 0
    }
  },

  ecrire (player, cle, valeur) {
    try {
      player.persistentData.putLong(cle, valeur)
    } catch (e) {
      console.warn(`[PixelGO] écriture de ${cle} impossible : ${e}`)
    }
  },

  /* --- Texte ------------------------------------------------------------ */
  /** Composant texte coloré. `couleur` est un code hexadécimal « #RRGGBB ». */
  txt (texte, couleur) {
    const t = Text.of(texte)
    return couleur ? t.color(couleur) : t
  },

  /** Nom mis en valeur selon le palier de rareté (0 à 7). */
  nomRare (nom, rarete) {
    const palette = PGC.couleurs.rarete
    const c = palette[Math.max(0, Math.min(palette.length - 1, rarete | 0))]
    return Text.of(nom).color(c).bold(rarete >= 5)
  },

  /* --- Retours au joueur ------------------------------------------------ */
  /* Rhino (le moteur JS de KubeJS) ne gère PAS les paramètres du reste
   * `(...args)` : la signature d'origine levait « missing formal parameter »
   * au chargement. On passe par `arguments`, qui fonctionne partout. */
  dire (player) {
    let msg = Text.of('')
    for (let i = 1; i < arguments.length; i++) {
      const c = arguments[i]
      msg = msg.append(typeof c === 'string' ? Text.of(c) : c)
    }
    player.tell(msg)
  },

  erreur (player, message) {
    player.tell(Text.of('✖ ' + message).color('#FF5555'))
  },

  son (player, nom, volume, pitch) {
    const id = PGC.sons[nom] || nom
    const v = volume === undefined ? 1.0 : volume
    const p = pitch === undefined ? 1.0 : pitch
    // On passe par /playsound : un identifiant inconnu échoue silencieusement
    // au lieu de lever une exception côté serveur.
    player.server.runCommandSilent(
      `execute at ${player.username} run playsound ${id} master ${player.username} ~ ~ ~ ${v} ${p}`)
  },

  /** Titre + sous-titre colorés selon la rareté. */
  feedbackRarete (player, rarete, titre, sousTitre) {
    const palette = PGC.couleurs.rarete
    const c = palette[Math.max(0, Math.min(palette.length - 1, rarete | 0))]
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    // `sousTitre` peut être une chaîne ou un composant KubeJS.
    const stTexte = (sousTitre && typeof sousTitre !== 'string')
      ? sousTitre.getString()
      : sousTitre

    player.server.runCommandSilent(`title ${player.username} times 5 40 10`)
    player.server.runCommandSilent(
      `title ${player.username} title {"text":"${esc(titre)}","color":"${c}","bold":${rarete >= 5}}`)
    if (stTexte) {
      player.server.runCommandSilent(
        `title ${player.username} subtitle {"text":"${esc(stTexte)}","color":"${PGC.couleurs.systeme}"}`)
    }
  }
}
