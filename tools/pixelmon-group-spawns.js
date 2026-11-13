/* =============================================================================
 *  Pixelmon — retrait des spawns de groupe (gel du serveur en skyblock)
 * =============================================================================
 *  POURQUOI
 *  --------
 *  Pixelmon 9.4.1 gèle le serveur pour de bon sur une île. Un spawn de groupe
 *  place ses membres à +1..+5 blocs du premier Pokémon
 *  (GroupSpawnSettings.getRandomLocation), puis cherche le sol avec le
 *  calculateur LAND (SpawnLocationType.lambda$static$1, vérifié au bytecode) :
 *
 *      while (!state.isSolid() && !state.getFluidState().isSource())
 *          pos = pos.below()
 *
 *  Aucune borne basse : au-dessus du vide, la boucle ne se termine jamais.
 *  Capture jcmd du 06/10/2026 : 3 dumps à 10 s d'écart, Server thread figé
 *  dans cette boucle à 100 % CPU. Côté joueur : on bouge et on ouvre
 *  l'inventaire, mais coffres, interactions et drops ne répondent plus, et
 *  quitter bloque sur « Saving world ».
 *
 *  CE QUE FAIT LE SCRIPT
 *  ---------------------
 *  Extrait data/pixelmon/spawning/ du jar Pixelmon présent dans mods/, retire
 *  la clé `groupSpawnSettings` de chaque SpawnInfo, et écrit les fichiers
 *  concernés dans kubejs/data/pixelmon/spawning/. Pixelmon lit ce dossier par
 *  un reload listener : le datapack KubeJS remplace donc les fichiers du jar.
 *  Retirer la clé est sûr : SpawnActionPokemon.doSpawn teste
 *  `groupSpawnSettings != null` avant de s'en servir.
 *
 *  Le dossier de sortie est GÉNÉRÉ : il est vidé puis réécrit à chaque passage.
 *  À relancer après chaque mise à jour de Pixelmon, sinon ces fichiers figent
 *  les spawns de l'ancienne version.
 *
 *  Usage : node tools/pixelmon-group-spawns.js
 * ========================================================================== */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const RACINE = 'C:/Users/User/curseforge/minecraft/Instances/PixelGO To the sky 2.0'
const MODS = path.join(RACINE, 'mods')
const SORTIE = path.join(RACINE, 'kubejs/data/pixelmon/spawning')
/* tar de Windows (bsdtar) : il lit les zip, contrairement au tar GNU de Git Bash. */
const TAR = 'C:/Windows/System32/tar.exe'

const jar = fs.readdirSync(MODS).find(f => /^Pixelmon-.*-universal\.jar$/.test(f))
if (!jar) {
  console.error('Jar Pixelmon introuvable dans mods/')
  process.exit(1)
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixelmon-spawning-'))
execFileSync(TAR, ['-xf', path.join(MODS, jar), '-C', tmp, 'data/pixelmon/spawning'])
const source = path.join(tmp, 'data/pixelmon/spawning')

/** Retire la clé partout où elle apparaît ; renvoie le nombre de retraits. */
function retirerGroupes (noeud) {
  if (Array.isArray(noeud)) return noeud.reduce((n, v) => n + retirerGroupes(v), 0)
  if (!noeud || typeof noeud !== 'object') return 0
  let n = 0
  if ('groupSpawnSettings' in noeud) {
    delete noeud.groupSpawnSettings
    n++
  }
  for (const v of Object.values(noeud)) n += retirerGroupes(v)
  return n
}

function fichiersJson (dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dossier, e.name)
    if (e.isDirectory()) return fichiersJson(p)
    return e.name.endsWith('.json') ? [p] : []
  })
}

fs.rmSync(SORTIE, { recursive: true, force: true })

let fichiers = 0
let retraits = 0
for (const f of fichiersJson(source)) {
  const texte = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')
  if (!texte.includes('groupSpawnSettings')) continue

  let donnees
  try {
    donnees = JSON.parse(texte)
  } catch (err) {
    console.error(`JSON illisible : ${path.relative(source, f)} — ${err.message}`)
    process.exit(1)
  }

  const n = retirerGroupes(donnees)
  if (n === 0) continue

  const cible = path.join(SORTIE, path.relative(source, f))
  fs.mkdirSync(path.dirname(cible), { recursive: true })
  fs.writeFileSync(cible, JSON.stringify(donnees, null, 2) + '\n')
  fichiers++
  retraits += n
}

fs.rmSync(tmp, { recursive: true, force: true })
console.log(`${jar} : ${retraits} groupes retirés dans ${fichiers} fichiers -> ` +
  path.relative(RACINE, SORTIE).split(path.sep).join('/'))
