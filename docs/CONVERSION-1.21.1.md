# PixelGO — To the Sky : conversion 1.16.5 Forge → 1.21.1 NeoForge

Source : `modpack à convertir/PixelGO - To the Sky/` (Forge 36.2.39, KubeJS 1605)
Cible : cette instance (NeoForge 21.1.250, KubeJS 2101, Pixelmon 9.4.0)

Les quêtes (FTB Quests) ont été portées dans un second temps — voir §11.

---

## 1. Équivalences de mods retenues

| 1.16.5 | 1.21.1 | Note |
|---|---|---|
| Thermal Series | **EnderIO** + **Mekanism** | alliages → EnderIO, traitement du minerai → Mekanism |
| Ex Nihilo Sequentia | **Ex Deorum** | tamis, marteaux, `*_ore_chunk` au lieu de `*_cluster` |
| Storage Drawers / Framed Drawers | **Sophisticated Storage** | tonneaux, upgrades de palier |
| Cobble For Days | **Haven Cobble Generators** | `tier_1..5` → `wooden/stone/iron/gold/diamond/…_cobble_gen` |
| FTB Power Pots | **PowerPots** | `power_pot_mk1..4` → `power_pot_1..3` (le mod n'a que 3 paliers) |
| Refined Storage 1.9 | **Refined Storage 2.x** | IDs entièrement refondus |
| Extra Storage | **Extra Disks** | |
| Iron Chests | **Sophisticated Storage** | `iron/gold/diamond_chest` |
| Compact Machines (tiny→maximum) | **Compact Machines 7** | un seul bloc + module d'agrandissement |
| Compressium | *(aucun)* | remplacé par blocs vanilla / Extended Crafting |
| Emendatus Enigmatica | *(matériaux abandonnés)* | voir §2 |
| Tinkers' Construct, BYG, BetterEnd, Atlantis, Chipped, Fusion, XTones, Additional Colors, Pokéhaan Craft, JAVD, Angel Ring, Mystical Adaptations / Customization, FancyMenu, Default Options | *(aucun)* | contenu retiré ou remplacé |

## 2. Emendatus Enigmatica : unification des matériaux

EE **2.2.0** est installé, mais `config/emendatusenigmatica/material/` était
**vide** : en 2.x les matériaux ne sont plus codés en dur, ils se déclarent en
JSON. Sans ces fichiers, EE n'enregistre strictement rien.

### Comment EE et Ex Deorum s'emboîtent

Ex Deorum n'active un fragment de minerai que si le **tag d'items
`c:ores/<métal>` est non vide** — condition `neoforge:tag_empty` dans
`data/exdeorum/recipe/ores/*.json`. Sa recette `exdeorum:ore_chunk` transforme
ensuite 4 fragments en un bloc de minerai pris dans ce tag, qu'on fait fondre
en lingot.

Relevé des tags `c:ores/*` réellement remplis dans ce pack :

| Fourni par | Métaux |
|---|---|
| vanilla / Cyclic | copper, gold, iron, coal |
| Mekanism | lead, osmium, tin, uranium, fluorite |
| Pixelmon | aluminum, platinum, silver, ruby, sapphire, silicon, crystal |
| RFTools / Mystical | dimensional_shard, inferium, prosperity, soulium |

Quatre fragments d'Ex Deorum restaient donc **inutilisables** faute de bloc de
minerai correspondant : **nickel, zinc, cobalt, iridium**.

### Ce qui a été défini

`config/emendatusenigmatica/strata/stone.json` (une strate, pierre) et quatre
matériaux dans `config/emendatusenigmatica/material/` :

```
nickel · zinc · cobalt · iridium
processedTypes : ore, raw, storage_block, ingot, nugget, dust, plate, gear, rod
compat         : mekanism = true
```

Effets en chaîne :

1. EE crée les blocs de minerai → remplit `c:ores/{nickel,zinc,cobalt,iridium}` →
   **les 4 fragments Ex Deorum s'activent d'eux-mêmes**, tamis compris ;
2. EE génère toute sa chaîne de recettes (minerai → brut → lingot → plaque /
   engrenage / tige), ce qui réintroduit les **plaques et engrenages** dont le
   pack 1.16.5 se servait et qu'aucun autre mod ici ne fournit ;
3. `compat.mekanism` branche ces métaux sur le traitement Mekanism ;
4. les graines Mystical Agriculture `nickel/zinc/cobalt/iridium`, jusque-là
   désactivées faute de tag, redeviennent disponibles — `config/cucumber-tags.json`
   a été mis à jour en conséquence (`"null"` → lingot EE).

Aucun doublon n'est créé : ces quatre métaux n'existaient dans aucun autre mod
du pack. Les métaux déjà fournis ailleurs (aluminium, argent, platine, étain,
plomb, osmium, uranium…) ne sont **pas** redéfinis dans EE ; ils sont unifiés
par les tags `c:` (voir `40_tags.js`, section « unification »), ce qui remplace
les 3 109 lignes de `replaceOutput` de l'ancien `AVSP/fusion.js`.

### Pour ajouter un matériau

Déposer un fichier dans `config/emendatusenigmatica/material/`. Schéma vérifié
par décompilation de `MaterialModel.CODEC` :

```
id, localizedName, source ("vanilla" | "modded"), disableDefaultOre,
processedTypes[], strata[],
properties { materialType ("metal"|"gem"|"alloy"), harvestLevel, blockRecipeType,
             gemTexture, hasParticles, hasOxidization, isEmissive, isBurnable,
             burnTime },
colors     { materialColor, oxidizationColor, particlesColor, fluidColor,
             chemicalColor, gasColor },
compat     { create, thermal, mekanism, ars_nouveau, occultism },
oreDrop    { drop, min, max, uniformCount }
```

`processedTypes` acceptés : `ore, raw, cluster, crushed_ore, crystal, shard,
clump, dirty_dust, dust, ingot, nugget, gem, plate, gear, rod, storage_block,
fluid, gas, slurry, infuse_type, armor, helmet, chestplate, leggings, boots,
sword, pickaxe, axe, shovel, hoe, paxel, shield`.

EE écrit un compte rendu de validation dans
`config/emendatusenigmatica/Validation Results.md` à chaque démarrage — à
consulter en cas de matériau ignoré.

## 3. Poké Balls — le piège du portage

Les modèles `pixelmon:dusk_ball`, `pixelmon:master_ball`… présents dans le jar 9.4
**ne sont pas des items de registre**. Pixelmon n'enregistre toujours qu'un seul
`pixelmon:poke_ball` (+ `pixelmon:poke_ball_lid`), le type étant porté par un
composant de données :

```
1.16.5 : Item.of('pixelmon:poke_ball', '{PokeBallID:"dusk_ball"}')
1.21.1 : Item.of('pixelmon:poke_ball', '{"pixelmon:poke_ball":"dusk_ball"}')
```

Côté ingrédient, `{"type":"forge:nbt"}` devient `{"type":"neoforge:components", …,
"strict": true}`. Les helpers sont dans `kubejs/server_scripts/pixelgo/05_lib.js`.

Les **12 balls maison** (boss, cmd, ev, giga, iv, legend, micro, nature, new, raid,
truce, waifuform) venaient de `data/pixelmon/pokeballs/*.json` et pointaient vers des
classes Java du mod *pixelmagics / janna*, absent en 1.21.1 : elles sont **non
portables**. Partout où elles apparaissaient (loot, drops, EMC), elles ont été
remplacées par des balls réelles de flavour proche :

`boss→beast`, `ev→luxury`, `giga→heavy`, `iv→love`, `legend→cherish`, `micro→quick`,
`nature→friend`, `new→premier`, `raid→timer`, `truce→heal`, `waifuform→dream`,
`cmd→net`, `shiny→moon`. La **Origin Ball** (native 9.4) reprend le rôle de ball
premium au tumblestone.

## 4. Scripts KubeJS (1605 → 2101)

Ancien : 64 fichiers, ~21 000 lignes. Nouveau : 11 fichiers, ~1 850 lignes.

| Nouveau fichier | Remplace |
|---|---|
| `startup_scripts/pixelgo_items.js` | `startup_scripts/{script,block}.js` |
| `server_scripts/pixelgo/04_pg_lib.js` | **nouveau** — voir §7 |
| `server_scripts/pixelgo/05_lib.js` | helpers singularités / Poké Balls |
| `server_scripts/pixelgo/00_removals.js` | les 14 `remove.js` |
| `server_scripts/pixelgo/10_minecraft.js` | `minecraft/`, `phc/`, `other/`, `botanypot/` |
| `server_scripts/pixelgo/20_pixelmon.js` | `pixelmon/{pixelmon,pokeball,plate,pixelmongo}.js` |
| `server_scripts/pixelgo/30_tech.js` | `mekanism/`, `mystical/`, `projecte/`, `extendedcrafting/`, `refinestorage/`, `exnihilosequentia/` |
| `server_scripts/pixelgo/40_tags.js` | `color/tag.js`, `AVSP/ITEMTAGS/` |
| `server_scripts/pixelgo/50_interactions.js` | `rightclick.js`, `lootbox.js`, `pixelmon/ticket.js` |
| `client_scripts/pixelgo/tooltips.js` | `client_scripts/tooltips.js` |
| `client_scripts/pixelgo/hide_entries.js` | `client_scripts/{script,AVSP/jei_hideitems}.js` |

Changements d'API appliqués :
`onEvent('recipes')` → `ServerEvents.recipes` · `onEvent('item.tags')` →
`ServerEvents.tags('item')` · `onEvent('item.right_click')` →
`ItemEvents.rightClicked(<item>)` · `onEvent('block.right_click')` →
`BlockEvents.rightClicked` · `onEvent('item.tooltip')` → `ItemEvents.modifyTooltips` ·
`onEvent('jei.hide.items')` → `RecipeViewerEvents.removeEntries` (pilote JEI **et** EMI) ·
`onEvent('item.registry')` → `StartupEvents.registry('item')` ·
`result: {item: …}` → `result: {id: …}` · tags `#forge:*` → `#c:*`.

### Fichiers source non portés (et pourquoi)

- `palette.js` (6 997 lignes) — **code mort** : un tableau `form` sans aucun handler.
- `AVSP/fusion.js` (3 109), `AVSP/RECIPES/mekanism_ore_processing.js` (2 444),
  `AVSP/oredrops.js` (752), `AVSP/ores.js`, `AVSP/gear.js`, `AVSP/RECIPES/recipe.js`,
  `AVSP/ITEMTAGS/assorted.js` — unification de matériaux EE : sans objet (§2).
- `client_scripts/AVSP/jei_hideitems.js` (791) — masquait ~800 doublons de mods absents.
- `pixelmon/berry.js` (607) et `startup_scripts/AVSP/worldgen_remove.js` (132) —
  **intégralement commentés** dans la source.
- `botanypot/betterend.js` (525) — BetterEnd absent.
- `thermal/*`, `AVSP/RECIPES/thermal.js` — Thermal absent.
- `color/recipe.js`, `color/script.js` — tintedcampfires / additionalcolors / mzojpaint absents.
- `pokehaan/pokehaan.js`, `phc` partiel — Pokéhaan Craft absent.
- `startup_scripts/worldgen.js` — génération de minerai : sans objet en skyblock.

## 5. Données (datapacks)

- **Tables de butin des boîtes mystères** (`kubejs/data/loot/loot_table/tier1..4.json`) :
  réécrites au format 1.21 avec les items équivalents.
- **Dungeons Arise** : 160 tables converties, 109 conservées (les 51 dont la table
  n'existe plus en 2.1.68 ont été supprimées pour ne pas laisser de fichiers morts).
- **Coffres vanilla** : 25 tables converties.
- **Pixelmon** : garderie (18 fichiers), 3 coffres de structure (galactic, plasma,
  ultra_ruin), 11 structures NBT (tours, waypoints, PNJ), 12 template pools.
- **PixelmonGo** : `eggs.json` (17 œufs MK 0→16) et `pokemon_pools.json` repris tels
  quels ; `pokestop_pools.json` adapté. Le pool de structures **fusionne** les 4
  pokéstops natifs du mod et les 3 pixelstops de PixelGO.
- Conversions automatiques appliquées : `loot_tables/`→`loot_table/`,
  `drop/`→`drops/`, `structures/`→`structure/`, `{min,max}` nus →
  `{"type":"minecraft:uniform",…}`, `set_nbt`→`set_components`,
  entrée `loot_table` : `name`→`value`, `"type":"empty"`→`"minecraft:empty"`.

### Boutiques Pixelmon (9 marchands, 572 articles)

Le système a entièrement changé entre 9.1 et 9.4 :

| | 9.1 (source) | 9.4 (cible) |
|---|---|---|
| Définition | `data/pixelmon/npcs/shopkeepers/<nom>_en_us.json` | `data/pixelmon/pixelmon/npc/preset/shopkeeper/…` |
| Prix | fichier séparé `config/shopitems.json` | **en ligne** dans le preset (`buyPrice`/`sellPrice`) |
| Article | `{ id, name, nbtData, buy, sell }` | `{ item: <ItemStack>, buyPrice, sellPrice }` |
| Dialogues | liste `chat[]` de paires hello/goodbye | interactions `right_click` / `close_dialogue` / `close_shop` |

Les presets régénérés vivent dans
`kubejs/data/pixelmon/pixelmon/npc/preset/shopkeeper/pixelgo/` :

| Boutique | Articles | Dialogues | Skins |
|---|---|---|---|
| alolantms | 100 | 1 | 2 |
| berry_shop | 76 | 5 | 10 |
| cardpacks | 6 | 9 | 5 |
| electronics | 200 | 1 | 12 |
| evtraining | 6 | 9 | 5 |
| exp_dealer | 41 | 1 | 12 |
| minecraft_blocks_1_2 | 18 | 1 | 12 |
| mints | 25 | 9 | 5 |
| trs | 100 | 1 | 2 |

Conversions de NBT vers composants : 400 CT/CR (`{tm:12s}` →
`minecraft:custom_data {tm:12}`, format confirmé sur les presets
`pokemart/*/tm_1.json` livrés par Pixelmon) et 6 paquets de cartes
(`{SetID: N}`). Les 14 skins de PNJ utilisés existent tous encore en 9.4.

**Prix reconstitués (168 articles).** En 9.1, un article absent de
`shopitems.json` prenait un prix codé en dur dans Pixelmon. Ce registre n'existe
plus : les prix ont été repris des 91 presets livrés par le mod (396 références,
dont les pierres d'évolution à 2 100/800), puis complétés par catégorie —
baies 400/150, menthes 6 000/1 500, matières vanilla 150/40, bonbons Exp sur une
échelle doublante 800 → 12 800. Sans cela, 5 boutiques sur 9 seraient restées vides.

**Apparition en jeu.** Les marchands étaient placés par des structures dont le
NBT contient des PNJ au format 9.1, qui ne se résout plus. À la place,
`kubejs/data/pixelmon/spawning/npcs/pixelgo_shopkeepers.set.json` les fait
apparaître naturellement (type `Land`, biomes plaines / montagnes / forêt) —
donc dans la dimension **Overworld Mirror**, la seule à avoir du vrai terrain
dans ce skyblock. Ajuster `rarity` (2.0) pour les rendre plus ou moins fréquents.

### Origins « Pokemon Trainers »

Le datapack OpenLoader a été reconstruit pour **Origins-NeoForge 0.3.2**, dont le
format diffère beaucoup d'Apoli :

- `data/<ns>/origins/{origin,power,layer}/` au lieu de `origins/` + `powers/` ;
- ajout à la couche via le tag `data/origins/tags/origins/origin/origin.json` ;
- nom/description via les clés de langue `origin.<ns>.<id>.{name,description}` ;
- `origins:give` → `origins:give_item`, `entity_action_chosen` → `entity_action_gained`,
  champ `stacks` → `stack` ;
- l'armure du mod **dyeableironarmor** (absent) est remplacée par de l'**armure de
  cuir teinte** via le composant `minecraft:dyed_color` ;
- `skyblock manage islandShape start.nbt` → `… islandShape start` (en 1.21 le
  paramètre est le *nom* du template, pas le fichier).

Les 16 équipes sont générées : `kubejs/data/pokemon_trainers/` + traductions
FR/EN dans `kubejs/assets/pokemon_trainers/lang/`.

## 6. Assets (229 fichiers)

Copiés : polices personnalisées (`customfont` — icônes de types, raretés N/R/SR/SSR/UR/LR),
textures d'items PixelGO (tickets, boîtes mystères, bloc de slime rose), textures de
quêtes, sons Pixelmon, disques musicaux personnalisés (13), sons `pixelgo.pikachu` /
`pixelgo.magikarp`, bétons retexturés, plaques d'AdvancementPlaques, GUI de bataille
Pixelmon, écran de choix d'origine.

**Chaque chemin a été vérifié contre les jars 1.21.1** : 106 fichiers pointant vers
des chemins qui n'existent plus ont été écartés (textures des 12 balls supprimées,
`gui/types.png`, `gui/inventory/32/`, `options_background.png`…).

Deux corrections nécessaires :

- `assets/minecraft/font/default.json` : en 1.16 il suffisait de lister ses providers.
  Depuis la 1.19.3 ce fichier **remplace** la police par défaut — en l'état le jeu
  n'aurait plus affiché aucun texte. Les références
  `minecraft:include/space` et `minecraft:include/default` ont été ajoutées.
- Armures Pixelmon : `dawnstone_layer_1.png` → `dawn_stone_layer_1.png` (et 9 autres).

Resource pack : **Pixelmon's faithful x32** recopié avec un `pack.mcmeta` mis à jour
(`pack_format` 6 → 34). Les packs *Dark Mode* 1.16 et *Quark Programmer Art* ont été
écartés (GUI vanilla refondu en sprites depuis la 1.20 / Quark absent).

## 7. Correctifs apportés au passage

1. **`PG` / `PGC` manquants.** Les scripts `server_scripts/custom_item/{mega_key,
   random_egg,ssr_ticket}.js` déjà présents dans l'instance appelaient `PG.lire`,
   `PGC.couleurs`, `PG_CLE_INVOCATION`… qu'**aucun fichier ne définissait** : les trois
   items levaient une `ReferenceError` à chaque clic droit. La bibliothèque manquante
   a été écrite (`04_pg_lib.js`, priorité 2000).
2. **Comparaison d'ItemStack toujours fausse.** Les scripts 1.16.5 testaient
   `event.player.mainHandItem === Item.of('kubejs:mega_key')` — une comparaison
   d'identité entre deux objets distincts. Clé Méga, Œuf Mystère et les 17 tickets ne
   faisaient donc rien. Ils utilisent maintenant `ItemEvents.rightClicked(<item>)`.
3. **Double déclenchement** : les handlers réagissaient aux deux mains ; filtrage sur
   `MAIN_HAND`.
4. **Recharge des tickets** : le code existait dans la source mais était commenté et
   la `Map` n'était jamais lue. Recharge de 60 s réimplémentée sur les données
   persistantes du joueur (survit à une déconnexion).

## 7 bis. Correctifs d'API KubeJS 2101 (après premier lancement)

Le premier démarrage a révélé des méthodes de *builder* qui n'existent plus.
Les signatures ont été revérifiées à la source avec `javap` sur
`kubejs-neoforge-2101.7.2-build.377.jar` :

| Appel invalide | Fichier | Remplacement |
|---|---|---|
| `.textureAll(tex)` | `pixelgo_items.js` | `.texture(tex)` — un seul argument applique la texture à toutes les faces (méthode de `ModelledBuilderBase`) |
| `.tooltip('…')` ×14 | `startup_scripts/main.js` | `ItemEvents.modifyTooltips` dans `client_scripts/pixelgo/tooltips.js` |
| `.glow(true)` ×4 | `startup_scripts/main.js` | `.component('minecraft:enchantment_glint_override', true)` |

`main.js` (fichier préexistant de l'instance, pas issu de la conversion) aurait
échoué juste après `pixelgo_items.js` : `ItemBuilder` en 2101 n'a ni `glow` ni
`tooltip`. Ses 9 items sont désormais déclarés correctement.

Vérifiées comme **valides** au passage : `.texture()`, `.maxStackSize()`,
`.rarity('rare')`, `.displayName()`, `.component()`, `.soundType('metal')`,
`.hardness()`, `.resistance()`, `.requiresTool()`, `event.{shaped,shapeless,
smelting,blasting,smithing,custom,remove,replaceInput}`, `.id()` sur une recette,
`event.player`, `event.cancel()`, `player.{give,username,fake}`, et
`item.maxStackSize = 64` dans `ItemEvents.modification` (via `kjs$setMaxStackSize`).

Bon à savoir : les recettes `extendedcrafting:shaped_table` héritent du schéma
`shaped` de KubeJS, mais `KubeRecipe` conserve le JSON brut — le champ `tier` des
tables de rang 2/3/4 est donc bien préservé.

### Portée des scripts et limites de Rhino

Deux contraintes de KubeJS 2101 découvertes au lancement :

- **`global` est en lecture seule** dans les scripts client et serveur (seuls les
  scripts de démarrage peuvent y écrire) — `GlobalUnmodifiableMap`. Les helpers
  `PG` / `PGC` / `PIXELGO_*` sont donc déclarés en simples `const` de premier
  niveau. C'est sans risque : chaque `ScriptFile` est évalué contre le même
  `KubeJSContext.topLevelScope`, **tous les scripts d'un même type partagent une
  seule portée**. Un fichier de priorité élevée (`// priority: 2000`) expose
  donc ses déclarations à tous les suivants.
- **Rhino ne gère pas les paramètres du reste** `function f(a, ...rest)` :
  « missing formal parameter » au chargement. `PG.dire` utilise `arguments`.

### Deux règles à retenir pour les recettes

**1. `Item.of('id', '{composants}')` n'existe pas.** Les seules surcharges de
`ItemWrapper.of` sont `of(stack)`, `of(stack, DataComponentMap)`,
`of(stack, int)` et `of(stack, int, DataComponentMap)`. Rhino prend la chaîne
JSON pour le `count` et lève « Cannot convert {…} to int ».

**2. `event.shaped` / `event.shapeless` n'acceptent pas d'ingrédient en JSON
brut** dans `key` : leur schéma attend un `pattern<optional_ingredient>`, d'où
« Unable to set 'key' … Failed to read ingredient ».

Dans les deux cas la solution est la même — passer par `event.custom()` avec du
JSON brut, ce que font déjà toutes les recettes de Poké Balls :

```js
event.custom({
  type: 'minecraft:crafting_shaped',
  pattern: ['  1', ' 2 ', '2  '],
  key: { 1: singIng('nether_star'), 2: { tag: 'c:rods' } },
  result: { id: 'constructionwand:infinity_wand', count: 1 }
}).id('kubejs:infinity_wand')
```

Recettes converties à ce motif : œufs PixelmonGo (17), coupons PixelGO (2),
baguette d'infinité. Le helper `PIXELGO_BALL` / `PIXELGO_LID` a été remplacé par
`PIXELGO_BALL_RESULT`, qui rend un bloc `result` au lieu d'un ItemStack.

**3. `minecraft:custom_name` et `minecraft:lore` attendent une CHAÎNE, pas un
objet.** Ces deux composants sont déclarés avec
`ComponentSerialization.FLAT_CODEC` : leur forme persistante est une chaîne
*contenant* le JSON du composant. Un objet lève
`IllegalStateException: Not a string: {"text":…}`.

```json
"minecraft:custom_name": "{\"text\":\"§bSkin-AR\"}",
"minecraft:lore": ["{\"text\":\"§7Use on your Pokemon…\"}"]
```

Côté script, `JSON.stringify({ text: nom })` produit exactement cette forme.
Cela vaut aussi bien pour le `result` d'une recette que pour
`minecraft:set_components` dans une table de butin — même codec des deux côtés.
Les autres composants (`enchantments`, `hide_additional_tooltip`,
`pixelmon:poke_ball`, `pixelmongo:egg_data`…) restent en objet.

### Deux règles qui bloquaient le chargement du monde

**`sellPrice` est obligatoire dans un `ShopItem` Pixelmon.** Le codec 9.4 lit
`{ item, buyPrice, sellPrice }` avec les trois champs requis. L'omettre — par
exemple parce que l'article ne se revend pas — fait échouer le *preset entier*
(`No key sellPrice in MapLike[…]`), puis en cascade
`Failed to load registries due to above errors` : c'est précisément ce qui
empêchait le monde de se charger. Un article non rachetable s'écrit
`"sellPrice": 0`.

**`origins:play_sound` exige un SoundEvent enregistré.** Les sons ajoutés par un
pack de ressources (`kubejs/assets/minecraft/sounds.json`) n'existent que côté
client : ils ne sont pas dans le registre `minecraft:sound_event`, et l'action
échoue au décodage. La commande `/playsound`, elle, accepte n'importe quel
identifiant (elle construit un `Holder.direct` côté serveur et laisse le client
résoudre le fichier), d'où le pouvoir *musique* réécrit en :

```json
{ "type": "origins:execute_command",
  "command": "execute as @s at @s run playsound minecraft:pixelgo.magikarp master @s ~ ~ ~ 3" }
```

Une troisième erreur subsiste au démarrage —
`origins:power_type … No key effect in MapLike[{"id":"minecraft:slowness"…}]` —
mais elle vient du pouvoir `claustrophobia` **livré par origins-0.3.2**
(origine Enderian), pas du pack. Son codec est « défaillant par défaut » : il
journalise et poursuit, donc rien n'est bloqué. Cette origine n'est de toute
façon plus proposée (voir ci-dessous).

### Origins : une seule couche, équipes + humain

- `kubejs/data/origins/origins/layer/origin.json` remplace la couche du mod :
  au lieu de `["#origins:origin"]` (qui embarquait les 10 origines vanilla —
  arachnid, avian, blazeborn, elytrian, enderian, feline, merling, phantom,
  shulk), elle liste explicitement **`origins:human` + les 16 équipes**.
  Humain est en `order: 0`, les équipes en 1 à 16.
- `kubejs/data/origins/origins/layer/background.json` met `enabled: false` :
  c'est le mod **Origins-Backgrounds** qui ajoutait la seconde sélection
  (« spécialité ») après le choix d'origine.
- Le tag `origins:origin` que j'avais ajouté n'a plus lieu d'être (la couche
  liste en dur) : il a été supprimé.

### Identifiants d'items : audit complet

Un modèle d'item présent dans un jar ne garantit PAS que l'item est enregistré
(`waystones:sharestone`, `pixelmon:dusk_ball`… n'ont qu'un modèle). Un index
fiable a donc été reconstruit à partir des **fichiers de langue** de tous les
jars plus le jar vanilla 1.21.1 — 12 827 entrées — puis croisé avec chaque
identifiant des scripts et des datapacks.

Corrections trouvées :

| Identifiant | Réalité en 1.21.1 | Correction |
|---|---|---|
| `waystones:sharestone` | n'existe pas : 15 variantes colorées seulement (pas de blanche) | recette retirée (Waystones fournit les siennes) ; infobulle appliquée aux 15 couleurs |
| `pixelmon:healer`, `pixelmon:pc` | colorés uniquement | `pixelmon:red_healer`, `pixelmon:red_pc` |
| `pixelmon:aluminium_*` ×11 | Pixelmon 9.4 écrit « aluminum » | `pixelmon:aluminum_*` (correspondance 1:1) |
| `compactmachines:machine` | CM7 a refondu le système | recette retirée ; butin → `personal_shrinking_device` |
| `emendatusenigmatica:{gold,iron}_cluster` ×15 | EE sans matériaux (§2) | `exdeorum:{gold,iron}_ore_chunk` |

Faux positifs vérifiés à la main et conservés : `pixelmongo:egg`,
`compactmachines:new_machine`, `mysticalagriculture:nature_seeds`,
`ftbquests:barrier` — enregistrés, mais leur nom est généré à l'exécution donc
ils n'ont pas de clé de langue.

Les scripts d'audit sont réutilisables si tu ajoutes du contenu :
`check_ids.js` (scripts) et `check_data.js` (datapacks), dans le dossier
temporaire de la session.

## 8. Configs

Une bonne partie était déjà alignée dans l'instance cible (Pixelmon `*.yml`,
SkyblockBuilder, OreExcavation, cucumber-tags ; Inventory Pets retiré du pack le 2026-11-12). Modifications
apportées :

- **20 nouvelles singularités** Extended Crafting propres au pack : 7 abricots cuits,
  all_apricorn, berry, poke/great/hyper/master_ball, nether_star, EMC, rubis, saphir,
  fluorite, osmium, soufre, uranium (ingrédients EE remappés vers Mekanism/Pixelmon).

  Six d'entre elles pointaient d'abord vers `ftbquests:barrier`, l'objet-témoin
  inobtenable de la version 1.16.5 — où ces singularités venaient des **quêtes**,
  qui ne sont pas portées. Elles ont donc reçu un vrai ingrédient :

  | Singularité | Ingrédient | Quantité |
  |---|---|---|
  | master_ball | `projecte:rm_furnace` (ex-`projectexpansion:final_power_flower`, mod retiré 2026-11-08) | 64 |
  | emc_singularity | `projecte:red_matter_block` (ex-`projectexpansion:fading_compressed_collector`) | 128 |
  | nether_star | `minecraft:nether_star` | 256 |
  | poke_ball | `pixelmon:iron_base` | 2 000 |
  | all_apricorn | `#pixelmon:apricorns` | 2 500 |
  | berry | `#pixelmon:berries` | 2 500 |
  | great_ball | `pixelmon:silver_base` | 3 000 |
  | hyper_ball | `pixelmon:platinum_base` | 4 000 |

  Les trois paliers de ball suivent les socles de Poké Ball (fer → argent →
  platine), tous craftables. Le champ `materialCount` permet de sortir du coût
  global de 2 500 pour les objets déjà chers.

  **`electrum` et `invar` sont désactivées** (`enabled: false` +
  `inUltimateSingularity: false`) : leurs tags `c:ingots/*` sont vides, aucun mod
  du pack ne fournit ces alliages depuis le retrait de Thermal. Les laisser
  actives aurait aussi rendu la Singularité Ultime impossible.

  Bilan : 38 singularités actives, toutes craftables, aucun ingrédient en double
  (deux singularités partageant un ingrédient rendraient le compresseur ambigu).
- `extendedcrafting-common.toml` : `defaultMaterialsRequired` 10 000 → **2 500**,
  `defaultPowerRequired` 5 000 000 → **100 000**.
- `excompressum-common.toml` : vitesses d'automatisation du pack restaurées
  (marteau ×12,5, tamis ×13, tamis lourd ×13), `autoHammerDecay` 0.5 → **0**,
  `allowHeavySieveAutomation` → **true**.
- `ProjectE/custom_emc.json` : valeurs EMC du pack reportées (dont
  `minecraft:nether_star = 0`, indispensable puisque l'étoile redevient craftable),
  + blocage EMC des objets créatifs/infinis nouvellement craftables.
- `explorerscompass` (rayon 5 000 / 50 000 échantillons), `mysticalagriculture`
  (`enchantableSupremiumTools = false`), `cookingforblockheads` (`cowJarMilkPerTick 0.5`),
  `lootr` (`max_age 3600`), `fluxnetworks`
  (`enableFluxRecipe = false`), `cucumber-tags` (+ `c:ingots/osmium`).
- `skyblockbuilder/templates.json5` : l'île de départ historique `start.nbt` (3 Mo) a
  été ajoutée comme template **`start`** avec son point d'apparition `[76, 8, 74]`.
  Le template `default` reste en place.
- `pixelmongo/` : `eggs.json`, `pokemon_pools.json`, `pokestop_pools.json`.

## 9. À vérifier en jeu

Ces points reposent sur des schémas lus par décompilation, pas sur une exécution :

1. **`config/ProjectE/custom_emc.json`** — écrit sous forme de *map* (`"entries": {…}`)
   conformément au codec de ProjectE 1.1.0, alors que le fichier précédent contenait
   un tableau vide. Si ProjectE le régénère au démarrage, repasser en tableau.
2. **Œufs PixelmonGo craftés** — le composant `pixelmongo:egg_data` (`{key, distance}`)
   a été déduit de `EggData.class`. Vérifier qu'un œuf fabriqué porte bien le bon palier MK.
3. **Origins `starting_equipment`** — le champ liste s'appelle `stack` (et non `stacks`)
   d'après `StartingEquipmentPower.class`. Si le kit de départ n'apparaît pas, c'est là.
4. **Structures NBT 1.16** (`start.nbt`, tours, waypoints, pixelstops) — le DataFixer
   met à jour les blocs vanilla, mais les blocs de mods disparus seront omis.
5. **`skyblock manage islandShape start`** — vérifier que la commande accepte bien le
   nom du template.

## 10. Non porté

- ~~**FTB Quests**~~ — finalement porté, voir §11.
- **`config/trades.json`** (échanges de PNJ) — schéma non porté.
- **`vix_npc_shop_base`** : cette boutique vendait 46 graines d'essences de mobs
  (`mysticalagriculture:zombie_seeds`, `industrialagriculture:*`) issues du mod
  Mystical Customization et d'Industrial Agriculture, tous deux absents. Aucun
  article ne survit, la boutique n'est pas générée.
- **`data/pixelmon/species/`** (600 fichiers, 10 Mo) : copie intégrale des données
  d'espèces de Pixelmon 9.1. Les réinjecter **écraserait** les données 9.4 (formes,
  palettes et capacités ajoutées depuis). Volontairement ignoré.
- **`data/pixelmon/drop/pokechestdrops.json`** : ne contenait que les 12 balls
  supprimées ; la table par défaut de 9.4 est meilleure.
- **FancyMenu** : menu principal personnalisé (fonds d'écran, musique, boutons).
  Le mod n'est pas installé ici ; ses assets sont restés dans le dossier source si
  tu veux l'ajouter (`config/fancymenu/`).

## 11. FTB Quests : 1605 → 2101

Source : `modpack à convertir/.../config/ftbquests/quests/` (31 chapitres,
1 296 quêtes, 15 tables de récompenses, 40 999 lignes de SNBT).
Cible : `config/ftbquests/quests/`. L'ancien contenu (le chapitre `test`) est
sauvegardé dans `config/ftbquests/quests_backup_pre_import/`.

**Bilan : 29 chapitres, 1 158 quêtes, 15 tables.** 138 quêtes écartées.

### Règle appliquée

Une quête dont **une tâche** réclame un objet absent de la 1.21.1 est
supprimée ; une **récompense** absente est retirée seule, sauf si c'était la
seule récompense de la quête (auquel cas la quête part aussi : payer sans rien
recevoir est pire que pas de quête). Les dépendances des quêtes supprimées sont
reportées sur leurs propres dépendances, donc aucune chaîne n'est coupée.

L'index de validation (7 907 identifiants) est reconstruit à partir des
fichiers de langue de tous les jars + le jar vanilla, complété à la main pour
les objets au nom généré à l'exécution (`compactmachines:new_machine`,
`pixelmongo:egg`, `pixelmon:tm_gen*`, graines Mystical, items KubeJS du pack).

### Mod de quêtes Pixelmon

Les tâches `pixelmon:*` venaient de **PixelTweaks 1.10.6**. Son intégration FTB
Quests a été reprise telle quelle par **PixelGO Quests 1.0.0** (mêmes classes,
mêmes champs NBT) : la conversion se réduit au préfixe.

| 1.16.5 | 1.21.1 |
|---|---|
| `pixelmon:catch_pokemon` · `evolve_pokemon` · `hatch_egg` · `trade_pokemon` · `defeat_pokemon` · `defeat_trainer` · `pokedex_percentage` · `pokedollars` | `pixelgoquests:<même nom>` |
| récompenses `pixelmon:pokemon` · `pokedollars` · `pokeloot` | `pixelgoquests:<même nom>` |

Énumérations vérifiées identiques par décompilation : `CatchTask$GetType`,
`EvolutionTask$EvolutionType`, `PokelootReward$LootTier`. **Seule exception** :
`PokedexFilter` a perdu `GENERATION`/`TYPE` et gagné `STARTERS`/`PARADOX` —
l'unique tâche concernée filtrait les générations 1 à 9, soit le Pokédex
complet, elle est donc passée en `filter: 0b` (ALL).

Les 353 spécifications Pokémon (espèces, formes `galarian`/`alolan`, palettes
`p:*`) ont toutes été vérifiées contre les 1 029 fichiers d'espèces de
Pixelmon 9.4 : **aucune perte**.

### Ce que FTB Quests 2101 ne sait plus faire

- **`min_required_tasks`** (ajout de *questsadditions* par mixin) n'existe plus.
  Les 94 quêtes « obtiens ce Pokémon en le capturant / le faisant évoluer / en
  l'échangeant » deviennent une seule tâche `pixelgoquests:submit_pokemon`
  (`party: 2b` = équipe ou PC, `consumePokemon: false`) : « possède ce Pokémon,
  peu importe comment ». La quête à 18 tâches « capture un Pokémon à skin
  spécial » devient `catch_pokemon` sur `p:none` avec `invert: true`. La quête
  des 16 garderies colorées garde une couleur et le dit dans sa description.
- **`questsadditions:use`** (utiliser un objet sur un bloc) n'a pas
  d'équivalent : les 3 quêtes concernées (Flûte azur / Chaîne rouge sur l'Autel
  spatio-temporel, GS Ball sur le Sanctuaire d'Ilex) deviennent des `checkmark`
  avec l'instruction écrite en toutes lettres.
- **`itemfilters:tag` / `itemfilters:or`** : le mod n'existe plus et FTB Filter
  System n'est pas installé. Les 9 filtres `#refinedstorage:*` désignaient « une
  couleur quelconque de ce bloc » ; en RS 2 la couleur est un composant, donc
  l'objet de base suffit. Les `or` retombent sur le premier objet disponible.

### Traductions

Les titres de la 1.16.5 étaient des renvois `{quest.xxx.title.N}` vers
`kubejs/assets/kubejs/lang/en_us.json`. Ils sont **résolus en texte anglais**
à la conversion (3 clés absentes du fichier source ont été écrites :
`quest.mekanism.title.2/3/4` → Hazmat Suit / Radiation Gear / Refined Alloys).
Les titres sont écrits en ligne dans les `.snbt` ; FTB Quests 2101 les migre
tout seul vers `quests/lang/en_us.snbt` au premier chargement du monde
(`handleLegacyQuestNBT` / `handleLegacyChapterNBT` / `handleLegacyTaskNBT`).
`fallback_locale: "en_us"` est posé dans `data.snbt`.

### NBT → composants

`icon` doit désormais être un **compound** : `readData` fait `getCompound("icon")`,
une chaîne `icon: "minecraft:stone"` donnerait un compound vide, donc plus
d'icône. Tout est écrit en `{ id: "…" }`.

| 1.16.5 | 1.21.1 |
|---|---|
| `tag: {PokeBallID: "dusk_ball"}` | `components: {"pixelmon:poke_ball": "dusk_ball"}` |
| `tag: {tm: 12s}` | `components: {"minecraft:custom_data": {tm: 12s}}` |
| `tag: {Id: "extendedcrafting:berry"}` | `components: {"extendedcrafting:singularity_id": …}` |
| `ftbquests:lootcrate` `tag: {type: "supra_reward"}` | `components: {"ftbquests:loot_crate": "supra_reward"}` |
| `ftbquests:custom_icon` `tag: {Icon: "…png"}` | `components: {"ftbquests:icon": "…png"}` |
| `tag: {"pixelmongo:key": …, totalDistance: …}` | `components: {"pixelmongo:egg_data": {key, distance}}` |
| `Enchantments` + `display.Name/Lore` | `minecraft:enchantments` + `custom_name`/`lore` (chaînes JSON) + `hide_additional_tooltip` |
| `match_nbt: true` | `match_components: "fuzzy"` |
| `Damage: 0`, `HideFlags`, `RepairCost`, `mekData`… | supprimés (valeurs par défaut) |

**CT/CR Paldéens :** en 9.4 `tm_gen9` est indexé à partir de 1 (0 en 9.1). Les
171 entrées de `tm_gen_9` sont décalées de +1 et portent `Gen9Offset: 1b`, le
marqueur que `TechnicalMoveItem` utilise pour ne pas re-décaler l'objet.
Les autres générations, y compris `tm_gen8`/`tr_gen8` (0-99), sont inchangées.

### Autres champs FTB Quests

`repeatable` → `can_repeat` · `secret` → `invisible` (vérifié : le mixin
*questsadditions* rendait la quête invisible tant qu'elle n'était pas terminée,
ce que fait exactement « Invisible Until Completed ») · `observe_type: 0` →
`observation_type: "block"` · récompense `command` : `player_command: false` →
`permission_level: 4` (l'ancien réglage exécutait la commande côté console).
Deux récompenses `random` **sans `table_id`** (déjà cassées dans la 1.16.5, elles
ne donnaient rien) ont été retirées.

### Correspondances d'objets notables

| 1.16.5 | 1.21.1 |
|---|---|
| `exnihilosequentia:{sieve,crook_wood,crucible_fired,barrel_wood,hammer_*,mesh_*,pebble_*,end_cake}` | `exdeorum:*` (mesh émeraude → netherite, seul palier supérieur restant) |
| `excompressum:compressed_hammer_<mat>` | `excompressum:compressed_<mat>_hammer` |
| `storagedrawers:*` / `ironchest:*` | `sophisticatedstorage:*` |
| `refinedstorage:crafter` · `crafting_upgrade` · `*k_fluid_storage_part` | `autocrafter` · `autocrafting_upgrade` · `*b_fluid_storage_part` |
| `extradisks:<n>k_storage_part` | `extradisks:<n>k_item_storage_part` |
| `compactmachines:machine_<taille>` | `compactmachines:new_machine` + composant `room_template` (tiny→colossal) et `match_components: "fuzzy"` pour que les 6 paliers restent distincts |
| `cobblefordays:tier_1` | `havencobblegens:wooden_cobble_gen` |
| `cyclic:antigravity` · `peat_generator` | `cyclic:charm_antigravity` · `generator_fuel` |
| `botanypots:{botany_pot,hopper_botany_pot}` | `botanypots:terracotta_*` |
| `mekanism:ingot_copper` · `upgrade_gas` | `minecraft:copper_ingot` · `mekanism:upgrade_chemical` |
| `emendatusenigmatica:{osmium_*,fluorite_gem,silver_ingot}` | Mekanism / Pixelmon |
| `mysticalagriculture:basic_reprocessor` · `inferium_furnace` | `seed_reprocessor` · `furnace` (les 4 fourneaux de palier n'existent plus) |
| icônes `pixelmoninformation:.../genN.png` | sprite du starter de la génération |
| `chisel:.../antiblock/white.png` (image de chapitre) | `minecraft:textures/block/white_concrete.png` |

### Ce qui a été écarté (138 quêtes)

| Cause | Quêtes |
|---|---|
| chapitres **Thermal** (48) et **Tinkers' Construct** (34) — mods absents | 82 |
| 12 Poké Balls maison (boss, cmd, ev, giga, iv, legend, micro, nature, new, raid, truce, waifuform) | 12 |
| récompenses toutes indisponibles (trophées Pokéhaan, tenue d'Ash, livres Patchouli, table de craft colorée) | 12 |
| Refined Storage : `fluid_grid`, `fluid_interface`, RS Addons, RS Large Patterns, RS Requestify | 5 |
| 4 crochets Ex Nihilo (Ex Deorum n'a que `crook` et `bone_crook`) + 4 fourneaux Mystical de palier + 2 Mystical Adaptations | 10 |
| objets créatifs Thermal / RS Addons / Storage Drawers, blocs Pokéhaan | 9 |
| coffres argent/obsidienne, `upgrade_template`, `drawer_key` | 4 |
| marqueurs « Thermal » / « Tinker » du chapitre *Complete All* | 4 |

Dans les **récompenses**, les 12 balls maison sont remplacées par la ball réelle
la plus proche (même table de correspondance que les loots et boutiques du §3),
pas supprimées : `boss→beast`, `ev→luxury`, `legend→cherish`, etc.

### Vérifications automatiques

Un script de contrôle relit les 46 fichiers écrits et vérifie : SNBT valide,
3 061 identifiants d'objets tous enregistrés, aucun NBT 1.16.5 résiduel
(`tag`/`Count`), aucun champ mort (`match_nbt`, `min_required_tasks`,
`player_command`, `observe_type`), aucun `{clé}` de langue non résolu, aucun
texte non anglais, aucune dépendance orpheline, aucun `table_id` pointant vers
une table absente, aucun identifiant en double, `custom_name`/`lore` bien
sérialisés en chaînes. **0 erreur.**

### À vérifier en jeu

1. Le premier chargement du monde doit réécrire `quests/lang/en_us.snbt` avec
   tous les titres (migration automatique). S'il reste vide, les titres
   s'affichent quand même : ils sont en mémoire depuis les `.snbt`.
2. Les 3 quêtes passées en `checkmark` (Flûte azur, Chaîne rouge, GS Ball) se
   valident à la main — c'est voulu, il n'existe pas de tâche « utiliser sur ».
3. Les 94 tâches `submit_pokemon` demandent un clic de remise dans le livre,
   là où la 1.16.5 se validait automatiquement à la capture.
4. La progression FTB Quests des mondes existants (`saves/*/ftbquests/`) ne
   correspond plus à ce livre ; repartir d'un monde neuf.
