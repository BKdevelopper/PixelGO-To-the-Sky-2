// Nettoie servers.dat : retire les serveurs partenaires que Pixelmon y injecte
// (liste "favourites" à bordure dorée + pubs dans "servers") et garde le serveur PixelGO.
// Pixelmon (DefaultServerList) ne re-télécharge sa liste que si servers + favourites
// sont vides : on garde donc toujours au moins le serveur PixelGO.
// Usage : node tools/pixelgo-servers/clean.mjs [chemin/servers.dat]
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] ?? path.resolve('servers.dat');
const KEEP = { name: 'PixelGO To the Sky', ip: 'pixelgo.modded.fun' };
// Autres serveurs visibles à conserver (adresses PixelGO, cf. config/craftpresence.json).
const KEEP_IPS = ['141.95.13.80'];
const keepIp = (ip) => KEEP_IPS.some((k) => (ip ?? '').startsWith(k));

// ---- NBT minimal (non compressé, big-endian) ----
function read(buf) {
  let o = 0;
  const u8 = () => buf.readInt8(o++);
  const i16 = () => { const v = buf.readInt16BE(o); o += 2; return v; };
  const i32 = () => { const v = buf.readInt32BE(o); o += 4; return v; };
  const str = () => { const n = buf.readUInt16BE(o); o += 2; const s = buf.toString('utf8', o, o + n); o += n; return s; };
  const payload = (t) => {
    switch (t) {
      case 1: return u8();
      case 2: return i16();
      case 3: return i32();
      case 4: { const v = buf.readBigInt64BE(o); o += 8; return v; }
      case 5: { const v = buf.readFloatBE(o); o += 4; return v; }
      case 6: { const v = buf.readDoubleBE(o); o += 8; return v; }
      case 7: { const n = i32(); const v = buf.subarray(o, o + n); o += n; return v; }
      case 8: return str();
      case 9: { const et = u8(); const n = i32(); const items = []; for (let k = 0; k < n; k++) items.push(payload(et)); return { et, items }; }
      case 10: { const c = []; for (;;) { const tt = u8(); if (tt === 0) return c; const name = str(); c.push({ t: tt, name, v: payload(tt) }); } }
      case 11: { const n = i32(); const a = []; for (let k = 0; k < n; k++) a.push(i32()); return a; }
      case 12: { const n = i32(); const a = []; for (let k = 0; k < n; k++) { a.push(buf.readBigInt64BE(o)); o += 8; } return a; }
      default: throw new Error('tag NBT inconnu ' + t);
    }
  };
  const t = u8(); const name = str();
  return { t, name, v: payload(t) };
}

function write(root) {
  const parts = [];
  const b = (n, fn) => { const x = Buffer.alloc(n); fn(x); parts.push(x); };
  const u8 = (v) => b(1, (x) => x.writeInt8(v));
  const i32 = (v) => b(4, (x) => x.writeInt32BE(v));
  const str = (s) => { const d = Buffer.from(s, 'utf8'); b(2, (x) => x.writeUInt16BE(d.length)); parts.push(d); };
  const payload = (t, v) => {
    switch (t) {
      case 1: return u8(v);
      case 2: return b(2, (x) => x.writeInt16BE(v));
      case 3: return i32(v);
      case 4: return b(8, (x) => x.writeBigInt64BE(v));
      case 5: return b(4, (x) => x.writeFloatBE(v));
      case 6: return b(8, (x) => x.writeDoubleBE(v));
      case 7: i32(v.length); return parts.push(Buffer.from(v));
      case 8: return str(v);
      case 9: u8(v.items.length ? v.et : 0); i32(v.items.length); return v.items.forEach((it) => payload(v.et, it));
      case 10: v.forEach((e) => { u8(e.t); str(e.name); payload(e.t, e.v); }); return u8(0);
      case 11: i32(v.length); return v.forEach(i32);
      case 12: i32(v.length); return v.forEach((n) => b(8, (x) => x.writeBigInt64BE(n)));
    }
  };
  u8(root.t); str(root.name); payload(root.t, root.v);
  return Buffer.concat(parts);
}

const get = (c, k) => c.find((e) => e.name === k);
const entry = (name, ip) => [{ t: 8, name: 'name', v: name }, { t: 8, name: 'ip', v: ip }];

const root = fs.existsSync(file) ? read(fs.readFileSync(file)) : { t: 10, name: '', v: [] };
const servers = get(root.v, 'servers')?.v.items ?? [];

// Garde : les entrées "hidden" (connexions directes du joueur) et le serveur PixelGO.
const kept = servers.filter((s) => get(s, 'hidden')?.v || keepIp(get(s, 'ip')?.v));
const removed = servers.filter((s) => !get(s, 'hidden')?.v && !keepIp(get(s, 'ip')?.v) && get(s, 'ip')?.v !== KEEP.ip);
const pixelgo = servers.find((s) => !get(s, 'hidden')?.v && get(s, 'ip')?.v === KEEP.ip) ?? entry(KEEP.name, KEEP.ip);
const favs = get(root.v, 'favourites')?.v.items ?? [];

root.v = [
  { t: 9, name: 'servers', v: { et: 10, items: [pixelgo, ...kept] } },
  { t: 9, name: 'favourites', v: { et: 10, items: [] } },
];

if (fs.existsSync(file) && !fs.existsSync(file + '.bak-pub')) fs.copyFileSync(file, file + '.bak-pub');
fs.writeFileSync(file, write(root));
console.log(`servers.dat nettoyé : ${favs.length} favoris + ${removed.length} serveurs pub retirés`);
for (const s of [...favs, ...removed]) console.log('  -', get(s, 'name')?.v, '(' + get(s, 'ip')?.v + ')');
console.log(`gardés : ${KEEP.name} (${KEEP.ip}) + ${kept.length} autre(s) entrée(s) (connexions directes / serveurs PixelGO)`);
