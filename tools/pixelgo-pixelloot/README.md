# PixelLoot rewards

Regenerates the nine PixelLoot config files for this pack: the seven event tables
under `config/pixelloot/events/`, plus `sets.yml` and `gui.yml`.

```bash
cd "<instance>"
node tools/pixelgo-pixelloot/generate.mjs --dry   # report only, writes nothing
node tools/pixelgo-pixelloot/generate.mjs         # write
```

Nothing is written unless every check passes. All the content lives in
`generate.mjs`; the three `catalog-*` files are generated data.

## What the shipped defaults got wrong

The config PixelLoot writes on first launch is a 1.12-era file. On 1.21.1 a good
part of it silently does nothing, because a failed `/give` from the console is
not shown to the player — the reward message still prints and the item never
arrives.

| Default config said | Reality on 1.21.1 |
|---|---|
| `pixelmon:great_ball`, `ultra_ball`, `master_ball`, `park_ball` | Not items. One item + a data component (below) |
| `pixelmon:z_crystal` | Not an item; the Z-crystals are `firium_z`, `waterium_z`, … |
| `pixelmon:silver_hourglass`, `gold_hourglass` | These are fine — they are **blocks**, so they have a block item and `/give` works. Absent from the item registry and the lang file, which is why an items-only catalogue flags them as false positives; `catalog-items.txt` now includes `BlockRegistration` too |
| `pixelmon:exp_candy_small/medium/large` | `xs_exp_candy`, `s_exp_candy`, `m_exp_candy`, `l_exp_candy`, `xl_exp_candy` |
| `pixelmon:tm{move:"hyper beam"}` | 1.12 NBT, and there is no move component. `/tm` only *lists* TMs |
| `enchanted_book{ench:[{id:sharpness,lvl:3}]}` | 1.12 NBT; 1.21.1 wants `[minecraft:stored_enchantments={…}]` |
| `minecraft:potion 1 16385` | 1.12 damage-value syntax |
| `sets.yml`: Pikachu/Charmander/Charizard in `form: galaxy` | No such form or palette exists, so the Galaxy Set could never be completed |

Boss tiers were also mis-ranked: `equal` (the weakest boss in the game, +0
levels) paid better than `common`, and `ultimate` (spawn weight **1**, the
rarest) paid a stack of Rare Candy while `epic` handed out an Elytra.

## Syntax traps

1. **Poké Balls are one item plus a data component.** `pixelmon:great_ball` does
   not exist. The variant rides on the `pixelmon:poke_ball` component, and its
   value is a **bare string with no namespace**:

   ```
   give %player% pixelmon:poke_ball[pixelmon:poke_ball="great_ball"] 4
   ```

   Confirmed against Pixelmon's own loot tables and PixelGO Dungeon's, which
   both write `"pixelmon:poke_ball": "great_ball"`.

2. **The Pixelmon lang file cannot validate item ids.** It names 118 ids that
   are not registered items — every Ball variant, every Ball lid, the music
   discs, the Pokémail. A model file under `assets/pixelmon/models/item/` proves
   nothing either, since the Ball variants all have one.

   The registries are the authority, but there are **two** of them: an id can be
   a plain item (`ItemRegistration`) *or* a block whose block item is perfectly
   giveable (`BlockRegistration`) — the hourglasses, the ores, the decor blocks.
   Checking only the item registry produces false positives.

3. **`chance` is a weight, not a percentage.** `RewardHandler` sums the chances
   of every reward the player has permission for, rolls once across that total
   and hands out the first entry it lands on — so exactly one reward is given
   per event, and the numbers only have to be relative. Every pool here is
   normalised to add up to 100 anyway, so they read as percentages.

4. **The event's own `chance` is a real percentage**, rolled before any of that.
   `chance: 15` on `kill` means 15% of kills produce one reward from the table.

5. **Commands run from the server console** (`createCommandSourceStack`), at
   permission level 4, with `%player%` substituted — except in `sets.yml`, which
   uses `{player}`, and `command` (singular) instead of `commands`.

6. **Set rewards are drawn `reward-amount` times** from the same weighted pool,
   so a set with `reward-amount: 3` can draw the same entry more than once.

## Balance

This is a **skyblock** pack (SkyblockBuilder + Ex Deorum), which drives most of
the choices: sieve metals — aluminum, silver, platinum — and vanilla materials
are genuinely scarce and read as real rewards, while blocks of diamond handed
to a level 1-10 trainer (as the default did) do not.

Rewards are pinned to the pack's existing rarity language, the same one the loot
tables use: Poké Balls and candy at the bottom, then held items and evolution
stones, then the PixelGO Balls (EXP → EV/IV → prime), then the summon-ticket
ladder `MK 0 → MK 16`, with `kubejs:ssr_ticket`, `shiny_ball`, `iv_all_ball` and
the Master Ball at the very top.

Level bands are `1-15 / 16-30 / 31-50 / 51-100` instead of the default's
`1-10 / 11-20 / 21-100`, whose last band covered 80 levels at one payout.

Event rates:

| Event | Was | Now | Why |
|---|---|---|---|
| `kill` | 25% | 15% | Constant; the highest-volume event by far |
| `capture` | 5% | 20% | Core verb of the game, and self-limiting — it costs a ball |
| `trainer` | 10% | 35% | NPC trainers are finite content |
| `shiny-capture` | 10% | **100%** | 1-in-4096 — it should never pay nothing |
| `legendary-capture` | 5% | **100%** | Same, more so |
| `raid-win` | 10% | 60% | Entry costs a pass |
| `boss` (all 9 tiers) | 100% | 100% | Bosses are already rare spawns |

## Checks the generator runs

Nothing is written if any of these fail:

- every item id exists in `catalog-items.txt`;
- every Ball variant exists in `catalog-balls.txt`;
- every set species, form and palette exists in `catalog-species.json`;
- every pool's weights add up to exactly 100;
- **payouts are monotonic.** Each reward carries a coarse value rank 0-9, and
  the weighted average per pool must not decrease as difficulty rises — across
  the four level bands of each event, across the boss spawn ladder, and across
  the five sets.

The boss ladder only covers the six tiers with `canRandomlySpawn: true`
(`common` 50 → `uncommon` 40 → `rare` 30 → `epic` 20 → `legendary` 10 →
`ultimate` 1, the spawn weights in `data/pixelmon/bosstiers/*.json`). `equal`,
`haunted` and `drowned` come from events and spawners rather than the world, so
they sit outside it and are only bounded from either side — `equal` below
`common`, `haunted` between `equal` and `rare`, `drowned` between `uncommon` and
`epic`.

Current values:

```
kill        1.1  2.1  3.3  4.3
capture     1.3  2.3  3.3  4.8
trainer     1.3  2.4  3.6  5.0
shiny       3.3  4.8  5.7  7.0
boss        equal 1.1  haunted 2.8  common 2.1  uncommon 3.3  rare 4.6
            drowned 4.1  epic 5.5  legendary 6.9  ultimate 8.2
sets        2.3  3.9  4.0  6.4  8.2
raid 5.4    legendary 8.3
```

## Sets

The UI already expected five: `gui.yml`'s `custom-dex-set-themes` maps indices
0-4 to `terminal / aqua / ember / atlas / galaxy`, but only one set existed —
and it was uncompletable. One set per theme now, in rising difficulty:

| # | Theme | Set | Goal | Draws |
|---|---|---|---|---|
| 0 | terminal | Field Notes | 5 early-route commons | 1 |
| 1 | aqua | Tidecaller | 6 water types | 2 |
| 2 | ember | Emberheart | 6 fire types | 2 |
| 3 | atlas | Atlas Dominion | 6 pseudo-legendaries | 3 |
| 4 | galaxy | Galaxy Set | 3 shinies + Rayquaza + Jirachi | 3 |

The Galaxy Set keeps the original intent — Rayquaza and Jirachi are still the
goal — but as shiny **capture targets**, which is a collection objective, not a
giveaway: no legendary is ever handed out as a reward anywhere in these files.

`gui.yml` also gains chest layouts for `set1`-`set4`. The pack runs
`sets-ui-mode: custom_client` so they are only a fallback, but the mod itself
only ever generates one for `set0`, so switching back to the chest UI would
otherwise show four empty sets.

## Rebuilding the catalogues

They are generated data, not hand-written:

```bash
node tools/pixelgo-pixelloot/rebuild-catalogs.mjs
```

Needs `unzip` on PATH and a JDK for `javap`. Set `MC_JAR` if the vanilla jar is
not at the default path. Re-run it after any Pixelmon / PixelGO update: an id
that disappears then becomes a hard failure on the next generator run rather
than a silent dud reward in game.

`catalog-species.json` (name -> forms -> palettes) is built from
`data/pixelmon/species/*.json` in the Pixelmon jar.


## Editing

- **An event pays too often** → its entry in `CHANCES`.
- **A reward is too common** → its weight in the pool. Keep the pool at 100;
  the generator refuses anything else.
- **A reward is out of place** → move it between pools and adjust its value rank
  (`v`), so the monotonicity check keeps holding.
- **A new item** → add it to the catalogue first, or the run fails.

A backup of the original nine files is in the session scratchpad under
`pixelloot_backup`.
