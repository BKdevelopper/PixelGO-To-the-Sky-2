// priority: 50
/* =============================================================================
 *  PixelGO — XP vanilla -> XP du Trainer's Path (Puffish Skills)
 * =============================================================================
 *  Chaque point d'XP vanilla GAGNÉ (orbes, /xp add, fours…) est ajouté tel
 *  quel à l'XP de la catégorie Puffish `pixelgo`, dont la courbe reste celle de
 *  config/puffish_skills/categories/pixelgo/experience.json
 *  (120 + 34 L + 1.6 L²). La source `mine_block` de ce fichier a été retirée :
 *  le minage ne rapporte plus que l'XP vanilla de ses minerais.
 *
 *  POURQUOI `totalExperience` ET PAS LE NIVEAU
 *  -------------------------------------------
 *  Puffish n'a aucune source « XP vanilla ». On compare donc, à chaque passage,
 *  `Player.totalExperience` à la dernière valeur vue :
 *    - ce compteur n'augmente que via giveExperiencePoints, c'est-à-dire l'XP
 *      réellement ramassée ;
 *    - enchanter ou passer à l'enclume retire des NIVEAUX
 *      (giveExperienceLevels) sans toucher à `totalExperience`. Dépenser ne
 *      fait rien perdre, et regagner les mêmes niveaux ne crédite que l'XP
 *      réellement ramassée de nouveau, comme n'importe quel gain ;
 *    - s'il BAISSE (mort, /xp set), on se recale dessus sans rien retirer.
 *
 *  La référence vit dans les données persistantes du joueur : une déconnexion
 *  ou un redémarrage ne crédite rien deux fois. Un joueur vu pour la première
 *  fois (ou après la mise en place de ce script) part de son total actuel,
 *  sans rattrapage de l'XP déjà accumulée.
 * ========================================================================== */

/* --- Réglages ------------------------------------------------------------ */
/** Catégorie Puffish visée. Les catégories de config/puffish_skills sont dans
 *  l'espace de noms `puffish_skills`. */
const SXV_CATEGORIE = 'puffish_skills:pixelgo'

/** XP de skill par point d'XP vanilla. */
const SXV_RATIO = 1

/** Période de la boucle, en ticks (20 = 1 s). */
const SXV_PERIODE_TICKS = 20

/** Clé de la référence dans les données persistantes du joueur. */
const SXV_CLE = 'pixelgo_skill_xp_vanilla_ref'

let SXV_TICK = 0
let SXV_ALERTE_COMMANDE = false

/* PIÈGE RHINO : déclaration HORS du `try`, voir PG.lire dans 04_pg_lib.js.
 * Une lecture ratée renvoie `null` (pas 0) : on saute le passage plutôt que
 * de recréditer tout le total du joueur. */
function sxvLireRef (player) {
  let donnees = null
  try {
    donnees = player.persistentData
    return donnees.contains(SXV_CLE) ? Number(donnees.getLong(SXV_CLE)) : -1
  } catch (err) {
    console.error('[PixelGO/SkillXP] Lecture de la référence impossible : ' + err)
    return null
  }
}

function sxvEcrireRef (player, valeur) {
  try {
    player.persistentData.putLong(SXV_CLE, Math.floor(valeur))
    return true
  } catch (err) {
    console.error('[PixelGO/SkillXP] Écriture de la référence impossible : ' + err)
    return false
  }
}

function sxvSynchroniser (player) {
  if (player.fake) return

  const total = Number(player.totalExperience)
  if (!(total >= 0)) return

  const ref = sxvLireRef(player)
  if (ref === null) return

  /* Première vue, ou total en baisse (mort, /xp set) : simple recalage. */
  if (ref < 0 || total <= ref) {
    if (total !== ref) sxvEcrireRef(player, total)
    return
  }

  const gain = Math.floor((total - ref) * SXV_RATIO)

  /* La référence d'abord : si l'écriture échoue, on ne crédite pas, sinon le
   * même gain serait reversé à chaque passage. */
  if (!sxvEcrireRef(player, total)) return
  if (gain <= 0) return

  const resultat = player.server.runCommandSilent(
    'puffish_skills experience add ' + player.username + ' ' + SXV_CATEGORIE + ' ' + gain)
  if (resultat === 0 && !SXV_ALERTE_COMMANDE) {
    SXV_ALERTE_COMMANDE = true
    console.warn('[PixelGO/SkillXP] La commande puffish_skills a échoué (catégorie ' +
      SXV_CATEGORIE + ' introuvable ?)')
  }

  try {
    sxvCrediterOrigine(player, gain)
  } catch (err) {
    console.error('[PixelGO/SkillXP] Crédit de l\'arbre d\'origine impossible : ' + err)
  }
}

/* --- Arbres d'origine (tools/pixelgo-origins) -----------------------------
 *  Chaque origine Pixelmon débloque sa catégorie Puffish `origin_<id>`
 *  (pouvoir neofishcompat:unlock_puffish_category). Le même gain d'XP vanilla
 *  lui est crédité. On passe par l'API et non par la commande : la commande
 *  `experience add` crédite AUSSI une catégorie verrouillée, ce qui ferait
 *  progresser en douce les arbres des autres origines. */
const SXV_PREFIXE_ORIGINE = 'origin_'
let SXV_API = undefined

function sxvApi () {
  if (SXV_API === undefined) {
    try {
      SXV_API = Java.loadClass('net.puffish.skillsmod.api.SkillsAPI')
    } catch (err) {
      SXV_API = null
      console.warn('[PixelGO/SkillXP] SkillsAPI indisponible, arbres d\'origine sans XP : ' + err)
    }
  }
  return SXV_API
}

function sxvCrediterOrigine (player, gain) {
  const api = sxvApi()
  if (!api) return
  const categories = api.streamUnlockedCategories(player).toList()
  for (let i = 0; i < categories.size(); i++) {
    const categorie = categories.get(i)
    if (!String(categorie.getId().getPath()).startsWith(SXV_PREFIXE_ORIGINE)) continue
    const experience = categorie.getExperience()
    if (experience.isPresent()) experience.get().addTotal(player, gain)
  }
}

/* --- Boucle serveur ------------------------------------------------------ */
ServerEvents.tick(event => {
  SXV_TICK++
  if (SXV_TICK % SXV_PERIODE_TICKS !== 0) return

  event.server.players.forEach(joueur => {
    try {
      sxvSynchroniser(joueur)
    } catch (err) {
      console.error('[PixelGO/SkillXP] Echec pour ' + joueur.username + ' : ' + err)
    }
  })
})

/* Dernier crédit avant de partir : l'XP ramassée dans la dernière seconde
 * n'attend pas la prochaine connexion. */
PlayerEvents.loggedOut(event => {
  try {
    sxvSynchroniser(event.player)
  } catch (err) {
    console.error('[PixelGO/SkillXP] Echec du crédit de sortie : ' + err)
  }
})
