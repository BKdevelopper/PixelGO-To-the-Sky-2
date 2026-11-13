# Équilibrage de l'économie

Applique les corrections économiques qui vivent dans des fichiers de données, et recalcule
les gains par heure. La référence complète (prix, sources d'argent, justifications) est
`docs/ECONOMIE.md`.

```bash
cd "<instance>"
node tools/pixelgo-economy/deco.mjs          # prix de la déco au coût du craft -> deco.json (si un mod déco change)
node tools/pixelgo-economy/apply.mjs --dry   # rapport seul, n'écrit rien
node tools/pixelgo-economy/apply.mjs         # écrit
node tools/pixelgo-economy/shops.mjs         # range les marchands par catégorie (toujours APRÈS apply.mjs)
node tools/pixelgo-economy/rates.mjs         # tableau des gains par heure avant / après
```

**Idempotent** : une seconde exécution annonce « 0 fichier modifié ». Un fichier dont seul
le formatage changerait (`150.0` contre `150`) n'est pas réécrit, et la fin de ligne
d'origine (CRLF / LF) est conservée.

## Ce que fait `apply.mjs`

| § | Cible | Effet |
|---|---|---|
| 1 | presets de boutique (`kubejs/data/**/npc/preset`) | prix de revente : sous-produits de générateur à 0-2 $, baies 150 -> 40 $, sucre, teinture verte, champignons |
| 2 | `pixelgo_shop.json` | échelle EXP Ball réparée, sacs 1 à 4 remis dans l'ordre, PixelGO Items au prorata, Shiny Ball 750 000 $ |
| 3 | `pixelgo_shop.json`, `pixelgo/exp_dealer.json`, `pixelgo/minecraft_blocks_1_2.json` | + Master Ball, + 43 objets d’évolution, + 56 objets tenus / vitamines / capsules, + 35 objets utilitaires et livres enchantés |
| 4 | `12_minions/minion_buyer.json` et tous les presets | tous les produits de minion se revendent, brut et enchanté, au barème RAW (item enchanté = ses unités brutes) ; livres enchantés retirés partout (crash de ShopOpenPacket) |
| 4 bis | `config/guinimospixelmon/shoplist.json` | distributeur : 208 articles de construction à 1-2 $, rachat 0-1 $ |
| 5 | `config/guinimospixelmon/rarity.json` | Poke Hunter : 27 espèces communes sorties des difficultés 4-5 |
| 6 | `kubejs/data/botanypots/.../crop/*.json` | 11 cultures revendables : pousse x2 plus lente, 1 culture par récolte |
| 7 | `kubejs/data/mysticalagriculture/.../essence/minecraft/*.json` | 1 essence de nature ≈ 1 culture |
| 8 | `config/ProjectE/custom_emc.json` | EMC 0 pour les 358 objets revendables |
| 9 | `kubejs/data/pixelmon/pixelmon/npc/preset/battle/trainer/wild/*.json` | gain de victoire des dresseurs sauvages plafonné à 200 $ (32 presets sur 40 ; Gentleman et Rich Boy donnaient 800 $). Copiés du jar Pixelmon : relancer après une mise à jour de Pixelmon |

Les règles sont en tête de chaque section du script, avec leur justification.

## Ce que fait `shops.mjs`

Rassemble tous les articles des marchands du pack, les range dans 23 marchands / 13 catégories
(règles `BY_ID` + `classify`), régénère chaque preset au même gabarit et écrit les noms
« Catégorie · Marchand » en anglais et en français (`kubejs/assets/kubejs/lang/`). Un article
qu'aucune règle ne place fait échouer l'outil. Il ne touche à aucun prix.

`apply.mjs` ajoute un article manquant dans le Bazar (`01_island/general_store`) ;
`shops.mjs` le range ensuite dans son rayon. Toujours lancer les deux, dans cet ordre.

**Nouvel article** : l'ajouter à `ADD` (apply.mjs) avec son prix, puis, si son identifiant
n'est couvert par aucune règle, l'ajouter à `BY_ID` (shops.mjs).

## Ce que fait `deco.mjs`

Lit les recettes et les tags de Minecraft, NeoForge, Handcrafted, Another Furniture, Factory
Blocks et Pixelmon, calcule le coût de craft de chaque objet décoratif au prix d'achat des
marchands, et écrit `deco.json` (7 rayons, 1 073 objets). `apply.mjs` en tire les prix et
les ajouts, `shops.mjs` le rangement dans la catégorie 14 « Décoration ». Un objet ajouté à
une liste du script sans recette connue est signalé « SANS PRIX » : lui donner un équivalent
dans `SAME_AS`.

## Ce qui est modifié à la main (pas par ce script)

- `config/pixelmon/battle.yml` — Pay Day 5 -> 0,05 ; G-Max Gold Rush 100 -> 0,2
- `config/pixelgo_minions-common.toml` — `speedMultiplier` 0,3 -> 0,75 ; `maxHours` 72 -> 24
- `config/PowerPots.json` — vitesse / rendement 2/1, 3/1,5, 4/2 (au lieu de 2/1, 4/2, 8/4)
- `kubejs/server_scripts/pixelgo/15_farm_gate.js` §6 — cultures du tamis réduites à l'amorçage
- `kubejs/server_scripts/pixelgo/55_ticket_horaire.js` — 1 ticket par heure ACTIVE
- `kubejs/assets/kubejs/lang/en_us.json` — textes Shiny Ball / Shiny Swapper

## Ajouter ou changer un prix

- **revente** : table `SELL` (tous les presets) ou `ENCH_SELL` (items enchantés) ;
- **achat** : table `BUY` (boutique PixelGO, clé `id` ou `id|{composants}`) ;
- **nouvel article** : table `ADD`, par fichier de preset ;
- **distributeur** : tableau `RECYCLER`. Le mod rachète à `floor(prix / 2)` : un prix de 1
  signifie « vendu, jamais racheté ».

Relancer ensuite `apply.mjs`, puis vérifier qu'aucun objet n'a un prix de revente supérieur
à son prix d'achat le plus bas (voir « Vérifications » dans `ECONOMIE.md`).
