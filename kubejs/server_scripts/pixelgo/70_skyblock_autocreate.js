// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : création automatique de l'île
 * =============================================================================
 *  À sa toute première connexion, un joueur reçoit automatiquement son île via
 *  `/skyblock create <id>`, où `<id>` est un nombre tiré entre 1 et 1 000 000.
 *  En solo, la première connexion EST la création du monde : un seul mécanisme
 *  couvre les deux cas.
 *
 *  POURQUOI UNE FILE SUR `ServerEvents.tick` ET PAS `scheduleInTicks`
 *  -----------------------------------------------------------------
 *  La première version utilisait `server.scheduleInTicks(...)` et ne produisait
 *  RIEN : ni île, ni ligne de log, ni erreur. Aucun autre script du pack
 *  n'emploie cette API. `55_ticket_horaire.js` et `57_pokekill_auto.js` font
 *  toutes leurs temporisations avec une boucle `ServerEvents.tick` et un
 *  compteur, et ça marche — on reprend donc exactement ce motif.
 *
 *  Dans le même esprit, la résolution du joueur se fait en parcourant
 *  `event.server.players` (utilisé par 55_ticket_horaire) plutôt qu'avec
 *  `server.getPlayer(...)`, qui attend un `PlayerSelector` et n'est employé
 *  nulle part ailleurs ici.
 *
 *  POURQUOI UN DÉLAI
 *  -----------------
 *  La commande téléporte le joueur sur son île. Téléporter pendant que le
 *  client finit de se connecter donne des résultats erratiques, d'où les deux
 *  secondes d'attente.
 *
 *  CE QUI A ÉTÉ VÉRIFIÉ DANS LE MOD (SkyblockBuilder 21.1.31)
 *  ---------------------------------------------------------
 *  - `/skyblock create [name]` : l'argument est facultatif ; sans lui le mod
 *    tire lui-même un nom unique (filet de secours utilisé plus bas).
 *  - Seule contrainte sur le nom : `length() > 64` -> refus. Un id à un chiffre
 *    passe donc très bien.
 *  - La commande lit `source.getEntity()` et le caste en `Player` : elle DOIT
 *    avoir le joueur comme entité source, d'où le `execute as … at …`. Un
 *    `runCommandSilent` nu, depuis la console, échouerait.
 *  - `hasPlayerTeam` renvoie FALSE quand l'équipe est celle du spawn : un
 *    joueur neuf compte bien comme « sans île ». C'est le test qu'utilise la
 *    commande elle-même.
 *  - `permissions.json5` liste `team_create` : aucun niveau d'op requis.
 *
 *  PIÈGES RHINO
 *  ------------
 *  Les deux premiers sont documentés dans 04_pg_lib.js :
 *  - aucune déclaration `let`/`const` à l'intérieur d'un bloc `try` ;
 *  - pas de paramètres du reste `(...args)`.
 *
 *  LE TROISIÈME A COÛTÉ DEUX VERSIONS DE CE SCRIPT :
 *  - **ne jamais appeler une méthode Java surchargée.** Rhino n'arrive pas à
 *    choisir, et échoue de deux façons différentes :
 *
 *      hasPlayerTeam(Player) / hasPlayerTeam(UUID)
 *        -> InternalError: ... is ambiguous; candidate methods are: ...
 *
 *      teamExists(String) / teamExists(UUID)
 *        -> Rhino a choisi la surcharge UUID et passé « 26521 » dedans :
 *           « UUID string must be 32 or 36 characters long ». Pire, cette
 *           exception-là a traversé le `try/catch` qui l'entourait ET celui de
 *           la boucle de ticks : elle est levée pendant la conversion des
 *           arguments, hors de la zone protégée.
 *
 *    D'où la règle appliquée ici : on n'appelle QUE des méthodes à signature
 *    unique — `getTeams()`, `isSpawn()`, `getName()` — et on fait le reste en
 *    JavaScript. Un `try/catch` autour d'un appel surchargé ne protège rien.
 * ========================================================================== */

const SBA = {
  ACTIF: true,

  // Bornes de l'identifiant d'île, incluses.
  ID_MIN: 1,
  ID_MAX: 1000000,

  // Attente entre la connexion et la création, en ticks (40 = 2 s).
  DELAI_TICKS: 40,

  // Attente entre la commande et la vérification, en ticks (20 = 1 s).
  VERIF_TICKS: 20,

  // Tirages avant d'abandonner et de laisser SkyblockBuilder nommer l'île.
  ESSAIS: 40,

  // Données persistantes : « ce joueur a déjà reçu son île ». Un joueur qui
  // quitte volontairement son équipe plus tard n'en recevra pas une nouvelle.
  CLE: 'pixelgo_ile_creee',

  // Message de bienvenue une fois l'île prête.
  ANNONCER: true,

  // Passe à true pour tracer chaque étape dans le log serveur.
  VERBEUX: true
}

const SBA_CLASSE = 'de.melanx.skyblockbuilder.data.SkyblockSavedData'

/** Compteur de ticks serveur, et file des travaux en attente. */
let SBA_TICK = 0
const SBA_FILE = []

const sbaLog = (message) => {
  if (SBA.VERBEUX) console.info(`[PixelGO/Ile] ${message}`)
}

/* --- Accès au mod --------------------------------------------------------
 *  Ces fonctions renvoient null quand l'API n'est pas joignable. RIEN dans ce
 *  script ne dépend de leur succès : elles servent à éviter un message
 *  d'erreur inutile et à garantir l'unicité de l'id, pas à décider si l'île
 *  doit être créée.
 * ---------------------------------------------------------------------- */

/** `SkyblockSavedData` du monde, ou null. */
const sbaDonnees = (player) => {
  const classe = Java.tryLoadClass(SBA_CLASSE)
  if (!classe) return null
  let data = null
  try {
    // get(Level) se ramène tout seul à l'overworld du serveur.
    data = classe.get(player.level)
  } catch (e) {
    console.warn(`[PixelGO/Ile] SkyblockSavedData.get a échoué : ${e}`)
    data = null
  }
  return data
}

/** Noms des équipes réelles (hors spawn), ou null si illisible.
 *
 *  N'appelle QUE des méthodes sans surcharge : `getTeams()`, `isSpawn()`,
 *  `getName()`. Voir la note sur les surcharges en tête de fichier — c'est la
 *  contrainte qui gouverne tout ce bloc. */
const sbaNomsEquipes = (player) => {
  const data = sbaDonnees(player)
  if (!data) return null
  const noms = []
  let ok = false
  try {
    data.getTeams().forEach(equipe => {
      if (equipe.isSpawn()) return
      noms.push(String(equipe.getName()))
    })
    ok = true
  } catch (e) {
    console.warn(`[PixelGO/Ile] lecture des équipes impossible : ${e}`)
    ok = false
  }
  return ok ? noms : null
}

/** Un identifiant non utilisé. Tire au hasard même si la liste est illisible :
 *  une collision sur 1 000 000 est négligeable, et si elle se produit la
 *  commande échoue, c'est tracé, et on retente à la connexion suivante. */
const sbaTirerId = (player) => {
  const etendue = SBA.ID_MAX - SBA.ID_MIN + 1
  const pris = sbaNomsEquipes(player)
  let n = ''
  let i = 0
  for (i = 0; i < SBA.ESSAIS; i++) {
    n = String(SBA.ID_MIN + Math.floor(Math.random() * etendue))
    if (pris === null || pris.indexOf(n) < 0) return n
  }
  return null
}

/* --- File d'attente ------------------------------------------------------ */

/** Retrouve un joueur connecté par son pseudo, sans passer par PlayerSelector.
 *  `server.players` est une liste Java : on la parcourt avec `forEach`, la
 *  seule forme d'accès déjà éprouvée dans ce pack (55_ticket_horaire.js).
 *  `forEach` ne permet pas de sortir en avance, d'où la variable. */
const sbaTrouver = (server, pseudo) => {
  let trouve = null
  server.players.forEach(joueur => {
    if (trouve === null && joueur.username === pseudo) trouve = joueur
  })
  return trouve
}

const sbaPlanifier = (pseudo, etape, delai, id) => {
  SBA_FILE.push({ pseudo: pseudo, etape: etape, quand: SBA_TICK + delai, id: id })
}

/* --- Étapes -------------------------------------------------------------- */

const sbaCreer = (server, pseudo) => {
  const player = sbaTrouver(server, pseudo)
  if (!player) {
    sbaLog(`${pseudo} s'est déconnecté avant la création, abandon`)
    return
  }

  if (PG.lire(player, SBA.CLE, 0) > 0) {
    sbaLog(`${pseudo} porte déjà le marqueur, rien à faire`)
    return
  }

  const id = sbaTirerId(player)
  const argument = id === null ? '' : ` ${id}`

  if (id === null) {
    console.warn(`[PixelGO/Ile] ${SBA.ESSAIS} identifiants tirés, tous pris : `
      + `SkyblockBuilder nommera l'île de ${pseudo} lui-même`)
  }

  // `execute as … at …` fournit au mod l'entité source dont il a besoin, tout
  // en gardant le niveau de permission de la console.
  //
  // `runCommandSilent` passe par `withSuppressedOutput()` : si le joueur avait
  // déjà une équipe, le refus du mod n'est envoyé à personne. Inutile donc de
  // vérifier avant — on tente, et on regarde le résultat après.
  sbaLog(`création de l'île « ${id === null ? 'auto' : id} » pour ${pseudo}`)
  server.runCommandSilent(`execute as ${pseudo} at ${pseudo} run skyblock create${argument}`)

  sbaPlanifier(pseudo, 'verifier', SBA.VERIF_TICKS, id)
}

const sbaVerifier = (server, pseudo, id) => {
  const player = sbaTrouver(server, pseudo)
  if (!player) return

  const etiquette = id === null ? 'auto' : id
  const noms = sbaNomsEquipes(player)

  // Liste illisible : on pose le marqueur pour ne pas reboucler, et on le dit.
  if (noms === null) {
    PG.ecrire(player, SBA.CLE, Date.now())
    console.warn(`[PixelGO/Ile] création tentée pour ${pseudo} sans pouvoir la `
      + `vérifier. Contrôler avec /skyblock list.`)
    return
  }

  // Sans identifiant imposé, on ne sait pas quel nom le mod a choisi : on se
  // contente de constater qu'une équipe de plus existe.
  const cree = id === null ? noms.length > 0 : noms.indexOf(id) >= 0

  if (!cree) {
    // Marqueur volontairement NON posé : on réessaiera à la prochaine
    // connexion plutôt que de laisser le joueur sans île pour toujours.
    console.warn(`[PixelGO/Ile] la création de l'île de ${pseudo} a échoué `
      + `(id « ${etiquette} », ${noms.length} équipe(s) existantes). `
      + `Nouvel essai à la prochaine connexion.`)
    return
  }

  PG.ecrire(player, SBA.CLE, Date.now())
  console.info(`[PixelGO/Ile] île « ${etiquette} » créée pour ${pseudo}`)

  // Texte en anglais : c'est la langue de tout ce que voit le joueur dans ce
  // pack (livre de quêtes, objets, descriptions).
  if (!SBA.ANNONCER) return
  player.tell(Text.of('Your island is ready.').color('#55FF55'))
  if (id !== null) {
    player.tell(Text.of(`Your team is called ${id}.`).color(PGC.couleurs.systeme))
  }
}

/* --- Boucles -------------------------------------------------------------- */

PlayerEvents.loggedIn(event => {
  if (!SBA.ACTIF) return

  const player = event.player

  // Sortie immédiate pour l'écrasante majorité des connexions.
  if (PG.lire(player, SBA.CLE, 0) > 0) return

  sbaLog(`${player.username} sans marqueur : création planifiée dans `
    + `${SBA.DELAI_TICKS} ticks`)
  sbaPlanifier(player.username, 'creer', SBA.DELAI_TICKS, null)
})

ServerEvents.tick(event => {
  SBA_TICK++
  if (SBA_FILE.length === 0) return

  const server = event.server
  let i = 0
  let travail = null

  // Parcours à l'envers : on retire au fur et à mesure sans casser l'index.
  for (i = SBA_FILE.length - 1; i >= 0; i--) {
    travail = SBA_FILE[i]
    if (SBA_TICK < travail.quand) continue
    SBA_FILE.splice(i, 1)
    try {
      if (travail.etape === 'creer') sbaCreer(server, travail.pseudo)
      else sbaVerifier(server, travail.pseudo, travail.id)
    } catch (err) {
      console.error(`[PixelGO/Ile] échec de l'étape ${travail.etape} pour `
        + `${travail.pseudo} : ${err}`)
    }
  }
})
