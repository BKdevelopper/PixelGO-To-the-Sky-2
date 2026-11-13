const fs = require('fs')
const Q = 'C:/Users/User/curseforge/minecraft/Instances/PixelGO To the sky 2.0/config/ftbquests/quests'
const t = fs.readFileSync(Q + '/lang/en_us.snbt', 'utf8')

let bad = 0, chk = 0
for (const m of t.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
  const s = m[1]
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '&') continue
    chk++
    const n = s[i + 1]
    if (n === undefined) { console.log('FIN sur & : ' + s.slice(0, 60)); bad++; continue }
    if (n === '#') {
      const hx = s.substr(i + 2, 6)
      if (!/^[0-9A-Fa-f]{6}$/.test(hx)) { console.log('HEX invalide &#' + hx + ' -> ' + s.slice(0, 50)); bad++ }
      i += 7; continue
    }
    if (/\s/.test(n)) { console.log('ESPACE apres & : ' + s.slice(0, 60)); bad++ }
    else if (!/[0-9a-fk-orzA-FK-ORZ]/.test(n)) { console.log('CODE invalide &' + n + ' -> ' + s.slice(0, 60)); bad++ }
    i++
  }
}
console.log(chk + ' sequences & verifiees, ' + bad + ' invalides')

let d = 0
for (const c of t.replace(/"(?:[^"\\]|\\.)*"/g, '')) { if (c === '{') d++; if (c === '}') d-- }
console.log('equilibre accolades : ' + d)

const lines = t.split(/\r?\n/)
const ids = lines.map(l => (l.match(/^\tchapter\.([0-9A-F]{16})\.title: /) || [])[1]).filter(Boolean)
console.log('titres de chapitre  : ' + ids.length + ', uniques : ' + new Set(ids).size)
const gr = lines.filter(l => /^\tchapter_group\.[0-9A-F]{16}\.title: /.test(l))
console.log('titres de groupe    : ' + gr.length)
const withGrad = lines.filter(l => /^\tchapter(_group)?\.[0-9A-F]{16}\.title: /.test(l) && l.includes('&#'))
console.log('dont en degrade     : ' + withGrad.length)
const leftover = lines.filter(l => /^\tchapter(_group)?\.[0-9A-F]{16}\.title: /.test(l) && l.includes('{'))
console.log('substitutions restantes dans un titre : ' + leftover.length)
leftover.forEach(l => console.log('   ' + l.trim()))

/* les chapitres du dossier ont-ils tous un titre ? */
const files = fs.readdirSync(Q + '/chapters')
const missing = []
for (const f of files) {
  const c = fs.readFileSync(Q + '/chapters/' + f, 'utf8')
  const id = (c.match(/^\tid: "([0-9A-F]{16})"/m) || [])[1]
  if (!ids.includes(id)) missing.push(f)
}
console.log('chapitres sans titre : ' + missing.length + (missing.length ? ' -> ' + missing.join(', ') : ''))

/* rendu approximatif : on retire les codes pour lire le texte final */
console.log('\n--- rendu texte ---')
for (const l of lines) {
  const m = l.match(/^\tchapter(_group)?\.([0-9A-F]{16})\.title: "(.*)"$/)
  if (!m) continue
  const plain = m[3].replace(/&#[0-9A-Fa-f]{6}/g, '').replace(/&[0-9a-fk-orz]/gi, '')
  console.log((m[1] ? 'GROUPE  ' : 'chapitre') + '  ' + plain)
}
