/* =============================================================================
 *  Dégradés du sommaire FTB Quests
 * =============================================================================
 *  FTB Library parse les titres avec TextComponentParser : après un `&`, si le
 *  caractère suivant est `#`, il lit 6 chiffres hexadécimaux et appelle
 *  TextColor.parseColor -> `&#RRGGBB` est une couleur libre (vérifié au
 *  bytecode, offset 285 de parse0). Un dégradé s'écrit donc en préfixant
 *  chaque caractère par sa propre couleur.
 *
 *  Style.withColor ne réinitialise pas les autres attributs : un `&l` posé en
 *  tête reste actif pendant tout le dégradé.
 *
 *  Le livre suit une roue chromatique complète, du vert (la ferme, étape 1)
 *  jusqu'à l'or (l'end game), pour que la position d'un groupe dans la
 *  progression se lise à la couleur.
 * ========================================================================== */
const fs = require('fs')

const Q = 'C:/Users/User/curseforge/minecraft/Instances/PixelGO To the sky 2.0/config/ftbquests/quests'
const KJ = 'C:/Users/User/curseforge/minecraft/Instances/PixelGO To the sky 2.0/kubejs/assets/kubejs/lang/en_us.json'

/* --- couleurs ------------------------------------------------------------ */
const hsl = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return t.map(v => Math.round((v + m) * 255))
    .map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/* Applique un dégradé caractère par caractère. Les espaces gardent une
 * couleur (le soulignement d'un en-tête doit rester continu).              */
const grad = (text, h0, h1, s, l0, l1) => {
  const n = Math.max(text.length - 1, 1)
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const t = i / n
    out += '&#' + hsl(h0 + (h1 - h0) * t, s, l0 + (l1 - l0) * t) + text[i]
  }
  return out
}

/* --- charte des groupes --------------------------------------------------- */
/* h: plage de teinte du groupe. Les chapitres réutilisent la même plage, plus
 * clairs et moins saturés, pour que l'en-tête reste le point fort.          */
const GROUPS = [
  { id: '5B3C76AC376473E9', name: 'STARTING OFF', h: [100, 155] }, // vert   : la ferme
  { id: '28879E51700F2962', name: 'TECHNOLOGY', h: [172, 205] },   // cyan   : les machines
  { id: '05B2E6325DEB5972', name: 'DIMENSIONS', h: [225, 268] },   // bleu   : les portails
  { id: '1A3BB00B8761BF8C', name: 'PIXELMON', h: [282, 318] },     // violet : les dresseurs
  { id: '7FF783159865F341', name: 'MAGIC', h: [328, 358] },        // rose   : l'alchimie
  { id: '7E262B459587A2CB', name: 'END GAME', h: [45, 12] }        // or     : la fin
]
const HEAD_S = 88, HEAD_L = [66, 52]   // en-tête : saturé
const CHAP_S = 70, CHAP_L = [78, 63]   // chapitre : plus clair, plus doux

/* Chapitres mis en avant dans le pack : ils gardent leur gras. */
const BOLD = new Set([
  '5DE4045A12155E91', // Ender IO
  '36D01F7A44390E91', // PixelGO Gates
  '0489D0980952F28C', // Poké Balls
  '38066F2CD24E739E', // The Ball Line
  '2CF3A95DE1105372'  // Welcome
])

/* --- lecture de la structure ---------------------------------------------- */
const kj = JSON.parse(fs.readFileSync(KJ, 'utf8'))
const rawLang = fs.readFileSync(Q + '/lang/en_us.snbt', 'utf8')
const EOL = rawLang.includes('\r\n') ? '\r\n' : '\n'
const L = rawLang.split(/\r?\n/)

const current = {}
for (const l of L) {
  const m = l.match(/^\tchapter\.([0-9A-F]{16})\.title: "(.*)"$/)
  if (m) current[m[1]] = m[2]
}

const chapters = []
for (const f of fs.readdirSync(Q + '/chapters')) {
  const t = fs.readFileSync(Q + '/chapters/' + f, 'utf8')
  chapters.push({
    file: f,
    id: (t.match(/^\tid: "([0-9A-F]{16})"/m) || [])[1],
    group: (t.match(/^\tgroup: "([0-9A-F]{16})"/m) || [])[1] || null,
    order: parseInt((t.match(/^\torder_index: (-?\d+)/m) || [])[1] || '0', 10)
  })
}

/* Nom affiché : on part du titre actuel, on retire les codes couleur, et on
 * résout la substitution {quest.x.title.1} depuis le lang de KubeJS — le
 * dégradé ne peut pas traverser une substitution, il faut un littéral.     */
const RENAME = {
  'The beginning': 'The Beginning',
  'Pokedex': 'Pokédex'
}
const plainName = id => {
  let s = current[id] || ''
  const sub = s.match(/^\{(.+)\}$/)
  if (sub) s = kj[sub[1]] !== undefined ? kj[sub[1]] : sub[1]
  s = s.replace(/&#[0-9A-Fa-f]{6}/g, '').replace(/&[0-9a-fk-orz]/gi, '')
    .replace(/^\s*-\s*/, '').trim()   // idempotent : on retire un tiret déjà posé
  return RENAME[s] || s
}

/* --- génération ----------------------------------------------------------- */
const out = {}   // clé lang -> nouvelle valeur
const report = []

GROUPS.forEach(g => {
  const head = '-=[ ' + g.name + ' ]=-'
  out['chapter_group.' + g.id + '.title'] =
    '&l&n' + grad(head, g.h[0], g.h[1], HEAD_S, HEAD_L[0], HEAD_L[1])
  report.push('\n' + head + '   [' + hsl(g.h[0], HEAD_S, HEAD_L[0]) + ' -> ' + hsl(g.h[1], HEAD_S, HEAD_L[1]) + ']')

  chapters.filter(c => c.group === g.id).sort((a, b) => a.order - b.order).forEach(c => {
    const label = '- ' + plainName(c.id)
    out['chapter.' + c.id + '.title'] =
      (BOLD.has(c.id) ? '&l' : '') + grad(label, g.h[0], g.h[1], CHAP_S, CHAP_L[0], CHAP_L[1])
    report.push('   ' + label + (BOLD.has(c.id) ? '   (gras)' : ''))
  })
})

/* Le chapitre d'accueil est hors groupe : or, gras, sans tiret. */
chapters.filter(c => !c.group).forEach(c => {
  out['chapter.' + c.id + '.title'] = '&l' + grad(plainName(c.id), 48, 30, 92, 72, 55)
  report.push('\n(hors groupe)  ' + plainName(c.id) + '   (gras, or)')
})

/* --- écriture ------------------------------------------------------------- */
let n = 0, missing = []
for (const key of Object.keys(out)) {
  const head = '\t' + key + ': '
  const at = L.findIndex(l => l.startsWith(head))
  if (at < 0) { missing.push(key); continue }
  L[at] = head + '"' + out[key] + '"'
  n++
}
fs.writeFileSync(Q + '/lang/en_us.snbt', L.join(EOL), 'utf8')

console.log(report.join('\n'))
console.log('\n' + n + ' titres remis en dégradé' + (missing.length ? '  — CLÉS ABSENTES : ' + missing.join(', ') : ''))
