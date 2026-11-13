#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: rewards pay in coins, not PokeDollars
 * =============================================================================
 *  Every `pixelgoquests:pokedollars` reward (quests and reward tables) becomes
 *  item rewards in the pack's sellable coins, at their sell price
 *  (tools/pixelgo-economy/apply.mjs):
 *
 *    Poke Coin 120 $   Dime 40 $   Nickel 20 $
 *
 *  The amount is rounded to the nearest 20 $ and split greedily, biggest coin
 *  first, so a reward turns into one to three item rewards worth the same.
 *  The first of them keeps the old reward id, so a quest already claimed in a
 *  world stays claimed for that part; the others get ids hashed from it.
 *
 *  CAP overrides an amount that cannot be paid in items (the SUPRA Crate's
 *  10,000,000 $ would be ~1,300 stacks of Poke Coins).
 *
 *  Idempotent: once converted there is nothing left to match.
 *  generate.mjs uses coinRewards() too, so new quests come out in coins.
 *
 *    node tools/pixelgo-quests/coins.mjs --dry
 *    node tools/pixelgo-quests/coins.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const COINS = [
  ['pokeblocks:poke_coin', 120],
  ['pokeblocks:dime', 40],
  ['pokeblocks:nickel', 20],
];

/* reward id -> amount actually paid */
const CAP = {
  '52771452DA600634': 64 * 120, // SUPRA Crate: one stack of Poke Coins
};

/* The first hex digit is kept in 0-7 like every id in the book (2026-11-08): ids from
 * 8 up never survived an in-game load — FTB Quests replaced them with fresh ones. */
const hid = (s) => {
  const h = crypto.createHash('sha1').update(s).digest('hex').slice(0, 16).toUpperCase();
  return (parseInt(h[0], 16) & 7).toString(16).toUpperCase() + h.slice(1);
};

/* [{ id, item, count }] worth `amount` $ */
export function coinRewards(id, amount) {
  let left = Math.max(1, Math.round((CAP[id] ?? amount) / 20)) * 20;
  const out = [];
  for (const [item, value] of COINS) {
    const count = Math.floor(left / value);
    if (!count) continue;
    left -= count * value;
    out.push({ id: out.length ? hid(`coin:${id}:${item}`) : id, item, count });
  }
  return out;
}

export const coinBlock = (r, tab) => [
  `${tab}{`,
  ...(r.count > 1 ? [`${tab}\tcount: ${r.count}`] : []),
  `${tab}\tid: "${r.id}"`,
  `${tab}\titem: {`, `${tab}\t\tcount: 1`, `${tab}\t\tid: "${r.item}"`, `${tab}\t}`,
  `${tab}\ttype: "item"`,
  `${tab}}`,
];

/* a reward on its own lines, or the only reward written FTB-style as `rewards: [{ ... }]` */
const MONEY = /^([\t ]*)(rewards: \[)?\{\n\s*count: (\d+)L?\n\s*id: "([0-9A-F]{16})"\n\s*type: "pixelgoquests:pokedollars"\n\s*\}(\])?$/gm;

function main() {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const QDIR = path.resolve(HERE, '..', '..', 'config', 'ftbquests', 'quests');
  const DRY = process.argv.includes('--dry');
  const files = ['chapters', 'reward_tables'].flatMap((d) =>
    fs.readdirSync(path.join(QDIR, d)).filter((f) => f.endsWith('.snbt')).map((f) => path.join(QDIR, d, f)));

  const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  let total = 0, dollars = 0, paid = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    let n = 0;
    const out = src.replace(MONEY, (_, tab, open, amount, id, close) => {
      const rewards = coinRewards(id, Number(amount));
      for (const r of rewards.slice(1)) if (all.includes(`"${r.id}"`)) throw new Error(`id clash ${r.id} (${f})`);
      n++; dollars += Number(amount);
      paid += rewards.reduce((s, r) => s + r.count * COINS.find(([i]) => i === r.item)[1], 0);
      if (!open !== !close) throw new Error(`unbalanced rewards array at ${id} (${f})`);
      if (!open) return rewards.flatMap((r) => coinBlock(r, tab)).join('\n');
      return [`${tab}rewards: [`, ...rewards.flatMap((r) => coinBlock(r, tab + '\t')), `${tab}]`].join('\n');
    });
    if (out.includes('pixelgoquests:pokedollars')) throw new Error(`unmatched pokedollars reward left in ${f}`);
    if (!n) continue;
    total += n;
    console.log(`${path.relative(QDIR, f)}: ${n}`);
    if (!DRY) fs.writeFileSync(f, out.replace(/\n/g, '\r\n'), 'utf8');
  }
  console.log(`${total} rewards, ${dollars} $ -> ${paid} $ in coins${DRY ? ' (dry)' : ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
