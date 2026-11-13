# Quest book

Three passes over `config/ftbquests/quests/`, all idempotent. Run them in this order.

```bash
cd "<instance>"
node tools/pixelgo-quests/generate.mjs --dry   # new quests, new chapters, rewritten cards
node tools/pixelgo-quests/generate.mjs

node tools/pixelgo-quests/style.mjs --dry --show 20   # the styling pass
node tools/pixelgo-quests/style.mjs

node tools/pixelgo-quests/norecipes.mjs --dry   # takes recipes out of the text
node tools/pixelgo-quests/norecipes.mjs

node tools/pixelgo-quests/coins.mjs --dry   # PokeDollars rewards -> Nickel/Dime/Poke Coin items
node tools/pixelgo-quests/coins.mjs

node tools/pixelgo-quests/rewards.mjs --dry  # item rewards on quests that already exist (EXTRA_REWARDS)
node tools/pixelgo-quests/rewards.mjs

node tools/pixelgo-quests/projecte.mjs   # texts of the hand-made ProjectE chapter
node tools/pixelgo-quests/creative.mjs   # the whole Creative Items chapter (other.snbt): layout + texts
node tools/pixelgo-quests/refined.mjs    # the whole Refined Storage chapter (ae2.snbt): layout, rewards + texts
```

`refined.mjs` (2026-11-09) owns `chapters/ae2.snbt` the same way, rewards included (coins well under the
price-guide cost of each craft, Mystery Bags at milestones, EMC Link of Refined Equivalence at the bottom).

`creative.mjs` (2026-11-08) owns `chapters/other.snbt`: edit its `ROWS` (position, shape, deps,
texts), never the snbt. Existing quests are found by task item and keep their ids and rewards;
`was:` swaps the task item of an existing quest. Every item there must have a working recipe.

```bash
```

Quest money is paid in sellable coins (Poke Coin 120 $, Dime 40 $, Nickel 20 $), never in
`pixelgoquests:pokedollars`. `generate.mjs` already writes `money:` rewards as coins; `coins.mjs`
converts anything added by hand in-game. Backup of the switch: `backups/quest-coins-2026-10-25/`.

The 2026-10-14 backup of `quests/`, the KubeJS lang files and these tools is in
`backups/taches-2026-10-14/`.

A backup of the whole `quests/` folder and of the KubeJS lang file sits in the session
scratchpad under `quests_backup`.

## Where the text lives

The book reads from **two** files, which is easy to miss:

| File | What is in it |
|---|---|
| `config/ftbquests/quests/lang/en_us.snbt` | descriptions written inline, plus every title and subtitle |
| `kubejs/assets/kubejs/lang/en_us.json` | descriptions the snbt only *references*, as `{quest.<chapter>.description.N}` |

252 of the 585 descriptions are references into the second file. A pass that only edits the
snbt touches less than half the book.

`zh_cn.json` is left alone — it is a separate locale, not a copy.

## Pass 1 — `generate.mjs`

Content lives in `content.mjs`; the generator only knows how to apply it.

**Ten new quests:**

| Chapter | Quest | Why there |
|---|---|---|
| Welcome | The PokeNav | what it does, what it costs |
| Welcome | The Upgrade Orb | the full odds table, and the warning |
| Welcome | The Trainer's Path | press **K** |
| Welcome | The Crates | HelsCrates: four blocks, four keys, and where the keys come from |
| Welcome | The Dimension Timer | PixelGO Dimension: one shared 20-minute clock over four dimensions |
| The beginning | PokeNav | the recipe, behind the iron mesh |
| The beginning | Upgrade Orb | the recipe, and where ruby actually comes from |
| PixelGO Gates | Rank SS | |
| PixelGO Gates | Rank SSS | |
| PixelGO Gates | Rank DEMON | the end of the pack |

**Eight cards rewritten**, because they had gone out of date:

- *Gates* (Welcome) — said six ranks; said Gates open 32-96 blocks away, which is the
  non-skyblock setting. This map runs `[gates.skyblock] enabled = true`, so they open
  **3 to 20** blocks away and float.
- *Your Trainer* — said `K` opens the ProjectE tablet. It opens the skill tree; both are
  bound to `K` in `options.txt`.
- *What is a Gate?*, *When Do They Appear?*, *Inside the Dungeon*, *Ambushes*, *The Boss*,
  *Gate Beacons* — all written for six ranks, and *Gate Beacons* still said "no loot table
  drops them", which stopped being true when the beacons were added to the loot ladder.

**Six single-line fixes** to the rank E-S cards, whose "Weight N of 96" lines are now
"of 10000" (see below).

Every id in `content.mjs` is fixed, not generated, so a second run finds its own quests and
skips them. The generator refuses to write anything if an id collides with one already in the
book, if a dependency points at a quest that is not in that chapter, or if a line fix does not
match.

### The rank weights were broken, twice over

**First problem.** `config/pixelgo_dungeon-common.toml` had E-S scaled down by 100
(40/26/16/9/4/1) but SS/SSS/DEMON left at the mod's stock 30/10/1. Out of a total of 137 that
made a **SS Gate — level 100, five elite guards — as common as a D Gate**, and thirty times
more common than an S.

**Second problem.** The mod's own defaults fix that but put DEMON at **one Gate in 9641**.
A Demon Gate is the end of the pack; at that rate it is not an objective, it is a lottery
nobody finishes.

So the ladder is rebuilt around the other end. DEMON is pinned at **one in 200** and each
endgame rank is **twice as rare as the one below it**:

| Rank | Weight | Share | One in |
|---|---|---|---|
| E | 3600 | 36% | 2.8 |
| D | 2600 | 26% | 3.8 |
| C | 1700 | 17% | 5.9 |
| B | 950 | 9.5% | 10.5 |
| A | 500 | 5% | 20 |
| S | 300 | 3% | 33 |
| SS | 200 | 2% | 50 |
| SSS | 100 | 1% | 100 |
| DEMON | 50 | 0.5% | **200** |

Total is 10000 on purpose: a weight is its percentage times a hundred, which is what the
*When Do They Appear?* card now says.

**The cost of pinning DEMON at 1/200.** Only three rungs sit between S and DEMON, so S has to
come down from one in 96 to one in 33 to leave room — there is no arrangement where DEMON is
1/200, S is 1/96 and the four endgame ranks stay meaningfully apart. E gives up the difference
(41% → 36%), and B and A gain a little. Every rank is still strictly rarer than the one below
it; the generator refuses to write the config otherwise.

What that means in play: Gates cycle two at a time and an unused one expires after a Minecraft
day, so roughly six Gates an hour even for a player who is not chasing them. At one in 200,
a Demon Gate is on the order of **thirty hours of play** — long, but walkable.

### Where the rank numbers came from

`GateRank.class` is an enum whose constants carry every figure the cards quote. Read out of
the bytecode rather than guessed:

| Rank | Level | BST cap | Mons | Rooms | Elites | Boss | Gate height |
|---|---|---|---|---|---|---|---|
| E | 5-15 | 400 | 5 | 1-2 | 0 | common | 3.0 |
| D | 15-30 | 450 | 8 | 2-3 | 1 | rare | 3.5 |
| C | 30-45 | 500 | 10 | 2-4 | 2 | rare | 4.1 |
| B | 45-60 | 540 | 12 | 3-5 | 2 | epic | 4.8 |
| A | 60-80 | 600 | 14 | 3-6 | 3 | legendary | 5.6 |
| S | 80-100 | none | 16 | 4-7 | 4 | ultimate | 6.6 |
| SS | 100 | none | 20 | 5-8 | 5 | ultimate | 7.7 |
| SSS | 100 | none | 24 | 5-9 | 6 | ultimate | 9.0 |
| DEMON | 100 | none | 28 | 6-10 | 7 | ultimate | 10.0 |

A Demon Gate does not draw from the ordinary pool at all: `DemonRoster` loads
`data/pixelgo_dungeon/demon_gate/roster.json`, **112 Legendaries, Mythicals, Ultra Beasts and
Paradox Pokemon**, each with a fixed nature and EV spread (`PokemonBlueprint` carries nature
and EVs — no IVs, so the cards do not claim any).

The DEMON quest is the only one in the book using `loot_tier: 3b`. That is
`PokelootReward.LootTier.FOUR`; the enum has four values and the book had only ever used
three. Since 2026-10-14 the *Pokédoll Master* quest uses it too.

## Pass 2 — `style.mjs`

The Welcome chapter set the house style: grey body, the thing being talked about picked out in
colour, numbers in bold white, anything that can cost you in red. 228 descriptions had it.
**364 were plain sentences with no markup at all**, most of them in the KubeJS file.

This pass puts all of them in the same palette. **It does not rewrite anyone's wording** —
strip the colour codes back out and the text is byte-identical. The run asserts exactly that
on every line it changes, and writes nothing if a single one drifts.

| Ink | For |
|---|---|
| `&7` | body |
| `&a&l` | a block, an item, a machine |
| `&d&l` | a Pokemon |
| `&f&l` | a number |
| `&c&l` | a sentence opening with Warning / Do not / Never / Be careful |
| `&7&l- ` | a line that started with `-` or `•` |
| curated | mod names keep a colour of their own (`&b&l` Refined Storage, `&6&l` Ex Deorum, …) |

Two rules do the real work:

1. **Pokemon names** come from `tools/pixelgo-drops/catalog-species.json` — 1028 exact,
   case-sensitive names, so nothing is guessed.
2. **Names of things** are runs of **two or more** capitalised words ("Quantum Compressor",
   "Pattern Grid", "Ancient City"). One capitalised word is never taken — far too many false
   positives. A capitalised sentence opener is stripped off the front first, which is what the
   stop list is for: *The Crafter* is not a thing, *Crafter* is. `and` is deliberately not a
   connector, because "End City and Bastion" is two things, not one.

Result: **565 of 565** descriptions now carry the house palette, 0 plain.

A string that already contains a `&` code is skipped, so the hand-written chapters are never
touched and a second run does nothing.

### What it does not do

It colours; it does not restructure. A one-sentence description like *"Quilava evolves at level
36"* comes out coloured but still one sentence — it cannot grow the CAPS section headers and
bullet blocks the Welcome cards have, because there is nothing to put in them. Chapters that
would benefit from being *written* rather than styled have to be done by hand, the way
`content.mjs` does it.

## 2026-10-14 — new chapters, apricorns, infinite steak, Pokédolls

`generate.mjs` can now **create a chapter**: list it in `CHAPTERS` (content.mjs) with its id,
group, `order_index`, icon and a plain title. The file is created empty in the key order FTB
Quests writes itself, and the title is written to the lang file **only on that first run** —
then `node tools/quest-gradient.js` gives it the gradient of its group. (Careful:
`quest-gradient.js` rewrites every chapter title and its `BOLD` list still bolds Ender IO,
Gates, Poké Balls and The Ball Line, which are no longer bold in the book. On 2026-10-14 only
the new Pokédolls title was kept from its output.)

Quests also take `size` and `hideDependencyLines` now.

| Chapter | What was added |
|---|---|
| Poké Balls | a row at y = -5: one quest per apricorn (7 × 250 $) and the *Apricorn Collector* on the left (1 500 $ + Pokéloot tier 1) |
| PixelGO Minions | *Infinite Steak* (1 000 $), under the enchanted iron quest — recipe in `kubejs/server_scripts/pixelgo/22_crafts.js` |
| **Pokédolls** (new, PIXELMON group) | an intro card, one quest per Pokédoll (82), a collection quest per rarity and *Pokédoll Master* |

### Pokédolls

`pokedolls.json` is the list of the 82 base dolls, read out of `pokeblocks-neoforge-1.5.0`:
`ModItems` registers every doll with a `DollRarity`, and `DollRarity` carries the loot weight
(common 500, uncommon 300, rare 150, epic 70, legendary 30, shiny 5, gigantic 0). Shiny and
gigantic dolls are left out. Doll quest ids are a hash of the item id, so the list can be
reordered or extended without moving a quest. After a Pokeblocks update, rebuild the list with
`javap -c -p -constants dev/mrshawn/pokeblocks/item/ModItems.class` and the jar's lang file.

| Rarity | Dolls | Per doll | Collection |
|---|---|---|---|
| Common | 17 | 150 $ | 1 500 $ + Pokéloot tier 1 |
| Uncommon | 17 | 300 $ | 3 000 $ + tier 1 |
| Rare | 20 | 600 $ | 6 000 $ + tier 2 |
| Epic | 14 | 1 200 $ | 12 000 $ + tier 2 |
| Legendary | 14 | 2 500 $ | 25 000 $ + tier 3 |
| *Master* | 82 | | 25 000 $ + tier 4 |

Where they drop: Pokeblocks' own loot modifier adds a doll to **3 chests in 10** among ~40 vanilla
chest tables (villages, dungeons, mineshafts, strongholds, temples, mansions, outposts, bastions,
ancient cities, trial chambers), weighted by rarity; the pack's `pixelgo:special/cosmetics` table
adds 21 of them to its structure ladder. Out of a chest a given Legendary doll is about one doll
in 630; the Mystery Bags carry them too (`tools/pixelgo-loot/bags.mjs`), and a Mystery Legendary Bag
holds a Legendary doll one time in four.

## 2026-10-17 — Pokémon Challenges

A new chapter in the PIXELMON group (`challenges.snbt`, after Pokédolls) built on the
**PixelGO Quests** task types. Four rows, in order of difficulty, each closed by a PixelGO Items
trophy; the four trophies give the **Soul Sand Trophy**. These quests are the only source of the
five trophies (`tools/pixelgo-loot/bags.mjs` keeps them out of the bags).

| Row | Challenges | Each | Trophy |
|---|---|---|---|
| Red | 50 catches; 25 Bug, Grass, Water; 100 wild defeated; 10 trainers; 10 evolutions | 500 $ | 2 500 $ + Pokéloot tier 1 |
| Blue | 100 Normal; 50 Fire, Electric, Flying; 300 wild defeated; 50 trainers; 10 eggs hatched; 100 levels in battle | 1 500 $ | 7 500 $ + tier 2 |
| Yellow | 50 Poison, Ground, Rock, Fighting, Psychic; 150 trainers; 50 evolutions; 5 shinies | 4 000 $ | 20 000 $ + tier 3 |
| Purple | 50 Ghost, Steel, Dark, Fairy, Ice; 25 Dragon; 5 Legendaries; 300 trainers; 25 bosses; 15 shinies | 10 000 $ | 50 000 $ + tier 3 |
| *Soul Sand* | the four trophy quests | | 100 000 $ + tier 4 |

No challenge names a species. A row's quests depend on the previous trophy, so a row only counts
once it is open (FTB Quests does not progress a locked quest).

How each task counts, read out of `TaskListener` / the task classes of `pixelgoquests-1.0.0`:

| Task | Field | Meaning |
|---|---|---|
| `catch_pokemon` | `catchType: 4b` | CATCH_OR_RAID — eggs, trades and commands do not count |
| `defeat_pokemon` | `wild: true` | every wild Pokémon knocked out (fatal `AttackEvent.Damage`); the boss challenge leaves `wild` unset and uses the spec `isboss` |
| `defeat_trainer` | `customName: ""` | any NPC battle the player **wins**; raids, simulated and PvP battles are skipped |
| `level_pokemon` | `cause: 1b` | BATTLE — candies do not count |
| `evolve_pokemon` / `hatch_egg` | | any cause, any Pokémon |

`wipeout` counts the player's own defeats, so it is not used. Pixelmon spec keys used:
`type:<type>` (primary or secondary type), `shiny`, `legendary`, `isboss`.

`generate.mjs` now writes **any task type**: give the task a `data` object and every field is
written, keys sorted like FTB Quests (`{ snbt: '4b' }` for a typed value). Rewards can be an
**item** (`{ id, item, count }`). One-line descriptions are written inline (`["…"]`), the way
FTB Quests saves them, and `norecipes.mjs` reads that form too — otherwise every in-game save of
the book showed up as false differences.

## Pass 3 — `norecipes.mjs`

The book used to spell recipes out ("How to craft it", "The recipe", bench patterns, ingredient
lists, output counts, alloy subtitles like *Iron Ingot + Ender Pearl*). The player has JEI, and a
recipe written in a quest goes stale the day the recipe changes. This pass removes them and keeps
the rest: what the item does, where a resource comes from, which machine does the job, balance
notes, tips.

- **Generic**: a section whose header matches `HEADER` is removed with everything under it up
  to the next blank line — 50 sections.
- **By hand** (`EDITS`): 43 edits on 23 cards where the recipe sat inside other text, or where a
  sentence had to change so the card still reads (*The Ball Line* keeps its two routes, bench and
  Combiner, without the counts).
- **Subtitles** (`SUBTITLES`): 12 subtitles that were a recipe.
- **KubeJS lang**: two minion descriptions.

In-world mechanics are **not** recipes and stay: Ex Deorum barrels and crucibles, fire crafting,
the sieve, the hammer chain. The cards that `generate.mjs` owns (PokeNav, Upgrade Orb, Gate
Beacons, Crates) are kept recipe-free in `content.mjs` itself.

The pass refuses to write if a recipe header is still left, if an edit matches nothing, or if a
description would end up empty.

## Editing

- **New quest or rewritten card** → `content.mjs`, then re-run `generate.mjs`.
- **A recipe crept back into a card** → add its header to `HEADER` or an entry to `EDITS` in
  `norecipes.mjs`, and re-run it.
- **A word is coloured wrongly** → the `STOP` list or `NOUNS` in `style.mjs`. To re-style
  something already styled, restore that lang file from the backup and run both passes again,
  in order.
- **A rank's numbers changed after a mod update** → re-read `GateRank.class` with `javap -c`;
  the cards quote it directly.

## 2026-10-24 — Minion Workshop

> **Removed on 2026-11-01.** All 748 Workshop quests (intro, six category headers, one quest per
> tier) were taken out of `minions.snbt` with their lang keys, and the block is gone from
> `content.mjs`. `pixelgo_minions` 4.0.0 crafts tier I at the bench again (`minion_upgrade` is no
> longer removed, its JEI displays no longer hidden) and upgrades later tiers inside the minion.
> The cobblestone minion card has its old JEI tip back. Backup: `backups/minion-recipes-2026-11-01/`.
> The rest of this section is history.

Minions are no longer crafted: `pixelgo_minions:minion_upgrade` is removed in
`kubejs/server_scripts/pixelgo/00_removals.js`, and the mod's hard-coded JEI displays
(`pixelgo_minions:jei/minion/<minion>_<tier>`) are hidden in
`kubejs/client_scripts/pixelgo/hide_entries.js`. Every tier is earned in the **PixelGO Minions**
chapter instead, under the old content (y ≥ 17): an intro card, one header per category on the
left, then one row per minion with one quest per tier.

Each tier quest is repeatable, optional, toast-free and **consumes** what the bench recipe took
around its centre — 8 × `CraftingCosts.TIER_PER_SLOT` (10/20/40/64 raw, then 1/3/8/16/32/64
enchanted), except tiers XI and XII, raised to 1 024 and 2 048 enchanted on the user's request
(the mod stays at 512). Existing quests are not rewritten by `generate.mjs`: after changing an
amount in `content.mjs`, run `node tools/pixelgo-quests/sync-counts.mjs` to carry it into the book. The centre item (wooden tool, or the minion of the tier below) is not asked for; a tier
opens once the previous one has been claimed. Sunflower and lily pad have no enchanted form, so
from tier V they ask for 160 raw items per enchanted one.

`minions.json` (63 minions: category, raw and enchanted resource, max tier) is read out of
`pixelgo_minions-3.0.0` (`MinionTypes.ALL` + `CraftingCosts`, through a small Java 21 program with the
1.21.1 `client-*-official.jar` and the libraries of `versions/1.21.1/1.21.1.json` on the classpath —
do not load `MinionUpgradeRecipe`, it bootstraps the registries). Rebuild it after a mod update.

`generate.mjs` gained `canRepeat`, `disableToast`, `optional` on quests and `count` / `consume` on
item tasks; x/y are now written at full precision (the grid sits on quarter steps).

Same day, cards corrected against the pack: Mithril (comes from its minion or the Minion Gear shop),
Stat Tweaking (+1 IV per use; Training shop and structure chests, not Pokémon drops), Shiny Swapper
(500 000 $, chests, Legendary bags, craftable — not shiny drops), Shiny Ball (350 000 $), Mystery
Bag / Mystery Legendary Bag (were "Box"; vanilla structure loot is no longer in the bag), and
"Mystery Boxes" → "Mystery Bags" everywhere. Backup: `backups/minion-quests-2026-10-24/`.

## 2026-10-24 — Mega Evolution (Pixelmon 9.4.2)

The chapter now has one quest per Mega Stone of Pixelmon 9.4.2 — **58**, read out of
`ItemRegistration.MEGA_STONES` (Mega Rayquaza needs none). Eleven were missing: the five 9.4.2
stones (Clefablite, Chimechite, Eelektrossite, Drampanite, Zeraorite) and six of 9.4.0 (Raichunite
X/Y, Starminite, Dragoninite, Darkranite, Chandelurite). They sit on a new row at y = 3 with the
usual rewards; `generate.mjs` gained a `bag` reward (`{ id, bag: 'pixelgo:tier3' }`). The Mega Key
card now says what the key does (`kubejs/server_scripts/custom_item/mega_key.js`, 59 forms; the
`ultimate` boss tier drops the boss's stone and forces the shiny palette — so Chimecho's Festival
palette cannot come from the key). The stray "Summon a Mega Boss" text on the Pidgeotite quest is gone.

## 2026-11-08 — PixelGO Items

Every `pixelgoitems:*` item was taken out of every loot table on request (bags, structure
chests, Pokémon drops, Poké Chests, raids, the FTB `ticket` / `supra_reward` tables — see
`tools/pixelgo-loot/README.md`). The book is now where they are handed out, two ways, both
in `content.mjs`:

**1. A chapter**, `pixelgo_items.snbt` (PIXELMON group, `order_index` 13, after the
Challenges). An intro card, then one *get it* quest per item (item task, not consumed), in five
rows: trainer tools (9), EV training (6 + Random EV), IV training (6 + Random IV), gimmicks
(Random Level, Random Size, Skin Swapper, Shiny Swapper, Random Fossil) and the two outfits.
36 quests, paid in coins (100 $ for an outfit piece up to 10 000 $ for the Shiny Swapper). The
trophies stay in the Challenges. Each card says what the item does and which bench or machine
makes it — never the recipe. Its title was gradiented with `quest-gradient.js`, keeping only
that line of its output.

**2. Rewards on existing quests** — `EXTRA_REWARDS`, applied by the new pass
`rewards.mjs` (`generate.mjs` never rewrites a quest that exists). 110 item rewards on
100 quests:

| Quests | PixelGO Items added |
|---|---|
| 84 Battle Tower badges, by floor | F1 +EV ×2, F2 +EV ×3, F3 Random EV, F4 +IV, F5 +IV ×2, F6 +IV ×3, F7 Random IV — the stat turns round the six inside each spire |
| Cascade Badge (Misty) / Pokémon Master | Orange Hair outfit / World Champion outfit |
| Pokédex 20 / 40 / 60 / 80 / 100 % | Healer / Laptop / Random IV + Random Size / Upgraded Healer + Skin Swapper / Shiny Swapper |
| Challenge trophies red / blue / yellow / purple / Soul Sand | Random Level ×2 / Random Size ×2 / Skin Swapper / Max + Tera Raid Summoner / Shiny Swapper |
| Pokédoll Master, Fossil Machine, Day Care, Item of Evolution intro | Old Chisel + Skin Swapper, Random Fossil ×2, Enchanted Egg, Trading Simulator |

Reward ids are a hash of quest + item, so a second run adds nothing. The pass checks every item
id against the mod jar and refuses to write if a chapter or quest is missing.

Cards corrected the same day: *Stat Tweaking* and *Shiny Swapper* (PixelGO Minions) sent players
to shops, chests and bags; the *PokeDollars* card said PixelGO Items have no recipe (a
`LINE_FIX` in `generate.mjs`).

`coins.mjs` now keeps the first hex digit of its ids in 0-7, like `content.mjs`: no id from
8 up survives in the book — FTB Quests replaced them on load. Backup:
`backups/pgi-loot-quests-2026-11-08/`.
