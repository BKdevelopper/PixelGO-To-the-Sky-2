import { readPng } from './png.mjs';
const dir = 'config/fancymenu/assets/menu/last_chance/';
for (const n of ['singleplayer', 'multiplayer', 'exit']) {
  const im = readPng(dir + n + '.png'); const px = (x, y) => { const o = (y * im.w + x) * 4; return [...im.data.subarray(o, o + 4)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  console.log(n, im.w, im.h);
  console.log(' row mid x0..14:', Array.from({ length: 15 }, (_, x) => px(x, im.h >> 1)).join(' '));
  console.log(' row mid right:', Array.from({ length: 15 }, (_, i) => px(im.w - 15 + i, im.h >> 1)).join(' '));
  console.log(' col mid y:', Array.from({ length: im.h }, (_, y) => px(im.w >> 1 , y)).join(' '));
}
