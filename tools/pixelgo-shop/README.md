# Pokeblocks coins as sellable treasure

Makes `pokeblocks:nickel`, `pokeblocks:dime` and `pokeblocks:poke_coin` sellable
for PokéDollars.

```bash
cd "<instance>"
node tools/pixelgo-shop/generate.mjs --dry
node tools/pixelgo-shop/generate.mjs
```

Idempotent: a second run reports "already up to date" and writes nothing.

## Where they went, and why there

`shopkeeper/utility/water/maniac_relic.json` — the Relic Maniac, the Pixelmon
shopkeeper that already exists to buy treasure off players. Its whole stock is
sell-only, which is exactly what the coins are: loot with no other use.

The coins are pure treasure in this pack — nothing crafts with them, and the
only places they appear are the loot tables and the drop tables. So they are
added the way the relics are: **`buyPrice: 0`**, sell-only. Letting players buy
them back would turn PokéDollars into loot-table currency.

## One edit, three places it shows up

Adding the coins to *any* shopkeeper preset makes them sellable in three ways at
once, because two other mods read the same data:

| Where | How it finds them |
|---|---|
| The Relic Maniac himself | The preset he uses |
| **Portable Shop** (`pixelgo_shop`) | Lists every shopkeeper preset. `config/pixelgo_shop-common.toml` is in `BLACKLIST` mode with an empty filter, so every shop is available — including this one, as `pixelmon:shopkeeper/utility/water/maniac_relic` |
| **Sell button / `/pixelsell` / `/pixelvalue`** (`pixelgosell`) | `ShopPriceIndex` scans the whole `pixelmon/npc/preset` directory and indexes anything carrying `item` + `sellPrice`, no matter which preset it sits in |

That third one matters on a skyblock, where the player may never meet a water
NPC: the coins are sellable from the inventory button regardless.

## Prices

They sit on the ladder this shop already uses, so they read naturally beside the
relics. A Poké Ball costs 1000 to buy, which is the scale to judge them against.

| | Sell |
|---|---|
| `relic_copper`, `pearl` | 20 |
| `big_pearl` | 80 |
| `nugget`, `relic_silver` | 100 |
| **`pokeblocks:nickel`** | **100** |
| `pearl_string` | 200 |
| **`pokeblocks:dime`** | **200** |
| `big_nugget` | 400 |
| `relic_gold` | 600 |
| **`pokeblocks:poke_coin`** | **600** |
| `relic_vase` | 1000 |
| `relic_band` | 2000 |
| `relic_statue` | 4000 |
| `relic_crown` | 6000 |

nickel : dime = 1 : 2, the ratio the real coins are named for, and `poke_coin`
takes the flagship rung at 600.

Cross-checked against the faucets in the other tools: the weakest boss
(`equal`) pays 8 nickel = 800, a level 31-50 trainer pays 5 poke_coin = 3000,
and a Meowth gives about 100 per kill.

## The schema

```json
{ "item": { "id": "pokeblocks:poke_coin", "count": 1 }, "buyPrice": 0, "sellPrice": 600 }
```

`ShopItem.CODEC` declares all three fields with `fieldOf`, **not**
`optionalFieldOf` — so `buyPrice` cannot be left out. `isPurchasable()` is just
`buyPrice > 0`, which is what makes `0` mean sell-only.

Shop items live inside `{"type": "pixelmon:open_shop", "items": [...]}` nodes.
This preset has one; others carry one per NPC variant (the berry shop has five
identical copies), so the script walks them all.
