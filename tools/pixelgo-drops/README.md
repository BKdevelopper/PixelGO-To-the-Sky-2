# Pokémon drops

Adds this pack's items to the three drop tables in
`kubejs/data/pixelmon/drops/`:

| File | What it is |
|---|---|
| `pokedrops.json` | what a defeated Pokémon drops |
| `pokechestdrops.json` | the four Poké Chest tiers |
| `raiddrops.json` | raid rewards, by star level and type |

```bash
cd "<instance>"
node tools/pixelgo-drops/generate.mjs --dry   # report only
node tools/pixelgo-drops/generate.mjs         # write
```

Every run rebuilds from the pristine snapshot in `base/`, so re-running never
stacks entries and **nothing that shipped with the pack is modified** — only
added to. After a Pixelmon update, delete `base/` so the next run re-snapshots
the new files.

`blankimprintrate.json` is TM imprint rates, not loot, and is left alone.

## The schema, and why the `pokemon` field is the interesting part

```json
{ "pokemon": "Dragonite minlvl:50",
  "items": [ { "item": "pixelmon:gold_bottle_cap", "min": 1, "max": 1, "chance": 0.04 } ] }
```

`pokemon` is not a name — it is a full **PokemonSpecification**. The registry
requires a species in it (`registerPokemonDrops` logs *"Invalid drop found"* and
skips a spec without one), but everything else in the spec is **re-tested
against the entity when it dies**: `PokemonDropInformation.getDrops(entity)`
begins with `pokemonSpec.matches(entity)` and returns nothing if it fails.

So `minlvl:`, `palette:shiny`, `isboss:`, `form:` are real gates, not just
selectors — which is the main lever used here, because a drop table fires on
*every* wild Pokémon defeat and needs tighter rarity than a chest does.

`item` may be a plain id string or `{id, Count, components}` — that second form
is how a Poké Ball variant is written, since all variants are one item plus the
`pixelmon:poke_ball` component.

`chance` is an independent probability per line, 0..1.

## What was added

225 drop lines, 2 merged into a spec the pack already had and 223 as new
entries (1207 → 1430 entries). Nothing is removed or reweighted.

| Group | Species | Drops |
|---|---|---|
| Coin Pokémon | Meowth, Persian, Perrserker, Gimmighoul, Gholdengo | Nickel 50%, Dime 20%, Poké Coin 5% |
| Pseudo-legendaries, **level 50+** | 12 | Gold Bottle Cap 4%, Red Ticket [MK 2] 1.5% |
| Pseudo-legendaries, **shiny** | 12 | Random Egg 50%, Gold Bottle Cap 35%, Purple Ticket [MK 5] 10% |
| Strong and fully evolved, **level 55+** | 196 | EXP XS Ball 2% |

**No PixelGO Items (2026-11-08, on request).** No `pixelgoitems:*` item is dropped by a
Pokémon, a Poké Chest or a raid any more — they come from their recipes and the quest book
(`tools/pixelgo-quests`, PixelGO Items chapter). Five groups went with them, since a
PixelGO item was all they dropped: fossil Pokémon (`random_fossil` 5%), Ditto 25+ and the
Eeveelutions (`skin_swapper` 2% / 3%), the Happiny line (`random_iv` 5%) and the big ones
(`size_randomizer` 4%). Also gone: `random_iv` 5% from the pseudo-legendaries 50+,
`random_ev` 3% from the strong 55+, and the PixelGO entries of the Poké Chests and raids
below.

The two broad groups are derived, not typed out: "pseudo-legendary" is base
stat total ≥ 600 and not legendary, "strong" is ≥ 500, fully evolved and not
legendary. A new generation is picked up by rebuilding `catalog-species.json`.

No legendary drops anything new. A shiny pseudo-legendary is about as rare as
this pack gets outside a dungeon, which is why that one row is generous.

## Poké Chests: rarity is 1 ÷ list length

`getTierNDrop()` picks **one element uniformly at random** from the tier's list
(`RandomHelper.getRandomElementFromCollection`). There are no weights — the only
way to make something rarer is to make the list longer.

| Tier | Entries | Odds per added item |
|---|---|---|
| tier1 | 102 → 106 | 0.94% |
| tier2 | 117 → 122 | 0.82% |
| tier3 | 37 → 41 | 2.44% |
| ultraSpace | 53 → 59 | 1.69% |

tier3 only holds 37 entries, so **anything put there lands 2.4% of the time** —
ten times what the best dungeon chest pays. That is the shipped balance, not a
choice (the vanilla list already hands out a Master Ball at that rate), but it
is why the top of the pack's ladder is not here: no SSR ticket, no Shiny Ball,
no IV ALL Ball in any tier.

## Raids: ten drops, not one

`config/pixelmon/drops.yml` sets `den-star-drops: [2, 4, 6, 8, 10]`. A 5-star
raid hands out **ten** items, each drawn from the `Any` list plus the matching
type list — roughly 1170 total weight.

That means weight 1, the smallest there is, still lands **0.85% per raid**, and
nothing can be made rarer without inflating the pool. Since raid dens respawn,
that is the floor *and* the ceiling for what belongs here:

| Star | Drops | Added |
|---|---|---|
| 1 | 2 | Nickel 10.3%, EXP XS Ball 2.1% |
| 2 | 4 | Dime 16.5%, EXP S Ball 3.5% |
| 3 | 6 | Poké Coin 17.4%, EXP M Ball 3.7%, Random Egg 3.1% |
| 4 | 8 | EXP L Ball 3.6%, Red Ticket 2.2%, EV HP Ball 1.5% |
| 5 | 10 | EXP XL Ball 3.4%, IV Atk Ball 0.85%, Mega Key 0.85%, Purple Ticket 0.85% |

A Mega Key or an MK 5 ticket at 0.85% per 5-star raid is the top prize. The SSR
ticket, the Shiny Swapper and the prime balls stay out: a 5-star raid would pay
them nearly as often as a Demon gate chest, and unlike a gate chest you can do
it again tomorrow.

## A typo in the shipped data

`raiddrops.json` gave `minecraft:dragons_breath` in five places. The vanilla id
is `minecraft:dragon_breath` — the wrong one silently drops nothing. Fixed on
write; the snapshot in `base/` still has it, so the fix is reapplied every run.

## Checks

Nothing is written if any of these fail:

- every item id exists in `../pixelgo-pixelloot/catalog-items.txt`;
- every Ball variant exists in `../pixelgo-pixelloot/catalog-balls.txt`;
- every species in every spec exists in `catalog-species.json`;
- every Poké Chest tier and raid star named here exists in the base file.

`catalog-species.json` here is the richer index — dex, types, base stat total,
tags, whether it still evolves — built from `data/pixelmon/species/*.json`.
The item and ball catalogues are shared with the PixelLoot tool and rebuilt by
`node tools/pixelgo-pixelloot/rebuild-catalogs.mjs`.

## Editing

- **A drop is too common** → its `chance` (pokedrops) or `weight` (raids).
- **A drop should only happen late** → add `minlvl:` to the spec; it is enforced
  at drop time.
- **A new group** → `addGroup(label, specs, items)`; unknown species and unknown
  item ids both fail the run.
