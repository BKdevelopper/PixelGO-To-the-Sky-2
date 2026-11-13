# "Trainer's Path" skill tree

A Puffish Skills tree (`puffish_skills 0.19`, config **version 3**) built on the 12 player
attributes exposed by **PixelGO Enchant** (`pixelgo`).

## Where the files live

```
config/puffish_skills/config.json                       <- declares the "pixelgo" category
config/puffish_skills/categories/pixelgo/
    category.json       title, icon, background, starting points
    definitions.json    the 97 skills (title, description, icon, frame, cost, rewards)
    skills.json         X/Y position of every skill
    connections.json    normal links + exclusive links (mutually exclusive choices)
    experience.json     level curve + XP sources
```

A backup of the original `config.json` sits at `config/puffish_skills/config.json.bak`.

## Structure

97 skills, **133 points** of total cost. A single central root (`origin`), then **6 branches**
laid out in a star:

| Branch | Direction | Theme | `pixelgo` attributes |
|---|---|---|---|
| Capture | up | throws, shinies | `catch_rate`, `shiny_odds` |
| Training | upper right | XP / EVs / combat | `pokemon_experience`, `ev_gain` |
| Breeding & Bonds | lower right | friendship, eggs, healing | `friendship_gain`, `egg_hatch_speed`, `party_vitality` |
| Loot | down | drops and chests | `pokemon_drop_luck`, `pokeloot_luck` |
| Harvest & Fishing | lower left | apricorns, berries, fishing | `harvest_yield`, `fishing_luck` |
| Digging & Exploration | upper left | fossils, mining, mobility | `fossil_luck` |

Every branch shares the same skeleton: 1 gateway → 3 nodes → 3 nodes → 4 nodes →
4 keystones (cost 2) → 1 capstone (cost 3, *challenge* frame, `required_spent_points: 45`).

The 4 keystones of each branch form **2 exclusive pairs**: taking one permanently locks the other.
12 exclusive pairs in total, so the tree can never be completed 100%.

## Point economy

- 1 starting point + 1 point per level, `level_limit: 100` → **101 points maximum**.
- Total cost is 133 points, about 24 of which are made unreachable by the exclusions, so real
  trade-offs remain.

Curve: `120 + 34 * level + 1.6 * level ^ 2` (level 1 ≈ 120 XP, level 50 ≈ 5,820 XP).

XP sources (`experience.json`):

| Source | Gain |
|---|---|
| Defeating a `pixelmon:pixelmon` | `clamp(8 + max_health * 0.45, 8, 120)` |
| Mining a `#c:ores` block | 12 |
| Mining stone (`#minecraft:base_stone_overworld`) | 2 |
| Mining cobblestone | 1 |
| Crafting a Poké Ball (`#pixelgo:poke_balls`) | 6 × count (capped at 96) |
| Fishing up an item | 12 |

> The `kill_entity` source depends on how Pixelmon removes the entity of a wild Pokémon defeated
> in battle. If it does not fire for you, the mining / fishing / crafting sources are enough to
> progress — just raise their values.

## Maximum values (if every branch were taken)

| Attribute | Tree total | Attribute cap | Meaning |
|---|---|---|---|
| `catch_rate` | +116 | 1000 | % added to the ball bonus |
| `shiny_odds` | +8 | 4096 | extra shiny rolls (1/4096 each) |
| `pokemon_experience` | +175 | 1000 | % Pokémon XP |
| `ev_gain` | +112 | 1000 | % EVs after battle |
| `friendship_gain` | +17 | 100 | friendship per pulse (every 600 ticks) |
| `party_vitality` | +23 | 100 | % of max HP restored per pulse |
| `egg_hatch_speed` | +280 | 10000 | egg steps per pulse |
| `pokemon_drop_luck` | +147 | 1000 | % drop duplication |
| `pokeloot_luck` | +137 | 1000 | % Poké Loot duplication |
| `harvest_yield` | +213 | 1000 | % apricorns / berries |
| `fossil_luck` | +66 | 10000 | chances in 10,000 per stone block |
| `fishing_luck` | +46 | **90** | % less waiting — **capped at 90** |

`fishing_luck` saturates quickly: the tree (+46) plus the *Deep Lure* III enchantment (+60)
already blow past the cap of 90.

## Syntax traps (Puffish 0.19, config v3)

Five non-obvious rules, all verified against the mod's own code:

1. **The `type` of an icon, a frame and a curve is a bare word**, with no namespace: `"item"`,
   `"advancement"`, `"expression"`. Writing `"puffish_skills:item"` gives
   *"Expected a valid icon type"*. **Rewards** and **XP sources**, on the other hand, are full
   identifiers (`puffish_skills:attribute`, `puffish_skills:kill_entity`).
2. **Variable operations use two different namespaces.** Those of the builtin prototypes
   (`get_type`, `get_max_health`, `get_count`, `get_block`, `as_entity`…) are registered under
   `minecraft:`, so they must be written **bare**. Those provided by the mod (`test`) and by the
   source itself (`get_killed_living_entity`, `get_mined_block_state`, `get_crafted_item_stack`,
   `get_player`) live under `puffish_skills:`, so they must be **prefixed**.
3. **`fallback` is always a number.** An operation chain ending on a boolean is converted to
   `1.0` / `0.0`. Writing `"fallback": false` fails; use `0`. A condition is true as soon as the
   expression evaluates to anything other than `0`.
4. **`enabled` no longer exists** in `experience.json`: the file being present is enough.
5. **Poké Balls are not separate items.** In Pixelmon 9.x there is a single item,
   `pixelmon:poke_ball`, and the variant is carried by the `pixelmon:poke_ball` data component:

   ```json
   { "type": "item", "data": { "item": "pixelmon:poke_ball",
     "components": { "pixelmon:poke_ball": "master_ball" } } }
   ```

   `generate.mjs` does the conversion by itself: writing `ic: 'pixelmon:master_ball'` is enough.
   Beware: Pixelmon's language file contains `item.pixelmon.great_ball` and friends even though
   those items do not exist — **so it must not be used to validate item ids**. Real items have a
   model under `assets/pixelmon/models/item/`, but so do the ball variants: only the game log
   settles it for sure.

## Regenerating / editing

All the content lives in `generate.mjs`. Node 18+ required.

```bash
cd "<instance>"
node tools/pixelgo-skilltree/generate.mjs "config/puffish_skills/categories/pixelgo"
```

The script prints the node count, the total cost and the smallest distance between two nodes
(a guard against overlap: do not go below ~28).

To add a skill, edit the `slots` object of the relevant branch. To change the geometry, touch
`SLOT_RADIUS` / `SLOT_ANGLE`, and `EDGES` / `EXCLUSIVE` for the links.

## In game

- The **Open Skill Tree** key (bind it in Options → Controls) or `/skills`.
- `/skills category open pixelgo`
- `/skills points add pixelgo <n>` — grant points
- `/skills skills reset pixelgo` — reset spent skills
- `/skills level set pixelgo <n>` — force a level

After editing the files, a `/reload` picks up the config; when in doubt, restart the world.
Configuration errors are written to `logs/latest.log` (`show_warnings: true`).
