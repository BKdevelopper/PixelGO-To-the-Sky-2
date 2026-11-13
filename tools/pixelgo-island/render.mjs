// Rendu isométrique simple d'un dump .json (pour vérification visuelle)
import fs from 'fs';
import { encode } from './png.mjs';
const [, , inp, out, view = 'se', A0 = '10', cut = '999'] = process.argv;
const d = JSON.parse(fs.readFileSync(inp));
const [W, H, L] = d.size; const A = +A0; const CUT = +cut;
const COLORS = [
  [/blue_berry_wood/, [70, 110, 190]], [/farmland/, [110, 75, 45]], [/wheat|carrots|potatoes|beetroots|sugar_cane|berry_bush/, [120, 190, 70]],
  [/white_wool|quartz/, [240, 240, 240]], [/red_wool|red_concrete|red_carpet/, [200, 40, 40]], [/blue_carpet|light_blue/, [90, 150, 220]], [/dirt_path/, [150, 125, 75]],
  [/oak_leaves|birch_leaves|azalea_leaves/, [80, 150, 60]], [/spruce_leaves/, [50, 100, 60]], [/hay_block/, [210, 180, 60]], [/birch_log/, [220, 215, 200]], [/oak_log|spruce_log/, [90, 65, 40]],
  [/water/, [60, 110, 200]], [/grass_block/, [95, 160, 60]], [/short_grass|fern|azalea/, [70, 140, 50]],
  [/coarse_dirt|dirt/, [130, 95, 65]], [/sand$/, [220, 205, 150]], [/clay/, [150, 155, 170]],
  [/cherry_leaves/, [240, 170, 200]], [/pink_petals/, [245, 160, 200]], [/cherry_log/, [70, 40, 50]],
  [/bamboo_mosaic/, [200, 180, 90]], [/bamboo/, [110, 170, 60]],
  [/red_berry_wood/, [190, 85, 80]], [/polished_blackstone|black_concrete/, [40, 38, 44]],
  [/white_concrete/, [235, 235, 235]], [/glass_pane/, [210, 225, 235]],
  [/stripped_dark_oak|dark_oak/, [75, 55, 35]], [/spruce/, [115, 85, 50]], [/wooden_flooring/, [200, 180, 80]],
  [/temple_brick/, [215, 200, 160]],
  [/factory_blocks:(sturdy|large_plating|hex|grate|old_vents|scaffold)/, [125, 130, 135]],
  [/factory_blocks:(fan|exhaust|vent|gvent)/, [90, 95, 100]], [/factory_blocks:.*pipes/, [150, 170, 175]],
  [/sootychimneys/, [140, 100, 85]], [/lantern|lamp|campfire/, [255, 210, 110]],
  [/mossy|moss/, [90, 120, 70]], [/polished_andesite|andesite/, [140, 140, 140]], [/tuff/, [110, 110, 100]],
  [/stone_brick/, [120, 120, 120]], [/cobblestone|stone|gravel/, [125, 125, 125]],
  [/pixelmon:red_|another_furniture:red|red_cushion/, [210, 50, 50]], [/pixelmon:pink/, [240, 150, 190]],
  [/helscrates/, [230, 180, 60]], [/waystone/, [60, 50, 70]], [/sophisticated/, [110, 80, 50]],
  [/handcrafted|another_furniture|pixelmon/, [170, 110, 80]], [/flower|allium|tulip|bluet|valley/, [230, 230, 120]],
  [/lily_pad/, [40, 120, 40]], [/chain/, [60, 60, 70]], [/sign/, [220, 150, 150]],
];
const col = n => (COLORS.find(([r]) => r.test(n)) || [0, [255, 0, 255]])[1];
const small = n => /petals|short_grass|fern|flower|allium|tulip|bluet|valley|lily_pad|carpet|chain|sign|lantern/.test(n);
const half = n => /_slab/.test(n);
let blocks = d.blocks.map(([k, n, p]) => { let [x, y, z] = k.split(',').map(Number); return { x, y, z, n, p }; }).filter(b => b.y <= CUT);
const tf = ({ x, y, z }) => {
  if (view === 'nw') return [W - 1 - x, y, L - 1 - z];
  if (view === 'ne') return [z, y, W - 1 - x];
  if (view === 'sw') return [L - 1 - z, y, x];
  if (view === 'below') return [x, H - 1 - y, z];
  return [x, y, z];
};
blocks = blocks.map(b => { const [x, y, z] = tf(b); return { ...b, x, y, z }; });
blocks.sort((a, b) => (a.x + a.z) - (b.x + b.z) || a.y - b.y || a.x - b.x);
const IW = (W + L) * A + 20, IH = (W + L) * A / 2 + H * A + 20;
const img = Buffer.alloc(IW * IH * 4);
for (let i = 0; i < img.length; i += 4) { img[i] = 235; img[i + 1] = 240; img[i + 2] = 250; img[i + 3] = 255; }
const px = (x, y, c) => { if (x < 0 || y < 0 || x >= IW || y >= IH) return; const i = (y * IW + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; };
function poly(pts, c) { // remplissage de polygone convexe
  const ys = pts.map(p => p[1]); const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
    }
    if (xs.length < 2) continue;
    for (let x = Math.round(Math.min(...xs)); x < Math.round(Math.max(...xs)); x++) px(x, y, c);
  }
}
const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
for (const b of blocks) {
  const c = col(b.n);
  const ox = (b.x - b.z) * A + L * A + 10, oy = (b.x + b.z) * A / 2 + (H - b.y) * A + 10;
  let s = 1, h = 1;
  if (small(b.n)) { s = 0.5; h = 0.5; } else if (half(b.n)) h = b.p?.type === 'top' ? 1 : 0.5;
  const a = A * s, hh = A * h;
  const cx = ox, cy = oy + (1 - s) * A / 2;
  // sommet
  const top = [[cx, cy - hh], [cx + a, cy + a / 2 - hh], [cx, cy + a - hh], [cx - a, cy + a / 2 - hh]];
  poly([[cx - a, cy + a / 2 - hh], [cx, cy + a - hh], [cx, cy + a], [cx - a, cy + a / 2]], shade(c, 0.75));
  poly([[cx + a, cy + a / 2 - hh], [cx, cy + a - hh], [cx, cy + a], [cx + a, cy + a / 2]], shade(c, 0.6));
  poly(top, shade(c, 1.05));
}
fs.writeFileSync(out, encode(IW, IH, img));
console.log(out, IW, IH);
