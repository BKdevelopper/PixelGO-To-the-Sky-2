# PixelGO loot tables

Ports the loot architecture of the Cobblemon example pack (`loottable exemple/`) onto this
modpack, using Pixelmon / PixelGO Items / Pokeblocks / Weavers Cosplay / Pokemon Armor items.

## How it works

Three layers, exactly like the example:

1. **Category tables** — one table per family of items, holding the rarity weights.
   `kubejs/data/pixelgo/loot_table/pixelmon/*`, `.../gimmicks/*`, `.../special/*`
2. **Tier ladders** — `pixelgo:basic/t0..t9`, `pixelgo:basic_underground/t0..t9`,
   `pixelgo:basic_trials/*`. Each tier stacks "chance" pools: one roll of a category table
   diluted with `minecraft:air`, so a higher air weight means a rarer drop.
3. **Injection** — every structure chest table gets **one extra pool named `pixelgo_tier`**
   at the front, which rolls a tier. The chest keeps all of its original loot.

```
chest table            pixelgo:basic/t6            pixelgo:pixelmon/helditems
  pool pixelgo_tier  ->  pool (helditems vs air) ->   leftovers   weight 1
  pool ...(vanilla)      pool (vitamins  vs air)      charcoal    weight 6
```

## Rarity profiles

Taken verbatim from the example, and reused for every table it also covers:

| Profile | Tiers and weights | Used for |
|---|---|---|
| `junk` | t1 ×1 | empty / base chests |
| `poor` | t2 ×9, t3 ×3, t4 ×1 | barrels, supply, carts, tents |
| `common` | t3 ×10, t4 ×2, t5 ×1 | normal rooms, houses, storage |
| `uncommon` | t4 ×15, t5 ×3, t6 ×1 | armouries, libraries, map rooms |
| `rare` | t5 ×15, t6 ×3, t7 ×1 | arenas, secret rooms, shrines |
| `veryrare` | t6 ×33, t7 ×2, t8 ×1 | treasure rooms, elite rooms |
| `treasure` | t7 ×30, t8 ×1 | buried treasure |
| `epic` | t7 ×6, t8 ×3, t9 ×1 | reserve for a final boss chest |

357 tables were injected. 126 of them reuse the example's exact profile because the same file
exists in both packs; Pixelmon's own 28 are pinned by hand (see below); the rest are classified
by a keyword heuristic on the file name (`heuristic()` in the generator) — that is the first
thing to adjust if a chest feels off.

Underground structures (mineshaft, ancient city, stronghold, trial chambers) use the
`basic_underground` ladder: no Poké Balls or money, but evolution stones, gems and fossils.

## Never dilute a pool with `minecraft:air`

Every tier pool is one sub-table diluted with a "nothing" entry. That entry **must** be
`{"type": "minecraft:empty", "weight": N}`, never an item entry for `minecraft:air`.

- `EmptyLootItem.createItemStack` is a bare `return;` — it emits no ItemStack at all.
- An air item entry emits an ItemStack that *is* empty.

Vanilla chest filling strips empty stacks on the way in, so air looks harmless there. Anything
that calls `LootTable.getRandomItems` and uses the returned list directly is handed the empty
stack — and Pixelmon's Poké Stop does exactly that:

```
java.lang.IllegalArgumentException: Item stack cannot be empty
  at CustomDropScreenFactory$Builder.addItems(CustomDropScreenFactory.java:128)
  at PokeStopBlock.useWithoutItem(PokeStopBlock.java:145)
```

The ladder used air entries at first, which broke every Poké Stop the moment the
`pixelgo_tier` pool was injected into `special/*_pokestop`. A common Poké Stop rolls
`basic/t1`, whose three pools are each ~75-85% "nothing", so it threw on roughly six uses in
seven — the occasional success is what made it look intermittent rather than broken.

249 entries were converted. **The rarity maths is identical** — same weights, same odds — only
the emitted stack differs. Raid dens and PokéLoot read their tables the same way, so they were
exposed to it too.

> Rule of thumb: a loot table is only safe to fill a *chest* with if it emits empty stacks. If
> a mod reads it directly, empty stacks are a crash waiting to happen. Use `minecraft:empty`
> and the question never comes up.

## Dead item ids fail the WHOLE table

A loot table naming an item id that is not in the registry does not lose that one entry — it
fails to parse and is dropped entirely, so every chest using it gives nothing. `latest.log`
reports each one as:

```
Couldn't parse element ...loot_table]:<id> - Unknown registry key in ...minecraft:item]: <item>
```

Five of the pack's own tables were failing this way on Pixelmon 9.4.1, because the ids had been
renamed or removed:

| Was | Now | In |
|---|---|---|
| `pixelmon:plasma_helm` / `_plate` / `_legs` | `plasma_helmet` / `_chestplate` / `_leggings` | `pixelmon:chests/plasma`, `chests/galactic` |
| `pixelmon:amethyst` | `pixelmon:crystal` | `minecraft:chests/abandoned_mineshaft` |
| `pixelmon:amethyst_{axe,hammer,hoe,pickaxe,shovel,sword}` | `pixelmon:crystal_*` | village toolsmith / weaponsmith |

Pixelmon dropped its amethyst set; `crystal` is the surviving gem set and carries the same six
tools. Backups of the five files are in the session scratchpad under `loot_backup`.

**The catalogue cannot catch this.** It is built from ids *referenced by loot tables the pack
already ships*, so a table that names a dead id validates itself. The authority is the game's
own log, or an item registry dump (`tools/pixelgo-pixelloot/catalog-items.txt`, built from
`ItemRegistration` + `BlockRegistration`) — and even that has gaps, because Pixelmon registers
some blocks dynamically (all 60-odd `berry_leaves_*` are missing from it, and they are real).

## Item catalogue and safety

Pixelmon's language file lists display names for things that are **not** registered items
(every Poké Ball variant, for instance), so it cannot be used to validate ids. The generator
instead builds its catalogue from ids **proven to load in this pack**:

- every item referenced by a loot table the pack already ships
  (`dungeons_arise`, `minecraft`, `pixelgo_dungeon`, `loot`, `pixelmon`) — 1319 Pixelmon ids;
- plus ids referenced by Pixelmon's own species files (mega stones, legendary keys).

Anything outside that catalogue is dropped and listed at the end of the run. Currently dropped:

```
jade_orb, light_stone, dark_stone, wishing_star,
silver_wing, rusted_sword, rusted_shield, zygarde_cube
```

These almost certainly exist, but nothing in the pack proves it, so they stay out until the game
confirms them. `gimmicks/legendaries` still ships 10 verified entries.

**Poké Balls are a single item.** `pixelmon:great_ball` does not exist; it is
`pixelmon:poke_ball` plus the `pixelmon:poke_ball` data component. The generator only emits
variants it has actually seen used in the pack (`BALL_VARIANTS`).

## PixelGO Balls

`pixelballs-*.jar` does not add items — it registers **20 more variants of the
`pixelmon:poke_ball` data component** (that is why its assets sit under `assets/pixelmon/`).
Names come from its `data/pixelmon/pokeballs/*.json` `"name"` field, so they are exact, and they
are added to `BALL_VARIANTS` by hand since no loot table used them before.

They are split into three tables by how much they actually change the game:

| Table | Contents | Why |
|---|---|---|
| `pixelmon/pokeballs_exp` | EXP XS → XL (4 to 20 levels on capture) | useful, not decisive; XS weight 10 down to XL weight 1 |
| `pixelmon/pokeballs_training` | 6 EV balls (252 EV), 6 single-stat IV balls (31 IV) | strong; EV weight 6, IV weight 2 |
| `pixelmon/pokeballs_prime` | Skin, Shiny, IV ALL | decisive — the IV ALL Ball also carries `catchBonus: 20` |

Inside `pokeballs_prime`: skin 73%, shiny 18%, IV ALL 9%.

EXP balls enter at t4, training at t5, prime only at t7 — the same rung as the SSR ticket.
Odds per chest:

| Chest | exp ball | training | prime | of which shiny | of which IV ALL |
|---|---|---|---|---|---|
| common | 1.47% | 0.14% | — | — | — |
| uncommon | 6.18% | 0.48% | — | — | — |
| rare | 11.35% | 2.42% | 0.01% | — | — |
| treasure room | 17.71% | 4.13% | 0.03% | 0.01% | — |
| gate_s | 21.05% | 5.63% | 0.13% | 0.02% | 0.01% |
| gate_sss | 31.94% | 11.29% | 0.64% | 0.12% | 0.06% |
| gate_demon | 36.11% | 14.00% | 0.95% | 0.17% | 0.09% |

A Shiny Ball is therefore roughly 1 in 600 Demon-gate chests, an IV ALL Ball 1 in 1100. EXP balls
are deliberately common at the top — they are ordinary consumables, like held items or medicine.

## KubeJS summon items

The three custom items from `kubejs/startup_scripts/main.js` are wired in as loot. Their tiers
are derived from what they cost to craft, not from guesswork:

| Item | Recipe | Placement |
|---|---|---|
| `kubejs:random_egg` | egg + 8 fertilized essences | `pixelgo:special/summons`, weight 12 |
| `kubejs:mega_key` | Key Stone = 8 × random_egg + a summon ticket | `pixelgo:special/summons`, weight 3 |
| `kubejs:ssr_ticket` | infusion, 4 × fading compressed collector | `pixelgo:special/ssr_ticket`, alone |

`summons` enters the ladder at **t5** and `ssr_ticket` at **t7**, so nothing below a rare chest
can produce them. Resulting odds per chest:

| Chest profile | random_egg / mega_key | ssr_ticket |
|---|---|---|
| common (ordinary room) | 0.014% | — |
| uncommon (armoury) | 0.056% | — |
| rare (arena, secret room) | 0.29% | 0.013% |
| veryrare (treasure room) | 0.63% | 0.035% |
| treasure (buried treasure) | 1.32% | 0.27% |
| bastion treasure | 1.43% | 0.26% |

Within `summons`: 80% random egg, 20% mega key. The ominous trial chambers also carry them —
`ominous_rare_t1` can give a summon, `ominous_unique_t1` an SSR ticket.

To make the SSR ticket more or less common, change its air weight in `BASIC.t7/t8/t9`
(higher air = rarer); the table above is printed by the odds snippet in the commit notes.

## HelsCrates keys

The four crate blocks sit on the starting island, and **a crate does nothing without its key**.
Nothing in the pack crafts one, no shop sells one, and the mod itself never drops one — so
before this the blocks were scenery. The keys are the whole content gate, which is why they go
in the ladder rather than anywhere else.

**There are four keys, not five.** HelsCrates registers one block and one key *per config
file*, at startup:

```
config/helscrates/crates/<id>.json  ->  helscrates:<id>_crate + helscrates:<id>_key
```

This pack ships `poke`, `great`, `ultra` and `master`. `helscrates:common_key` has a model, a
texture and a lang entry in the jar but **no config file**, so it is never registered — the
same trap as the Poké Ball variants. The generator checks each config file exists and reports
the key as dropped if one disappears.

A key is a plain item with no data component, consumed on use, and a crate refuses a key that
does not match it. So the key *is* the loot, with nothing to carry alongside it: one table per
key, because each one wants a different curve.

| Table | Enters at | Shape |
|---|---|---|
| `special/crate_key_poke` | t3 | common early, deliberately fades out at the top |
| `special/crate_key_great` | t4 | the workhorse, flat across the mid and late game |
| `special/crate_key_ultra` | t6 | late |
| `special/crate_key_master` | t7 | top only |

t3 is not a free choice: `gate_e` and the legendary Poké Stop bottom out at t3, and if the Poke
Key does not reach that far the crate on the starting island never opens.

Odds per chest:

| Source | Poke | Great | Ultra | Master | any key |
|---|---|---|---|---|---|
| Poké Stop (common) | — | — | — | — | — |
| Poké Stop (rare) | 3.5% | 0.16% | — | — | 3.6% |
| Poké Stop (legendary) | 11% | 0.75% | — | — | 11.7% |
| gate_e | 11% | 0.75% | — | — | 11.7% |
| gate_c | 9.7% | 4.0% | 0.10% | — | 13.4% |
| gate_b / rare chest | 7.8% | 6.0% | 0.43% | 0.01% | 13.7% |
| treasure room | 4.8% | 7.7% | 1.8% | 0.02% | 13.8% |
| gate_s | 4.0% | 7.4% | 2.5% | 0.10% | 13.4% |
| buried treasure | 2.8% | 7.7% | 3.3% | 0.18% | 13.4% |
| gate_sss | 1.6% | 6.3% | 4.5% | 0.40% | 12.3% |
| gate_demon | 0.97% | 5.5% | 5.2% | 0.55% | 11.8% |

About **one key in every eight chests**, all four counted together, and that figure stays flat
from the first Gate to the last — what changes is *which* key. Ultra and Master rise all the
way; Poke falls away on purpose, the same way the low gate beacons do.

A Master Key is pinned **below** the SSR ticket (0.18% vs 0.27% in buried treasure, 0.55% vs
0.96% in a Demon Gate) because a Master Crate is worth more than one ticket: it guarantees a
Master Ball *and* a Rare Candy hoard, then rolls 3-5 more rewards including a 1.5% Shiny Ball
and a 0.9% IV ALL Ball.

Keys are **not** in the underground ladder, which excludes Poké Balls and money by design and a
crate key is mostly a bundle of Poké Balls.

## PixelGO Dungeon gates

The gate tables are ranked E < D < C < B < A < S < SS < SSS < Demon, which nothing in the file
name reveals, so they are pinned explicitly in `PROFILE_OVERRIDE` instead of going through the
keyword heuristic. Resulting odds for the rarest items:

| Gate | Tier weights | summons | ssr_ticket |
|---|---|---|---|
| gate_e | t3×10 t4×2 t5×1 | 0.01% | — |
| gate_d | t4×15 t5×3 t6×1 | 0.06% | — |
| gate_c | t4×8 t5×8 t6×1 | 0.12% | — |
| gate_b | t5×15 t6×3 t7×1 | 0.29% | 0.01% |
| gate_a | t5×8 t6×8 t7×2 t8×1 | 0.61% | 0.07% |
| gate_s | t6×12 t7×5 t8×2 | 1.03% | 0.14% |
| gate_ss | t6×10 t7×10 t8×3 t9×1 | 1.57% | 0.30% |
| gate_sss | t7×10 t8×6 t9×2 | 2.95% | 0.66% |
| gate_demon | t7×6 t8×8 t9×4 | 4.12% | 0.96% |

Strictly increasing on both columns — worth re-checking if you touch these weights, since a
higher gate that pays worse than a lower one is easy to introduce by accident.

### Gate beacons in the loot

All **nine** beacons are in the ladder, not just the four the mod's own gate chests hand out.
A beacon does not get you *to* a Gate — Gates open by themselves every minute. What it buys is
the **rank**, so the low ranks are a convenience and the top ranks are the prize.

Four bands rather than one table, so a mid-tier chest can never produce a Demon beacon:

| Table | Contents | Enters at |
|---|---|---|
| `special/gate_beacons_t1` | E 6, D 3, C 1 | t4 |
| `special/gate_beacons_t2` | C 6, B 3, A 1 | t6 |
| `special/gate_beacons_t3` | S 6, SS 2, SSS 1 | t7 |
| `special/gate_beacons_t4` | SSS 3, DEMON 1 | t8 |

Odds per chest:

| Chest | E/D/C | C/B/A | S and up | DEMON |
|---|---|---|---|---|
| common (ordinary room) | 0.44% | — | — | — |
| uncommon (armoury) | 1.87% | 0.03% | — | — |
| rare (arena) | 2.76% | 0.13% | 0.009% | — |
| veryrare (treasure room) | 3.59% | 0.56% | 0.025% | 0.0013% |
| treasure (buried) | 4.63% | 1.02% | 0.18% | 0.0015% |
| gate_e | 0.44% | — | — | — |
| gate_c | 2.14% | 0.03% | — | — |
| gate_a | 3.06% | 0.41% | 0.047% | 0.0025% |
| gate_s | 3.55% | 0.77% | 0.10% | 0.0049% |
| gate_ss | 3.51% | 1.00% | 0.21% | 0.016% |
| gate_sss | 2.66% | 1.57% | 0.47% | 0.043% |
| gate_demon | 1.60% | 1.96% | 0.69% | 0.076% |

Monotonic on the two columns that matter — `C/B/A` and `S and up` both rise all the way from
`gate_e` to `gate_demon`. The `E/D/C` column peaks in the middle and falls away at the top on
purpose: a Demon chest should not be handing out tutorial beacons.

A DEMON beacon out of ordinary loot is about **1 chest in 1300**, and only in the very best
chests in the game. That is deliberately far below the mod's own gate_demon table, which gives
one in seven — the ladder is a trickle, not the source. It is also no longer the only road:
natural Demon Gates are now one in 200 (see below), so the beacon is a shortcut rather than
the whole plan.

The underground ladder carries the first three bands too (Gates tear open in caves as readily
as anywhere else) but not the apex one, so a stronghold can never produce a Demon beacon.

> The rank **weights** were rebuilt at the same time — see `tools/pixelgo-quests/README.md`.
> A level-100 SS Gate used to spawn as often as a D one, and the mod's own defaults put DEMON
> at one Gate in 9641. The ladder now ends at **DEMON = one in 200**, each endgame rank twice
> as rare as the one below: S 1/33, SS 1/50, SSS 1/100, DEMON 1/200.

> **Updating the mod wipes the injection.** PixelGO Dungeon ships its own copies of these files,
> so a mod update overwrites them and the `pixelgo_tier` pool disappears. Just re-run the
> generator: it re-injects anything that lost its pool and leaves everything else alone. Same
> applies to any other mod that ships loot tables this pack overrides.

## Pixelmon's own tables

`kubejs/data/pixelmon/loot_table/` is a full override of Pixelmon's data, and it already uses
the same layered architecture as the example: chests roll `pixelmon:intermediate/*` sub-tables.
28 tables are injected there, **every one of them pinned explicitly** in `PROFILE_OVERRIDE`,
because the filename heuristic reads them badly — `arena` looks rare but holds a camera and some
film, `galactic` looks generic but holds the Adamant Crystal and the Griseous Core. Each profile
comes from what the table actually contains.

| Profile | Tables |
|---|---|
| `junk` | `junk` |
| `poor` | `waypoint`, `brewing`, `arena`, `fridge` |
| `common` | `fridge_full`, `boat`, `day_care`, `christmas`, `valentines`, `graveyard`, `haunted_home` |
| `uncommon` | `haunted_tower`, `dark_tower`, `water_tower` |
| `rare` | `galactic`, `plasma`, `teams/{aqua,magma,galactic,plasma}`, `ultra_ruin` |
| `veryrare` | `ultraspace/{ultra_ruin,crater_geyser,plant_monolith}` |

Three tables are deliberately **not** injected:

- `intermediate/*` (39) — sub-tables the chests above already roll. Injecting here would fire
  the ladder a second time per chest. They are `"type": "minecraft:chest"`, so the generic
  chest test would otherwise catch them; `PIXELMON_SKIP` stops that.
- `chests/ultraspace/crater_pipe.json` — a pure redirect to `abandoned_mineshaft` or
  `crater_geyser`, both injected in their own right.
- `blocks/*` (791) — block drops, excluded by the `isChest` test as everywhere else.

### Poké Stops are capped

`special/{common,rare,legendary}_pokestop` respawn on a timer, so they are a renewable faucet
rather than one-shot structure loot. They stop at `junk` / `poor` / `common`, whose top rung is
t5 — which keeps the SSR ticket, the prime balls and the mega keys (t7 and above) out of
anything a player can get simply by waiting. A legendary Poké Stop's SSR chance is **0.000%**
by construction, not by luck.

### Raid dens are gated per star

`raid_den/*.json` are `"type": "pixelmon:raid_den"`, so the chest loop skips them and a separate
pass handles them. Their pools are gated by `pixelmon:star_level`, which is a ready-made
difficulty curve, so they get **one pool per star** instead of one flat roll — a 5-star raid
cannot pay the same as a 1-star. The star values are read from each table's own pools rather
than assumed, so a Pixelmon update that adds a star level is picked up on the next run.

| Stars | Profile | SSR per raid |
|---|---|---|
| 1 | `poor` | — |
| 2 | `common` | — |
| 3 | `uncommon` | — |
| 4 | `rare` | 0.013% |
| 5 | `veryrare` | 0.035% |
| 6 (Tera only) | t6×12 t7×5 t8×2 | 0.144% |
| 7 (Tera only) | t6×10 t7×10 t8×3 t9×1 | 0.299% |

Raid dens respawn as well, which is why this stops short of the treasure tiers except at 6-7
stars — a rung only Tera raids reach. `raids.json` has stars 1-5, `tera.json` 1-7.

## What was skipped

No equivalent found in this pack, so left out rather than faked:

- **TMs / TRs** — Pixelmon has no plain `tm_*` items (they are component-based).
- **Tumblestones, mochi, evolution sweets, aprijuice, mulch** — Cobblemon-only.
- **Booster packs** — replaced by Pokeblocks vouchers (`raid_pass`, `raid_voucher`,
  `radiant_voucher`, `poke_egg`).

Money *was* found: `pokeblocks:nickel` / `dime` / `poke_coin`, in `pixelgo:special/money`.

15 woodland-mansion tables the example overrides come from a mod this pack does not have, so
they were skipped (reported at the end of the run).

Two tiers are written but unused — `basic_trials/unique_t1` and `ominous_unique_t1`. The example
leaves vanilla trial-chamber *unique* rewards untouched and so does this, but the tables are
there if you want to wire them into `chests/trial_chambers/reward_unique.json`.

## Regenerating

```bash
cd "<instance>"
node tools/pixelgo-loot/generate.mjs --dry   # report only, writes nothing
node tools/pixelgo-loot/generate.mjs         # write
```

The run is **idempotent**: a table that already carries a `pixelgo_tier` pool is left alone, so
you can re-run after editing the categories without stacking pools. To re-roll an injection,
delete that pool from the file first.

Block drops and entity drops are never touched — only chest-style tables.

Missing vanilla chest tables are copied out of `1.21.1.jar` before injection (a datapack override
replaces the table, so the vanilla loot has to be carried over). Override the jar path with the
`MC_JAR` environment variable if your install lives elsewhere.

## Editing

- **A chest gives the wrong quality** → change its profile in `heuristic()`, or delete its
  `pixelgo_tier` pool and re-run.
- **An item is too common / too rare** → edit its weight in the category table; every tier that
  uses that category follows automatically.
- **A whole tier is too generous** → raise the air weights in `BASIC` / `UNDER`.

## No PixelGO Items in any loot (2026-11-08)

On request, no `pixelgoitems:*` item is in a loot table any more. They come from their
recipes (workbench, Mekanism, Ender IO, Cyclic — `35_machines.js`, `20_pixelmon.js` and the
mod's own) and from the quest book (`tools/pixelgo-quests`: the PixelGO Items chapter, and
PixelGO Items as rewards on badges, Pokédex milestones, trophies…).

| Where | What changed |
|---|---|
| Structure chests (`generate.mjs`) | +EV items and `random_ev` out of `pixelmon/evfeathers`, `random_fossil` out of `pixelmon/fossils`; `pixelmon/ivcandy` and `special/gimmick_items` (nothing else in them) **deleted**, with every ladder pool that rolled them (`basic/t5-t9`, `basic_underground/t5-t9`, `basic_trials/unique_t1`, `ominous_unique_t1`) |
| Mystery Bags (`bags.mjs`) | every `pixelgoitems:*` entry taken out of every pool (49 entries); `NEW_ITEMS` emptied |
| FTB reward tables | the four bag mirrors regenerated; `ticket.snbt` (Random EV/IV/Level/Size only, used by no quest) deleted; the Shiny Swapper taken out of `supra_reward.snbt` |
| Pokémon drops, Poké Chests, raids | `tools/pixelgo-drops/generate.mjs` (see its README) |

The only drop left is the mod's own: mining Pixelmon Fossil ore drops a Random Fossil
(`randomFossilDropChance` in `config/pixelgoitems-common.toml`). It is a block-drop event in
the jar, not a loot table. Backup: `backups/pgi-loot-quests-2026-11-08/`.

## The Mystery Bags — `bags.mjs`

The four Mystery Bags (Treasure Bags types `pixelgo:tier1..4`) roll
`kubejs/data/loot/loot_table/tier1..4.json`. Those tables are kept by hand and `generate.mjs`
does not touch them. `bags.mjs` only adds to them, idempotently:

```bash
node tools/pixelgo-loot/bags.mjs --dry
node tools/pixelgo-loot/bags.mjs
```

> **Since 2026-11-08 the bags hold no PixelGO Item** (section above): `bags.mjs` strips them
> from every pool and `NEW_ITEMS` is empty. The table below is history.

**PixelGO Items v3** (`pixelgoitems-3.0`, 2026-10-14) — 15 of its 20 new items go into the `utils` pool
(not the trophies).
The mod lists all twenty in `NEVER_DROPPED`, so no Pokémon drops them: the bags are their source.

| Bag | Items (weight, out of a utils pool of ~2 000 / 1 810 / 1 340 / 770) |
|---|---|
| Mystery Bag | Healer 15, Gym Finder 15, the 8 outfit pieces (World Champion, Orange Hair) 6 each |
| Rare | Healer 25, Laptop 20, Old Chisel 15, Trading Simulator 8, outfit pieces 6 |
| Epic | Upgraded Healer 15, Laptop 15, Trading Simulator 20, Old Chisel 10, Enchanted Egg 6 |
| Legendary | Upgraded Healer 15, Trading Simulator 10, Enchanted Egg 15 |

The Enchanted Egg hatches a random Pokémon for one Nether Star (`enchantedEggFood`) every ten
minutes, which is why it stays in the two top bags. The five trophies are deliberately left out
(`REMOVED`): they were in the first version and taken out again on request. Since 2026-10-17
they are the rewards of the *Pokémon Challenges* quest chapter, and nothing else gives them.

**Pokédolls** — one table per rarity in `pixelgo:pokedolls/<rarity>` (every doll at weight 1,
list from `tools/pixelgo-quests/pokedolls.json`), plus `shiny` (80 shiny dolls). Each bag gets a
`pokedolls` pool that rolls one table or `minecraft:empty`:

| Bag | Doll | Common | Uncommon | Rare | Epic | Legendary | Shiny |
|---|---|---|---|---|---|---|---|
| Mystery Bag | 30 % | 22 | 8 | | | | |
| Rare | 40 % | 10 | 18 | 12 | | | |
| Epic | 52 % | | 10 | 22 | 14 | 4 | 2 |
| Legendary | 70 % | | | 12 | 28 | 25 | 5 |

A Mystery Legendary Bag therefore holds a Legendary doll one time in four — the road to the
Legendary row of the Pokédolls chapter. Neither the new items nor the dolls sell anywhere, so the
bags' shop prices (2 500 / 7 500 / 25 000 / 200 000 $) cannot be turned back into money. Edit the
weights in `NEW_ITEMS` / `DOLL_POOL` and re-run; a changed weight is rewritten.

**Extras** (2026-10-15, `EXTRAS`) — into the `utils` pool, matched by item + components:

| Bag | Summon tickets (MK) | Smithing templates | PokéNav / Upgrade Orb | Vanilla tool books |
|---|---|---|---|---|
| Mystery Bag | Light Gray 0 (×2-4) 60, Gray 1 (×1-2) 45, Red 2 30, Magenta 3 18 | Coast, Dune, Wild, Sentry 8 | PokéNav 12 | Efficiency II, Unbreaking I 8, Fortune I 6 |
| Rare | Pink 4 (×1-2) 40, Purple 5 32, Blue 6 24, Cyan 7 16 | Tide, Wayfinder, Raiser, Shaper, Host, Rib, Snout 7 | PokéNav 10, Orb 8 | Efficiency III 8, Unbreaking II 7, Fortune II, Silk Touch 6 |
| Epic | Light Blue 8 32, Green 9 26, Lime 10 20, Yellow 11 14 | Flow, Bolt 6, Ward, Eye, Vex 5, Netherite Upgrade 6 | Netherite, Old, Wanderer shells 4, Orb 10 | Efficiency IV, Unbreaking III 6, Fortune III, Silk Touch 5, Mending 4 |
| Legendary | Orange 12 30, Brown 13 27, White 14 24, Black 15 21 (Rainbow 16: 20, hand-kept) | Spire 6, Silence 3, Netherite Upgrade (×1-2) 15 | Gholdengo 5, Hidden Gholdengo 3, Orb 6 | Efficiency V 5, Unbreaking III, Fortune III 4, Mending 6 |

The PixelGO Enchant (13) and PixelGO Minions (23) books were all in the bags already (hand-kept
entries). The `other_tables` pool — one roll of a vanilla chest table (bonus chest, village,
dungeon, stronghold, trial chambers, ancient city...) — was removed from every bag (`REMOVED_POOLS`);
the templates replace what those tables gave that mattered.

## FTB Quests reward tables — `rewardtables.mjs`

`config/ftbquests/quests/reward_tables/mystery_bag_tier1..4.snbt` list exactly what each bag can
give, flattened from the loot tables:

- **every stack once**, nested tables (minions, Pokédolls) expanded to their items; a bag that
  drops another bag lists the bag;
- **weight** = drops of that stack per 1 000 bags opened, so FTB's % column is the stack's share of
  everything the bag drops; **count / random_bonus** = the `set_count` range;
- **loot_size** = average stacks per bag, rounded (1.88 / 2.02 / 2.18 / 2.40 → 2);
- ids hashed from the bag and the stack: stable across runs, so quests pointing at a table keep
  working; titles (`&aMystery Bag`...) go into `lang/en_us.snbt`.

The tables are rewritten whole, so **never edit them in the FTB editor** — change the bag and
re-run. `bags.mjs` runs it at the end of every run, and a Claude Code hook
(`.claude/settings.json` → `hook-rewardtables.mjs`) runs it whenever a bag table, a minion / doll
sub-table or a bag type is edited. By hand:

```bash
node tools/pixelgo-loot/rewardtables.mjs --dry
node tools/pixelgo-loot/rewardtables.mjs
```

It refuses to write (and lists why) if a bag uses something it cannot mirror: pool or entry
conditions, `enchant_randomly` / `enchant_with_levels`, a loot table outside `kubejs/data`.

## 1.20-format functions (`fix-setnbt.mjs`)

`minecraft:set_nbt` and the old `set_attributes` format (`"operation": "addition"`, no `id`)
were removed in 1.20.5. A table that still uses them is **rejected whole**: the chest spawns
empty. 29 dungeons_arise tables had this (fixed 2026-11-12). They are older copies with our own
edits (ball/lid pools, Ex Deorum chunks), so they are converted in place, not replaced by the jar.

```
node tools/pixelgo-loot/fix-setnbt.mjs        # converts, stops on any NBT key it does not know
```

Run it again after copying any table from an old pack, then check `logs/latest.log` for
`Couldn't parse element ... loot_table`.
