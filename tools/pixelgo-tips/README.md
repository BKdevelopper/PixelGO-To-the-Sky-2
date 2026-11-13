# Tips

44 loading-screen tips for this pack, written from the Welcome chapter of the quest book and
the numbers the other tools settled.

```bash
cd "<instance>"
node tools/pixelgo-tips/generate.mjs --dry
node tools/pixelgo-tips/generate.mjs
```

Output: `kubejs/assets/pixelgo/tips/<id>.json`, one file per tip.

## Where tips live, and why there

Tips are **client resources, not server data**. `TipManager` is a
`SimpleJsonResourceReloadListener` on the directory `tips`, hooked into the *resource* reload
(`MixinTextureManager`). So they belong under `assets/`, and `kubejs/assets/` is served as a
resource pack — the same place the pack already keeps its lang files.

`config/tipsmod.json` is only the mod's settings (cycle time, render width, default title). No
tip text lives in it.

## The schema

Read out of `SimpleTip.CODEC` in `tipsmod-neoforge-1.21.1-21.1.3.jar`:

| Field | Type | Required |
|---|---|---|
| `type` | `tipsmod:simple` | yes |
| `text` | Component | **yes** |
| `title` | Component | no — falls back to `config.default_title` |
| `cycle_time` | int, milliseconds | no — falls back to `config.default_cycle_time` (5000) |
| `conditions` | object | no |

`title` and `text` are real `net.minecraft.network.chat.Component`s, rendered with `Font.split`
+ `drawString`. That means the full text-component JSON works — `color`, `bold`, nested
`extra` — and long text wraps itself to the configured width (35% of the screen).

The mod's own tips use `{"translate": "tip.tipsmod.<id>.text"}` and a lang file. These use
inline components instead, so the colour lives with the sentence rather than in a second file.

## Namespace

`pixelgo`, not `tipsmod`. That way you can silence the 81 vanilla tips without touching these,
by adding `"tipsmod"` to `ignored_namespaces` in `config/tipsmod.json`:

```json
"ignored_namespaces": { "value": ["tipsmod"] }
```

Leave it empty and both sets cycle together.

## Palette

The same one the Welcome chapter uses, so a tip reads like a line out of the book:

| Ink | For | Helper |
|---|---|---|
| grey (inherited from the root) | body text | `G()` |
| green bold | a block, an item, a machine | `O()` |
| light purple bold | a Pokemon | `P()` |
| white bold | a number or a key | `N()` / `K()` |
| red bold | anything that can cost you | `W()` |
| aqua bold | a command or a system | `A()` |
| gold bold | money, or a payoff | `Y()` |

The root component carries `color: gray`, so any piece without a colour of its own inherits it.

Titles are per theme and change colour with the subject: Skyblock (green), Sieve & Hammer
(gold), PokeDollars (gold), Controls (white), PixelGO Gates (light purple), Dimension Timer
(dark purple), Crates (aqua), Pokemon (light purple), Careful (red).

## What the 44 cover

| Theme | Tips |
|---|---|
| Controls | 8 |
| PixelGO Gates | 8 |
| Sieve & Hammer | 5 |
| Dimension Timer | 5 |
| Pokemon systems | 5 |
| Crates | 4 |
| Skyblock basics | 4 |
| PokeDollars | 3 |
| Careful (the two that bite) | 2 |

Average 121 characters, total cycle about 6 minutes.

## Checks the generator runs

Nothing is written if any of these fail:

- ids are `[a-z0-9_]+` and unique;
- every tip has text, and no piece of it is empty;
- every colour is one of the 16 legal names;
- **no tip scrolls faster than 26 characters per second.** A tip nobody can finish reading is
  worse than no tip, so `cycle_time` is set per tip rather than left at the 5 s default.

Only files the generator itself produced are removed on a re-run, so a tip you drop into that
folder by hand survives.

## Editing

- **New tip** → add a row to `TIPS` in `generate.mjs` and re-run.
- **Too fast to read** → raise its seconds column; the check will tell you if it is still short.
- **Wrong colour** → the helpers at the top, not the individual tips.

Every claim in these tips was checked against the pack rather than remembered: keybinds against
`options.txt`, Gate numbers against `GateRank.class` and `pixelgo_dungeon-common.toml`, the
dimension timer against `pixelgo_dimension-common.toml`, crate behaviour against
`helscrates-1.0.5c.jar`, and the sieve mesh floor against `30_tech.js`.
