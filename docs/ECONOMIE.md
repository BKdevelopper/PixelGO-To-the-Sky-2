# PixelGO — To the Sky : économie

Référence de l'économie du pack : ce qui rapporte de l'argent, combien, ce qui coûte quoi,
et ce qui a été corrigé le 27/09/2026.

```
Monnaie     PokéDollars de Pixelmon (compte bancaire du joueur), rien d'autre
Ancre       1 culture ≈ 40 $   —   ferme manuelle ≈ 32 000 $/h
Règle 1     seules les CULTURES et les TRÉSORS Pixelmon se revendent vraiment
Règle 2     tout ce qui sort d'un générateur infini vaut 0 à 2 $
Règle 3     aucun objet revendable n'a de valeur EMC (ProjectE)
Règle 4     partout, prix de revente < prix d'achat le plus bas
Règle 5     une transformation rapporte au plus ~25 % de plus que ses ingrédients
```

Pack : Minecraft 1.21.1, NeoForge 21.1.250, Pixelmon 9.4.1, KubeJS 2101.
Outils : `tools/pixelgo-economy/` (`apply.mjs` applique les données, `rates.mjs` recalcule
les gains par heure). Les fichiers d'origine sont sauvegardés dans
`backups/economie-2026-09-27/`.

---

## 1. Verdict

L'économie n'était pas stable. La trame (`PROGRESSION-TRAME.md`) veut que la ferme soit la
source de revenus et que chaque étape s'achète ; en pratique **neuf sources rapportaient
entre 5 et 400 fois une ferme manuelle**, dont six sans aucun effort une fois installées.

| # | Faille | Rapport avant | Gravité |
|---|---|---|---|
| A | Pay Day ×5 cumulable, payé même en fuyant, doublé deux fois — auto-battle compris | 2,4 M$/h | critique |
| B | Distributeur : bloc de slime acheté 45 $ → 9 boules revendues 40 $ | 12 M$/h | critique |
| C | Distributeur : argile 3 $ → 4 boules à 40 $ ; cobble racheté 1 $ | 6 M$/h, 2,7 M$/h | critique |
| D | Champignon géant à la poudre d'os + Toucher de soie : blocs à 400 $ | 13 M$/h | critique |
| E | Générateur de cobble → pierre enchantée revendue | 1,6 M$/h | critique |
| F | Tamis automatique sur terre : silex, carottes, cannes à 40 $ | 0,16 à 1,8 M$/h | critique |
| G | ProjectE : collecteur final → transmutation de pain / foin | illimité | critique |
| H | Power Pot III ×32, minions ×3,3, essence MA ×2,7, broyeur Cyclic ×3,4 | 0,14 à 0,7 M$/h | forte |
| I | Ticket horaire en valeur de test (30 min) et crédité en AFK | 2 tickets/h AFK | forte |
| J | Poke Hunter : Master Ball pour un Kangourex, 128 balls pour un Onix | — | forte |
| K | Prix incohérents : EXP S Ball > M > L, sac de palier 1 > palier 2, Shiny Ball à 1/10 du Swapper, +1 IV à 20 000 $ | — | moyenne |
| L | 43 objets d'évolution sans source fiable en skyblock | — | moyenne |

Tout est corrigé ; le détail suit.

---

## 2. Gains par heure, avant / après

Calculés par `node tools/pixelgo-economy/rates.mjs` à partir des vitesses lues dans les
configs et les recettes (hypothèses écrites dans le script).

| Source | Avant ($/h) | Après ($/h) | Pourquoi |
|---|---:|---:|---|
| Ferme manuelle (référence) | 32 000 | 32 000 | 800 cultures/h, inchangé : c'est l'ancre |
| Tamis manuel (terre, ficelle) | 56 400 | 4 680 | 23,5 $ → 1,95 $ par bloc |
| Tamis auto (terre, ficelle), net de la terre | 162 000 | 6 840 | terre au distributeur à 1 $ |
| Tamis compressé auto (terre, netherite) | 1 814 400 | 0 | plus de culture ni de silex vendable |
| Générateur cobble netherite → pierre enchantée | 1 641 600 | 0 | la pierre enchantée ne se revend plus |
| Générateur cobble netherite → distributeur | 2 764 800 | 0 | rachat du cobble 1 $ → 0 $ |
| Botany Pot à entonnoir (blé) | 4 422 | 1 320 | 1 culture par récolte, pousse ×2 plus lente |
| Power Pot III (blé) | 141 504 | 10 560 | vitesse ×8 rendement ×4 → ×4 / ×2 |
| Pot Mystical Agriculture (essence de nature) | 6 400 | 2 400 | 1 essence ≈ 1 culture |
| Minion de blé, palier I | 16 000 | 6 400 | `speedMultiplier` 0,3 → 0,75 |
| Minion de blé, palier max | 34 286 | 13 714 | stockage de 15 cases à vider |
| Pay Day (niv. 100, Pièce Rune + Happy Hour) | 2 400 000 | 24 000 | multiplicateur 5 → 0,05 |
| G-Max Gold Rush (3 tours de Dynamax) | 7 200 000 | 14 400 | multiplicateur 100 → 0,2 |
| Champignon géant + Toucher de soie | 12 960 000 | 32 400 | bloc de champignon 400 $ → 1 $ |
| Champignon géant sans Toucher de soie | 374 400 | 28 080 | champignon 40 $ → 3 $ |
| Arbitrage bloc de slime (distributeur) | 12 096 000 | 0 | la boule de slime ne se revend plus |
| Arbitrage argile → boules (distributeur) | 6 028 800 | 0 | la boule d'argile ne se revend plus |
| Broyeur Cyclic : canne → 3 sucres | 684 000 | 0 | sucre 45 $ → 12 $ |
| ProjectE fin de partie → pain transmuté | ~7 000 milliards | 0 | aucun revendable n'a d'EMC |
| Ticket horaire, AFK 1 h (valeur en cultures) | 102 400 | 0 | 60 min, temps actif seulement |

### Ce que ça donne sur une partie

| Stade | Installation typique | Revenu |
|---|---|---:|
| Étape 1-2 | ferme manuelle, outils de récolte | ~30 000 $/h |
| Sortie du mur | + 3 minions de culture palier I, 16 pots à entonnoir | ~70 000 $/h |
| Milieu de partie | 10 minions palier max, 64 pots | ~220 000 $/h |
| Fin de partie | + 8 Power Pots III | ~300 000 $/h |

Les 300 000 $/h de fin de partie coûtent ~35 000 cultures en améliorations (Power Pots, paliers
de minion), des centaines de diamants et une production d'énergie — et restent sous le prix
des achats de fin de partie : Shiny Swapper 1 h 40, Singularité ultime 12 h, Essence créative
83 h, Batterie infinie 170 h. Il n'existe plus de source dont le rendement ne dépend pas de
l'investissement.

---

## 3. Sources d'argent

### Revente (`/pixelsell`, bouton « Sell », marchands)

`pixelgosell` indexe **toutes** les boutiques du datapack et paie le meilleur prix trouvé ;
peu importe le marchand. Prix après équilibrage :

| Catégorie | Objet | $ |
|---|---|---:|
| **Cultures** (l'ancre) | blé, carotte, pomme de terre, citrouille, canne à sucre, cactus, fèves de cacao, verrue du Nether | 40 |
| | tranche de melon / melon (bloc) | 8 / 80 |
| | graines de blé / patate toxique | 10 / 5 |
| | champignon brun ou rouge / bloc de champignon | 3 / 1 |
| | baies Pixelmon (toutes) | 40 |
| **Transformations** | ballot de foin (9 blés) | 400 |
| | pain (3 blés) | 140 |
| | pomme de terre cuite | 50 |
| | teinture verte / sucre | 18 / 12 |
| | fleurs (les 15), nénuphar — la poudre d'os en fait pousser des dizaines | 2 |
| **Classe 1 — ce qui pousse ou vit** (proportions des plugins) | bûches (6 essences) | **20** |
| | patte de lapin | 10 |
| | viandes et poissons crus / cuits, cuir | 5 / 6, 5 |
| | plume, œuf, peau de lapin | 3 |
| | laine / ficelle | 2 / 0,5 |
| **Classe 2 — ce qui sort d'une machine** (tamis, générateurs, broyeurs) | mithril / débris de netherite | 50 / 30 |
| | diamant / émeraude | **10 / 8** |
| | or, perle de l'Ender | 4 |
| | fer, quartz, obsidienne | 3 |
| | charbon, cuivre, poudre lumineuse, larme de ghast, bâton de blaze | 2 |
| | redstone, lapis, os, œil d'araignée | 1 |
| | poudre de blaze, crème de magma, charbon de bois, chair, éponge, prismarine | 0,5 |
| | poudre à canon / slime, lave | 0,2 / 0,1 |
| | sable, gravier, silex, argile, glace, neige, mycélium | 0,05 |
| | cobble, pierre noire, pierre de l'End, pierre dure (générateur : 768 blocs/s) | 1/320 (0,20 $ la pile de 64 ; 0,5 $ les 160, comme la version enchantée) |
| **Trésors** (÷ 5, voir ci-dessous) | couronne / statue / bracelet / vase antiques | 1 200 / 800 / 400 / 200 (avant 6 000 / 4 000 / 2 000 / 1 000) |
| | pièce antique or / argent / cuivre | 120 / 20 / 4 (avant 600 / 100 / 20) |
| | Poké Coin / Dime / Nickel (Pokeblocks) | 120 / 40 / 20 (avant 600 / 200 / 100) |
| | grosse pépite / pépite, collier de perles / grosse perle / perle | 80 / 20, 40 / 16 / 4 (avant 400 / 100, 200 / 80 / 20) |
| | fragment de comète / morceau d'étoile / poussière étoile | 50 / 24 / 6 |
| | champignon odorant / gros / petit, os rare | 30 / 10 / 1, 10 |
| | éclat de comète / morceau d'étoile / poussière d'étoile | 250 / 120 / 30 |
| **Items enchantés** (Minions) | **tout** item enchanté = exactement 160 fois son item de base, cultures comprises | 0,5 à 64 000 |
| | exemples : blé 6 400 · carotte 6 400 · pain 22 400 · botte de foin 64 000 · bûche 3 200 · cuir 800 · os 160 · diamant 160 · pierre 0,5 | |
| | « super » items (160 items enchantés) : Box of Seeds 256 000 · Polished Pumpkin / Mutant Nether Wart 1 024 000 · Super Enchanted Egg 76 800 · Absolute Ender Pearl 25 600 · Concentrated Stone 80 | |
| **Boutiques Pixelmon** | tout le reste (potions, CT, balls…) | 1/50 du prix d'achat |

Les trésors ne viennent que de coffres, de drops de Pokémon (Miaouss, Gholdengo, raids…) et
de récompenses : ils ne sont pas automatisables, leur prix est conservé.

### Barème des produits de minion (§4 ter)

Tout ce qu'un minion produit se revend : brut au marchand de sa catégorie, compacté au
« Rachat d'items enchantés ». Une ressource vaut **ce que coûte sa production dans ce pack**,
dans l'ordre des plugins de référence (EssentialsX `worth.yml`, ShopGUI+, Hypixel SkyBlock,
dont PixelGO Minions reprend les minions) : pierre < sable < fer < or < charbon, redstone
< diamant, et le vivant (cultures, bois, bêtes) en haut.

**Classe 1 — ce qui pousse ou vit.** Débit borné par la croissance, la reproduction ou les
apparitions, comme les cultures : même logique de prix. 1 carotte = 2 bûches, comme sur les
serveurs à plugins (bûche ≈ ½ à 1 blé). Les arbres sont freinés comme les cultures : un
arbre en pot donne 1 à 4 bûches toutes les 2 min (~1 500 $/h, un pot de blé ~1 300 $/h) ;
un minion de chêne 200 bûches/h (4 000 $/h, minion de blé 6 400 $/h) ; l'essence de bois
de Mystical Agriculture passe de 16 à 6 bûches pour 3 essences (40 $ l'essence, comme une culture).

**Classe 2 — ce qui sort d'une machine.** C'est là que ce pack diffère d'un serveur à plugins.
Avant réglage, un seul tamis compressé automatique rendait ~2 500 diamants par heure, et le
tamisage manuel « simultané » actionnait **49 tamis en un clic** (portée 3 = 7 × 7). Aucun prix
de minerai ne pouvait tenir. Trois réglages y remédient :

| Réglage | Avant → après |
|---|---|
| `exdeorum-server.toml` `simultaneous_sieve_range` | 3 (49 tamis) → **1** (9 tamis) |
| `exdeorum-server.toml` `simultaneous_compressed_sieve_usage` | true → **false** (un tamis compressé vaut déjà 9 blocs) |
| `excompressum-common.toml` `autoSieveSpeed` / `autoHeavySieveSpeed` | 0,1 / 0,05 → **0,025 / 0,0125** (4 fois plus lents) |

Résultat, au barème ci-dessus :

| Source | Débit | Rapport |
|---|---|---:|
| tamisage manuel, gravier, 9 tamis, maillage doré | ~2,1 $ le bloc | ~45 000 $/h en jeu actif ≈ une ferme manuelle |
| tamis compressé manuel, gravier doré | ~15 $ le bloc compressé | ~36 000 $/h en jeu actif |
| tamis compressé **automatique** | 900 blocs/h (~570 diamants, ~570 émeraudes, ~1 260 charbons) | ~13 400 $/h |
| tamis automatique simple | 1 800 blocs/h | ~3 800 $/h |
| générateur de cobble netherite | 768 blocs/s | ~8 600 $/h (brute ou enchantée, même prix) |

L'ordre des plugins est conservé (pierre < sable < fer < or < diamant) et l'échelle a été
rapprochée : 1 diamant = ¼ de culture, 1 lingot d'or = 1/10 de culture.

**Trésors ÷ 5.** Les pièces tombent partout, sans effort particulier :
- la table `pixelgo:special/money` (Nickel, Dime, Poké Coin) est appelée par les tiers
  `pixelgo:basic/t1-t5`, eux-mêmes présents dans **~490 coffres de structures** (Dungeons
  Arise, ATi, Incendium, MNS, chambres d'épreuves…). Lootr donne un butin par joueur et par coffre ;
- Miaouss, Persian, Mordudor et Gromago en lâchent à **chaque victoire** (drops à 100 %).

Au prix Pixelmon d'origine, un Nickel valait 10 diamants, les pièces faisaient 60-70 % de la
valeur d'un coffre et un Miaouss rapportait 190 $ par combat (~40 000 $/h en auto-combat, plus
qu'une ferme). Tous les trésors sont divisés par 5, rapports entre eux conservés. Aucun ne
s'achète : pas de boucle possible.

| Source | Avant | Après |
|---|---:|---:|
| tirage `pixelgo:special/money` | 877 $ | 175 $ |
| coffre Dungeons Arise (moyenne de 142 tables) | 672 $ dont 305 $ de pièces | 392 $ dont 61 $ |
| coffre de structure vanilla (moyenne de 57) | 471 $ dont 188 $ | 218 $ dont 38 $ |
| coffre de donjon PixelGO (moyenne de 9 portes) | 1 423 $ dont 948 $ | 665 $ dont 190 $ |
| victoire contre Miaouss / Persian / Mordudor | 190 $ | 38 $ (≈ une culture) |
| victoire contre Gromago | 295 $ | 59 $ |

Un item enchanté vaut **exactement** ses unités brutes : compacter fait gagner de la place,
pas d'argent — cultures comprises (un blé enchanté = 160 blés = 6 400 $). Les « super »
items vendus au Minion Gear s'achètent 25 % au-dessus de leur contenu (Polished Pumpkin :
1 280 000 $ à l'achat, 1 024 000 $ à la revente) ; ils coûtaient 2 565 $ pour 25 600 citrouilles.
Les recettes de conversion (broyeurs Cyclic et Mekanism, mélange Ex Deorum, solidificateur,
pierre philosophale) ont été vérifiées : aucune ne rapporte plus de 1 $ par opération, et
le distributeur ne rachète jamais au-dessus de ce barème (bûche : vendue 40 $, rachetée 20 $).



### Autres entrées d'argent

| Source | Montant | Renouvelable ? |
|---|---|---|
| Dresseurs (`give_money`, Pixelmon et Battle Tower) | **÷ 10 depuis le 08/11/2026** (`tools/pixelgo-economy/trainers.mjs`) : sauvages 15 à 20 $ (plafond 200 $ puis ÷ 10) ; dresseurs d'arène 14 $ ; champions d'arène 42 à 50 $ ; sbires et chefs d'équipe 6 à 10 $ ; Battle Tower 25 à 135 $ par étage ; Ligue 20 000 $ | oui, au rythme des apparitions (au plus 2 PNJ sauvages par joueur, `58_pnj_sauvages.js`) |
| Tour de combat PixelGO | 250 à 1 350 $ par étage | oui |
| Pay Day / G-Max Gold Rush | niv. × 0,05 / niv. × 0,2 par utilisation | oui, ≤ 24 000 $/h en continu |
| Pièce Rune, Happy Hour | ×2 chacun sur les gains de combat (entiers dans Pixelmon) | — |
| Quêtes FTB (`pixelgoquests:pokedollars`) | 461 250 $ au total, 103 récompenses | **non**, aucune quête répétable |
| Portes PixelGO (coffres) | ~1 100 $ (S) à ~3 300 $ (Démon) de revente par coffre | oui, ~6 portes/h |
| PokéStops | ~230 à 470 $ de revente par passage | oui, avec délai |
| Distributeur (rachat) | 0 à 1 $ par objet | négligeable |

### Sorties d'argent (puits)

Boutiques (§4 bis), paliers de minions, et l'**Upgrade Orb** : 5 000 $ par point de pourcentage de réussite,
plafond +25 % (125 000 $ par tentative), rien de remboursé en cas de succès. Ce taux sert
d’étalon pour le chromatique : 100 % ≈ 500 000 $, le prix du Shiny Swapper.

---

## 4. Les marchands

Les 14 marchands du pack (dont 3 doublons) sont remplacés par **30 marchands en 14
catégories** (dont les 7 de la Décoration, ci-dessous). Tous ont le même gabarit : nom de catégorie en couleur au-dessus de la tête,
même dialogue d'accueil / d'au revoir, mêmes skins, et le même nom
« **Catégorie · Marchand** » en jeu comme dans la Boutique Portable, en anglais et en
français. Dossier : `kubejs/data/pixelgo/pixelmon/npc/preset/shopkeeper/`. Le numéro
du dossier donne l'ordre d'affichage dans la Boutique Portable.

| Dossier | Marchand (EN / FR) | Contenu | Articles | Rachète |
|---|---|---|---:|:---:|
| `01_island/general_store` | Island · General Store / Île · Bazar | Botany Pot, Waystone, capsule temporelle, méta-familier | 4 | |
| `02_farm/farm_market` | Farm · Farm Market / Ferme · Marché fermier | cultures, produits de ferme, 15 fleurs | 36 | ✔ |
| `02_farm/butcher` | Farm · Butcher / Ferme · Boucherie | viandes, poissons, œufs | 16 | |
| `03_materials/building_blocks` | Materials · Building Blocks / Matériaux · Blocs de construction | bûches, pierre, sable, glace, laine, éponges, nénuphar | 27 | ✔ |
| `03_materials/mob_drops` | Materials · Mob Drops / Matériaux · Butin de monstres | os, perles, poudres, carapaces… | 25 | ✔ |
| `03_materials/ores_and_metals` | Materials · Ores & Metals / Matériaux · Minerais et métaux | lingots, gemmes, blocs, netherite, lave | 27 | |
| `04_equipment/utilities` | Equipment · Redstone & Utilities / Équipement · Redstone et utilitaires | pistons, entonnoirs, enclume, table, flèches… | 20 | |
| `04_equipment/rare_goods` | Equipment · Rare Goods / Équipement · Objets rares | pommes dorées, totem, étoile du Nether, balise, élytres, œuf de dragon… | 10 | |
| `05_poke_balls/special_balls` | Poké Balls · Special Balls / Poké Balls · Balls spéciales | Master, EXP, EV, IV, IV ALL, Skin, Shiny Ball | 21 | |
| `06_training/stats_and_levels` | Training · Stats & Levels / Entraînement · Stats et niveaux | objets EV/IV PixelGO, vitamines, objets de puissance, Multi Exp, Œuf Chance, capsules d'argent / d'or | 32 | ✔ |
| `06_training/natures_and_abilities` | Training · Natures & Abilities / Entraînement · Natures et talents | 25 menthes, Capsule et Patch Talent | 27 | ✔ |
| `06_training/tms_gen7` | Training · TMs (Gen 7) / Entraînement · CT (7e génération) | CT d'Alola | 100 | |
| `06_training/trs_gen8` | Training · TRs (Gen 8) / Entraînement · DT (8e génération) | DT de Galar | 100 | |
| `07_battle/held_items` | Battle · Held Items / Combat · Objets tenus | 36 objets tenus, Pièce Rune, Nœud Destin | 38 | |
| `08_evolution/evolution` | Evolution · Stones & Items / Évolution · Pierres et objets | 10 pierres, Pierre Stase, 43 objets d'évolution, fossile aléatoire | 53 | ✔ |
| `09_cosmetics/cosmetics` | Cosmetics · Shiny & Skins / Cosmétiques · Chromatiques et skins | Shiny Swapper, Skin Swapper, taille aléatoire | 3 | |
| `10_berries/berries` | Berries · Berry Stand / Baies · Étal de baies | toutes les baies | 77 | ✔ |
| `11_rewards/mystery` | Rewards · Mystery Bags & Cards / Récompenses · Sacs mystère et cartes | 4 sacs mystère, 6 paquets de cartes | 10 | |
| ~~`12_minions/minions`~~ | *supprimé le 2026-10-14* | les minions ne se vendent plus : ils se craftent uniquement | 0 | |
| `12_minions/minion_gear` | Minions · Minion Gear / Équipement de minion | compacteurs, améliorations | 17 | |
| `12_minions/minion_tools` | Minions · Minion Tools / Outils de minion | 19 outils de récolte | 19 | |
| `12_minions/minion_buyer` | Minions · Enchanted Goods Buyer / Rachat d'items enchantés | rachat des 105 items enchantés que produisent les minions | 105 | ✔ |
| `13_endgame/endgame` | Endgame · Ultimate Goods / Fin de partie · Objets ultimes | singularités, essence créative, batterie infinie | 5 | |
| `14_decoration/handcrafted_wood` | Decoration · Wooden Furniture / Décoration · Meubles en bois | Handcrafted : chaises, tables, bancs, canapés, lits, placards, étagères… en 11 bois | 165 | |
| `14_decoration/handcrafted_decor` | Decoration · Home Decor / Décoration · Déco de la maison | Handcrafted : coussins, draps, pots, vaisselle, moulures, four, hotte, trophées | 120 | |
| `14_decoration/another_furniture` | Decoration · Cozy Furniture / Décoration · Mobilier douillet | Another Furniture : canapés, tabourets, lampes, rideaux, volets, jardinières | 159 | |
| `14_decoration/factory_blocks` | Decoration · Industrial Blocks / Décoration · Blocs industriels | Factory Blocks : plaques, tuyaux, grilles, ventilateurs, rouille | 49 | |
| `14_decoration/pixelmon_furniture` | Decoration · Pokémon Furniture / Décoration · Mobilier Pokémon | Pixelmon : fauteuils, canapés, tapis, horloges, parasols, bouées, caisses, télés, frigo… | 188 | |
| `14_decoration/pixelmon_blocks` | Decoration · Pokémon Blocks / Décoration · Blocs Pokémon | Pixelmon : bois de baie, pierre de temple, lettres Zarbi et braille, murs, tuiles, enseignes | 144 | |
| `14_decoration/minecraft_decor` | Decoration · Colors & Decor / Décoration · Couleurs et déco | Minecraft : béton, verre, terre cuite, laine, tapis, lits, bannières, bougies, lanternes, briques… | 248 | |

**Décoration — prix = coût du craft.** `tools/pixelgo-economy/deco.mjs` lit les recettes des
jars et calcule ce que coûtent les ingrédients chez les marchands (bûche 80 $ → planche 20 $,
laine 8 $, fer 12 $, aluminium Pixelmon = fer). Acheter un meuble coûte donc autant que ses
pièces : le marchand fait gagner du temps, pas d'argent. Arrondi au-dessus, 2 $ minimum.
Deux ajustements :
- **une couleur ne change pas le prix** : chaque variante coûte comme la moins chère. Les
  colorants marron (cacao) et vert (cactus) valent une culture, 160 $ : sans ce lissage, un
  canapé marron coûterait 9 fois le rouge. Un objet teint ne se revend pas et on ne peut pas
  en retirer le colorant : aucune boucle possible ;
- les objets sans recette (pierres tombales, coins de tuiles, sable Poké…)
  prennent le prix de leur plus proche équivalent.

Exemples : chaise en chêne 21-26 $, table 31 $, canapé 15-41 $, lit 55-105 $, fauteuil Pokémon
46 $, télé 60 $, frigo 90 $, lettre Zarbi 55 $, béton / verre 2 $, lanterne 12 $, bibliothèque
1 555 $ (3 livres = 9 papiers = 9 cannes à sucre), trophée d'Évocateur 45 005 $ (il consomme un
totem). **Achat seul** : la déco dépense l'argent, elle n'en crée jamais. Exclus : les blocs
Pixelmon à fonction (soigneur, PC, machine d'échange, pension, distributeur, boîtes aux lettres).

**Supprimés** : `electronics` (copie exacte des CT + DT), `evtraining` (6 baies déjà à
l'étal), `mints` (menthes déjà chez le marchand EXP), et les fourre-tout `pixelgo_shop`,
`minecraft_blocks_1_2`, `exp_dealer`, dont le contenu est réparti ci-dessus. Aucun prix
n'a changé : 1 176 objets comparés avant / après, 0 différence.

**Marchands de Pixelmon** — laissés à leur place, car les villages, arènes et tours du jar les
appellent par leur chemin. Seuls leurs noms changent dans la Boutique Portable :
Poké Mart · Potions & Care / Poké Balls / Battle Items / TMs (Gen 9) / Curry / Mail,
Day Care · Day Care Blocks, Buyers · Relic Maniac. Les doublons (pierres de la Pension et
des marchands ambulants, blocs de pension des ambulants) sont masqués de la Boutique
Portable par `config/pixelgo_shop-common.toml` ; les PNJ restent en jeu.

Pour placer un marchand en jeu : `/npc` de Pixelmon avec le preset
`pixelgo:shopkeeper/<dossier>/<marchand>`.

## 4 bis. Grille des prix d'achat

### Objets Pokémon — un prix = un temps de farm

Chaque prix d'achat correspond à un **temps de ferme manuelle** (~32 000 $/h, soit ~530 $
la minute). Une île automatisée gagne 70 000 à 300 000 $/h : le même objet lui coûte alors
5 à 10 fois moins de temps.

| Palier | Temps (ferme manuelle) | Objets | $ |
|---|---|---|---:|
| Consommable d'entraînement | < 1 min | +20 EV (×6), +1 IV (×6), vitamines (×6) | 150 / 400 / 100 |
| | 1 à 3 min | EXP XS / S / M Ball, EV aléatoires | 500 / 1 000 / 2 000 / 500 |
| | 3 min | **EV Ball (×6)** — 252 EV d'un coup | **1 500** |
| | 4 à 6 min | Sucreries d'Alcremie, taille aléatoire, paquet de cartes, baie | 2 000 / 2 000 / 1 500 / 200 |
| Amélioration ciblée | 6 min | Menthe (×25), IV aléatoires, niveau aléatoire | 3 000 |
| | 8 à 10 min | EXP L Ball, IV Ball (×6), objet de puissance (×6), Bracelet Macho, objets d'évolution (32), fossile aléatoire | 4 000 / 5 000 / 5 000 / 5 000 / 5 000 / 5 000 |
| | 10 min | Objet tenu (27), Capsule d'Argent, Théière Exceptionnelle | 6 000 / 8 000 / 10 000 |
| | 15 à 20 min | EXP XL Ball, Multi Exp, objet tenu majeur (9), Œuf Chance | 8 000 / 10 000 / 12 000 / 15 000 |
| | 30 à 50 min | Capsule Talent, Nœud Destin, Pièce Rune, Rouleaux (Wushours), Skin Ball / Skin Swapper | 15 000 / 20 000 / 25 000 / 25 000 / 30 000 |
| Objet puissant | 1 h 15 | IV ALL Ball | 40 000 |
| | 3 h | Patch Talent (talent caché) | 100 000 |
| Décisif / prestige | 5 h | Master Ball | 150 000 |
| | 6 h | Capsule d'Or (au-dessus de sa recette : Master Ball + Capsule d'Argent), sac mystère légendaire | 200 000 |
| | 11 h (1 h 30 en fin de partie) | Shiny Ball | 350 000 |
| | 15 h (2 h en fin de partie) | Shiny Swapper — sur n'importe quel Pokémon déjà possédé, sans risque | 500 000 |

Sacs mystère 1 / 2 / 3 / 4 : 2 500 / 7 500 / 25 000 / 200 000. Méta-familier : 10 000.
Contenu des sacs : `tools/pixelgo-loot/README.md` (PixelGO Items v3 et Pokédolls ajoutés le 2026-10-14 par
`bags.mjs` — rien de revendable, le prix des sacs ne peut pas redevenir de l'argent).

Les objets PixelGO (+EV, +IV, niveau, EV/IV aléatoires) tombent de **chaque** Pokémon
sauvage vaincu : la boutique ne sert qu'à viser une stat précise, d'où leurs petits prix.

**CT / DT** : les CT de 7e génération (1 000 à 4 500 $) et les DT de 8e (750 à 4 500 $)
sont ramenées dans la fourchette des CT de 9e génération du Poké Mart (750 à 4 500 $).

**Upgrade Orb** : 5 000 $ par point de pourcentage de réussite (10 000 avant), plafond +25 %
pour 125 000 $. Un chromatique par l'Orbe coûte ~370 000 $ en espérance mais peut détruire
le Pokémon en cas d'échec ; le Shiny Swapper (500 000 $) est la voie sûre.

### Île, fin de partie

| Objet | $ | | Objet | $ |
|---|---:|---|---|---:|
| Botany Pot à entonnoir (voie « argent » du mur) | 400 000 | | Waystone | 5 000 |
| Capsule temporelle | 100 000 | | Totem d'immortalité | 45 000 |
| Composant ultime | 500 000 | | Singularité de baies | 2 500 000 |
| Singularité ultime | 3 500 000 | | Essence créative | 25 000 000 |
| Batterie infinie (Cyclic) | 50 000 000 | | | |

Ces prix-là sont des étapes de progression (le mur des 15 h, la Pierre Philosophale), pas des
consommables : ils restent calés sur le coût du mur (11 680 cultures ≈ 467 000 $).

### Minions — prix = prix de leur craft

> **2026-10-14 : les minions ne sont plus vendus.** Le marchand « Minions · Minions » est supprimé
> (`REMOVE_MATCH` dans `apply.mjs`, entrée retirée de `shops.mjs`). Un minion se crafte, point.
> Le barème ci-dessous ne sert plus que de référence, si on en remettait un en boutique.
>
> **2026-10-24 : les minions ne se craftent plus, ils s'obtiennent par quête.** La recette
> `minion_upgrade` est retirée (`00_removals.js`) ; le chapitre PixelGO Minions (« Minion
> Workshop ») a une quête répétable par palier, qui consomme les quantités de l'ancien craft
> (8 × 10/20/40/64 de la ressource brute, puis 8 × 1/3/8/16/32/64 enchantés), sauf les
> paliers XI et XII, portés à **1 024** et **2 048** enchantés (512 pour le mod), et
> **sans** l'outil ni le minion du palier inférieur. Un palier s'ouvre une fois le
> précédent obtenu. Le barème « Craft » ci-dessous reste juste pour le palier I.
>
> **2026-11-01 : retour au craft.** Les quêtes « Minion Workshop » sont supprimées et
> `minion_upgrade` n'est plus retirée. Avec pixelgo_minions 4.0.0 cette recette ne produit que
> le palier I (barème ci-dessous) ; les paliers suivants s'achètent dans le minion lui-même,
> au coût fixé par le mod (`MinionUpgradeCost`, visible dans JEI).

Un minion de palier I **se crafte** (recette `pixelgo_minions:minion_upgrade`) : 8 × 10 de sa
ressource autour d'un outil en bois (pioche, houe, hache, canne à pêche ou épée). Son prix en
boutique = ces 80 ressources au prix d'achat du marchand + l'outil (10 $), arrondi à 50 $.
L'acheter ne coûte ni plus ni moins que d'en acheter les matériaux.

| Minion | Craft | Prix (avant) | Production palier I | Rapport | Remboursé en |
|---|---|---:|---:|---:|---:|
| Blé | 80 blés | 12 800 (45 000) | 160 blés/h | 6 400 $/h | 2 h |
| Carotte / Canne à sucre | 80 carottes / cannes | 12 800 (45 000 / 180 000) | 330-360 /h | ~14 000 $/h | 1 h |
| Citrouille | 80 citrouilles | 12 800 (45 000) | 75 /h | 3 000 $/h | 4 h |
| Chêne (et autres bois) | 80 bûches | 6 400 (45 000) | 200 bûches/h | 4 000 $/h | 1 h 40 |
| Charbon | 80 charbons | 650 (180 000) | 160 /h | 320 $/h | 2 h |
| Fer | 80 lingots | 950 (180 000) | 141 /h | 424 $/h | 2 h |
| Or | 80 lingots | 1 300 (180 000) | 109 /h | 436 $/h | 3 h |
| **Diamant** | 80 diamants | **3 200 (720 000)** | 83 /h | 828 $/h | **4 h** |
| Émeraude | 80 émeraudes | 2 550 (720 000) | 86 /h | 686 $/h | 4 h |
| Mithril | 80 mithrils | 16 000 (720 000) | 30 /h | 1 500 $/h | 11 h |
| Débris de netherite | 80 débris | 9 600 (45 000) | 20 /h | 600 $/h | 16 h |
| Cobble | 80 pierres | 100 (45 000) | 171 /h | ~0 | — (sert au craft, pas à la vente) |

Tous les autres suivent la même règle (lapis 350, redstone 350, quartz 950, obsidienne 950,
vache 1 600, squelette 350, enderman 1 300, etc.). Leur **cadence** reste celle réglée plus haut
(`speedMultiplier` 0,75), et le palier I ne stocke que 64 objets : le vider régulièrement fait
partie du jeu.

| Équipement / outils | $ |
|---|---:|
| pierre dure → compacteur personnel 7000 | 285 → 396 000 (inchangés) |
| houe débutant → houe de labour ultime | 82 → 217 810 (inchangés) |

### Ferme, Matériaux, Équipement (ancien marchand de blocs) — amorçage avant le mur

**Marge unique** : tout matériau s'achète **4 fois son prix de revente** (plugins : 2 à 5 fois).
Avant, un diamant s'achetait 5 000 $ et se revendait 1 $.

| Matériau | Achat / revente | | Matériau | Achat / revente |
|---|---:|---|---|---:|
| blé, carotte, citrouille… | 160 / 40 | | bûche | 80 / 20 |
| diamant / bloc | 40 / 10 · 360 / 90 | | émeraude / bloc | 32 / 8 · 288 / 72 |
| or / bloc | 16 / 4 · 144 / 36 | | fer / bloc | 12 / 3 · 108 / 27 |
| quartz, obsidienne | 12 / 3 | | charbon, cuivre, poudre lumineuse | 8 / 2 |
| perle de l'Ender | 16 / 4 | | débris de netherite | 120 / 30 |
| redstone, lapis, os | 4 / 1 | | cuir, viande | 20 / 5 |
| cobble, sable, gravier, argile… | 1 / ~0 | | tête de wither squelette, totem | 25 000 / 45 000 (non craftables) |

Le mur des 15 h ne dépend pas du prix du fer : il tient au **Certificat de récolte** (maillages,
pots, générateurs) et aux **items enchantés** (machines Mekanism / EnderIO / Cyclic).

**Utilitaires** (achat seul) — prix = ingrédients au même marchand. Les objets qui ne se
craftent pas (étiquette, carapace, élytres, étoile…) gardent un prix de rareté :

| Objet | $ | | Objet | $ |
|---|---:|---|---|---:|
| Fiole d'expérience | 500 | | Steak | 24 |
| Alambic / Distributeur | 20 / 15 | | Piston / collant | 25 / 30 |
| Observateur | 30 | | Répéteur / Étiquette | 20 / 2 000 |
| Comparateur | 40 | | Entonnoir | 80 |
| Coquille de nautile / Débris antiques | 5 000 / 120 | | Coffre de l'Ender | 150 |
| Pomme dorée | 200 | | Boîte de Shulker | 12 000 |
| Table d'enchantement | 350 | | Enclume | 500 |
| Lingot de netherite | 700 | | Trident / Cœur de la mer | 50 000 |
| Pomme dorée enchantée / Étoile du Nether | 100 000 | | Balise | 150 000 |
| Élytres | 250 000 | | **Œuf de dragon** | 500 000 |

**Pas de livres enchantés** : Pixelmon encode les articles d'une boutique sans accès aux
données du monde, dont font partie les enchantements ; un livre enchanté en boutique
déconnecte le joueur qui l'ouvre (crash du 27/09/2026). Les livres se font à la table
d'enchantement, vendue 350 $.

L'œuf de dragon est unique par monde ; sur un serveur, sans cet achat, un seul joueur pourrait
fabriquer la Breeder Bottle et le Dynamax Quest Giver (`guinimospixelmon`) qui l'exigent.

### Évolution

Pierres d'évolution (×10) et Pierre Stase : 2 100 $. Objets d'évolution par échange ou par
objet (32) : 5 000 $. Voir la grille ci-dessus pour le reste.

### Pokémarts, baies, CT/DT

| Objet | $ |
|---|---:|
| Poké / Super / Hyper Ball | 200 / 600 / 1 200 |
| balls spéciales (Rapide, Sombre, Chrono…) | 1 000 |
| Potion → Guérison | 300 → 3 000 |
| PP Plus / PP Max | 9 800 / 19 800 |
| Baies (toutes, étal de baies) | 200 |
| CT gen 9 / CT gen 7 / DT gen 8 | 750-4 500 / 1 000-4 500 / 750-4 500 |
| Garderie (blocs) | 25 000 |

Revente de tout cela : 1/50 du prix, baies 40 $.

### Distributeur (`config/guinimospixelmon/shoplist.json`)

> **Mod retiré du pack (2026-09-29).** Le dossier `config/guinimospixelmon/` n'existe plus ;
> `apply.mjs` ignore cette section tant que le mod est absent. Les blocs de couleur et de
> construction qu'il vendait sont désormais chez **Décoration · Couleurs et déco** (§4).
> La configuration ci-dessous est conservée dans `backups/economie-2026-09-27/`.

Le bloc « Vending Machine » vend au prix listé et **rachète à la moitié arrondie en dessous**
— un seul chiffre pour les deux sens, impossible à séparer. Conséquence : un objet de valeur
ne peut pas y être vendu (un diamant à 5 000 $ serait racheté 2 500 $, et les tamis en
produisent à l'infini). Le distributeur est donc **le magasin de construction** du serveur ;
les objets de valeur sont chez les marchands (§4), qui vendent sans racheter.

208 articles, 5 pages :

| Rayon | Objets | Prix | Rachat |
|---|---|---:|---:|
| Pierres et terres | cobble, pierre, granite, diorite, andésite (+ polies), pierre lisse, pierre moussue, briques de pierre (×4), ardoise (×5), tuf, calcite, basalte (×3), pierre noire (×3), netherrack, briques du Nether (×2), pierre de l'End (×2), purpur (×2), terre, terre stérile, herbe, podzol, mousse, boue (×2), sable, sable rouge, grès (×4), gravier, argile | 1 | 0 |
| Bois et végétation | 2 tiges du Nether, 11 planches, 7 pousses, 7 feuillages | 1 | 0 |
| | 8 bûches (rachat = barème, 20 $) | 40 | 20 |
| Couleurs | 16 verres teintés, 16 bétons, 16 poudres de béton, 16 terres cuites teintes, 15 teintures (sauf verte, revendue 18 $) | 1 | 0 |
| Verre et glace | verre, vitre, glace, glace compacte, neige | 1 | 0 |
| | 16 laines (rachat = barème, 2 $) | 4 | 2 |
| Utilitaires | torche, échelle, coffre, tonneau, établi, four, échafaudage, lit, laisse | 1 | 0 |
| | arc, arbalète, canne à pêche, TNT, éponge | 1 | 0 |
| | lanterne, bibliothèque, bloc d'os, bloc de slime, bloc de magma | 2 | 1 |
| | prismarine / briques / sombre (= leurs éclats au barème) | 4 / 9 / 8 | 2 / 4 / 4 |

Exclus volontairement : ce qui se revend chez un marchand (cultures, fleurs, teinture verte),
la poudre d'os (elle raccourcirait le mur des 15 h de ferme) et les matières de progression
(minerais, quartz, pierre lumineuse), vendues sans rachat chez les marchands.

---

## 5. Changements effectués

### Données (via `tools/pixelgo-economy/apply.mjs`)

| Fichier | Changement |
|---|---|
| `kubejs/data/pixelmon/.../pixelgo/minecraft_blocks_1_2.json` | revente : silex, argile, slime, neige 40 → 0 ; os, poudre, œil, plume, crème, perle 40 → 1 ; cuir, blaze 40 → 2 ; sucre 45 → 12 ; teinture verte 50 → 18 ; fleurs 15 → 2 ; champignons 40 → 3 ; blocs de champignon 400 → 1 ; melon 90 → 80 |
| `.../pixelgo/berry_shop.json`, `evtraining.json` | baies : revente 150 → 40 |
| `.../pixelgo/exp_dealer.json` | + 43 objets d'évolution |
| `kubejs/data/pixelgo/.../pixelgo_shop.json` | 23 prix d'achat corrigés (§4 bis), + Master Ball, + 56 objets du rayon compétitif |
| `.../pixelgo/minecraft_blocks_1_2.json` (ajouts) | + 26 objets utilitaires (les 9 livres enchantés ont été retirés : crash) |
| `kubejs/data/pixelgo/.../minions_enchanted.json` | 44 items enchantés de générateur retirés ; drops de mob plafonnés (perle 1 521 → 95, blaze / larme 1 521 → 190, crème / slime 380 → 95…) ; champignons 380 → 280 |
| `config/guinimospixelmon/shoplist.json` | distributeur réécrit : 208 articles de construction (§4 bis) |
| `config/guinimospixelmon/rarity.json` | Poke Hunter : Alakazam, Mackogneur, Ectoplasma, Kangourex, Lucario, Tranchodon, Pyrax 5 → 4 ; Roucarnage, Kadabra, Spectrum, Leveinard, Lippoutou, Ymphect, Absol, Drackhaus, Métang, Carmache, Incisache, Diamat, Colimucus, Mimiqui, Kaumalo, Dolman, Superdofin, Cryodo 4 → 3 ; Onix, Excelangue 4 → 2 |
| `kubejs/data/botanypots/recipe/minecraft/crop/*.json` (11, nouveaux) | cultures revendables : `grow_time` 1200 → 2400, drop fixe d'une culture |
| `kubejs/data/mysticalagriculture/recipe/essence/minecraft/*.json` (11, nouveaux) | 3 essences → 3 blés (au lieu de 8), 9 → 4 melons (au lieu de 16), 7 → 7 cannes, 8 → 8 cactus / citrouilles… |
| `config/ProjectE/custom_emc.json` | + 362 objets revendables à EMC 0 (dont cobble, pierre noire, pierre de l'End, pierre dure) |

### Marchands (via `tools/pixelgo-economy/shops.mjs`)

| Fichier | Changement |
|---|---|
| `kubejs/data/pixelgo/pixelmon/npc/preset/shopkeeper/**` | 30 marchands en 14 catégories (§4), gabarit unique, noms « Catégorie · Marchand » |
| `.../shopkeeper/14_decoration/*.json` (7, nouveaux) | 1 073 objets de décoration au coût du craft (`deco.mjs` → `deco.json`) |
| `kubejs/data/pixelgo/.../shopkeeper/{pixelgo_shop,minions_*}.json`, `kubejs/data/pixelmon/.../shopkeeper/pixelgo/*.json` | supprimés : contenu réparti, doublons retirés |
| `kubejs/assets/kubejs/lang/en_us.json`, `fr_fr.json` (nouveau) | noms, accueils et au revoir des PNJ ; noms dans la Boutique Portable (y compris ceux de Pixelmon) |
| `config/pixelgo_shop-common.toml` | `filter` : doublons de Pixelmon masqués dans la Boutique Portable |

### Configs

| Fichier | Clé | Avant → après |
|---|---|---|
| `config/pixelmon/battle.yml` | `pay-day-multiplier` | 5.0 → **0.05** |
| | `g-max-gold-rush-multiplier` | 100.0 → **0.2** |
| `config/pixelgo_minions-common.toml` | `speedMultiplier` | 0.3 → **0.75** |
| | `offline.maxHours` | 72 → **24** (défaut du mod) |
| `config/PowerPots.json` | palier 1 / 2 / 3 (vitesse, rendement) | 2/1, 4/2, 8/4 → **2/1, 3/1,5, 4/2** |
| `config/exdeorum-server.toml` | `simultaneous_sieve_range` / `simultaneous_compressed_sieve_usage` | 3 → **1** / true → **false** |
| `config/excompressum-common.toml` | `autoSieveSpeed` / `autoHeavySieveSpeed` | 0,1 / 0,05 → **0,025 / 0,0125** |
| `config/upgradepokemon.json` | `moneyPerPercent` | 10 000 → **5 000** (100 % ≈ prix du Shiny Swapper) |

`happy-hour-multiplier` et `amulet-coin-multiplier` restent à 2 : ce sont des entiers dans
Pixelmon (1 les désactiverait), et le plafond vient désormais de Pay Day.

### KubeJS

| Fichier | Changement |
|---|---|
| `server_scripts/pixelgo/15_farm_gate.js` §6 | les tamis Ex Deorum ne rendent plus de culture revendable ; carotte, pomme de terre, canne, cactus, verrue remises à **1 %** et graines à 5 % sur les seuls maillages ficelle et silex (tamis simple) — de quoi démarrer un champ, pas de quoi en vivre |
| `server_scripts/pixelgo/55_ticket_horaire.js` | objectif 30 min (valeur de test oubliée) → **60 min** ; le temps n'est crédité que si le joueur a bougé dans les **5 dernières minutes** |
| `assets/kubejs/lang/en_us.json` | quêtes Shiny Ball / Shiny Swapper : elles disaient « la boutique est la seule source » alors que les deux se fabriquent ; prix et recettes indiqués |

---

## 6. Objets difficiles à obtenir en skyblock

Vérifiés un par un contre les recettes, tables de butin, drops, quêtes et boutiques du pack
(`45 784` fichiers de données indexés) :

| Objet | Source trouvée | Décision |
|---|---|---|
| Pierres d'évolution | boutique 2 100 $, éclats, butin | rien à faire |
| Objets d'évolution par échange / par objet (43) | butin et drops aléatoires seulement ; théières, rouleaux, Emblème, sucreries : **aucune** | **ajoutés** au marchand EXP |
| Master Ball | Poke Hunter (légendaire), caisse Master, butin t7+ ; ingrédient du Ticket SSR et de la Capsule d'Or | **ajoutée**, 150 000 $ |
| Fossiles | Fossile aléatoire en boutique (10 000 $), drops 5 % | rien à faire |
| Baies | arbres à baies (feuilles 5 %), boutique | rien à faire |
| Minerais | tamis Ex Deorum après le Certificat, marchand de blocs avant | rien à faire |
| Charme Chroma | recette (8 leurres faibles + 1 fort, baies), Pokédex, sac palier 4 | rien à faire |
| Charme Ovale / Capture / Exp | Pokédex, arbre de talents | rien à faire |
| Vitamines, objets de puissance | recettes du pack | rien à faire |
| Super Bonbon, Bonbons Exp | quêtes (68 M, 50 XL), Poke Hunter, butin, sacs | pas en boutique : retirés volontairement du marchand EXP le 20/09, le niveau se gagne en combat |
| Capsules d'or / d'argent, Capsule / Patch Talent | butin de Portes, drops, sacs ; Capsule d'or craftable ; talent caché via l'Upgrade Orb | pas en boutique : les objets PixelGO (IV, Balls) couvrent le besoin |

---

## 7. Vérifications passées

- **Aucun arbitrage** : sur les 1 085 objets de toutes les boutiques (562 presets, jar Pixelmon
  + overrides), aucun prix de revente ne dépasse le prix d'achat le plus bas ; distributeur
  compris, dans les deux sens.
- **Recettes** : balayage de toutes les recettes (Minecraft, mods, KubeJS) dont la sortie se
  revend. Restent 3 alertes, toutes sous 3 $ (broyeur Cyclic sur TNT / bloc de magma,
  duplication de perle au solidificateur). Les tamis signalés sont neutralisés par
  `15_farm_gate.js` §6.
- **IDs** : les 99 objets Pixelmon ajoutés et la variante `master_ball` existent dans le
  registre Pixelmon 9.4.1 (`tools/pixelgo-pixelloot/catalog-items.txt`, `catalog-balls.txt`) ;
  les 208 objets du distributeur et les 27 objets vanilla du marchand de blocs ont tous un
  modèle d'item dans `1.21.1.jar`.
- **Syntaxe** : `15_farm_gate.js` et `55_ticket_horaire.js` passent `node --check` ; tous les
  JSON modifiés se relisent ; fins de ligne d'origine (CRLF / LF) conservées.
- **Idempotence** : une seconde passe de `apply.mjs` modifie 0 fichier.

---

## 8. À vérifier au prochain lancement

1. `logs/kubejs/server.log` : la suppression par expression régulière du §6 de
   `15_farm_gate.js` doit retirer 70 recettes de tamis et en ajouter 14 (`kubejs:exdeorum/sieve/amorce/*`).
2. EMI : terre au maillage de ficelle → carotte **1 %**, graines 5 % ; aucune culture au
   maillage de fer ni au tamis compressé.
3. `/pixelvalue` sur un silex, une boule de slime : « no listed price » ; sur une baie : 40.
4. Un Botany Pot de blé : un blé toutes les ~110 s, sans graines.
5. Le Poke Hunter charge sans avertissement (`Poke Hunt: … pokémons carregados`).
6. ProjectE : le pain, le blé, les baies n'ont plus de valeur EMC dans l'infobulle.
7. Ticket horaire : rester immobile plus de 5 min fige le compteur (le reprendre en bougeant).

---

## 9. Réglages

- **Revenu de la ferme** : tout est indexé sur 40 $ la culture. Changer cette ancre, c'est
  réviser la table `SELL` d'`apply.mjs` *et* les prix d'achat qui en découlent (minions,
  Botany Pot).
- **Automatisation trop lente / trop rapide** : `grow_time` des 11 fichiers Botany Pots,
  `speedMultiplier` des minions, `config/PowerPots.json`. Ce sont les trois seuls robinets.
- **Pay Day** : `pay-day-multiplier` ; 0,05 met un combat continu sous une ferme manuelle.
- **Nouvel objet revendable** : relancer `apply.mjs`, qui lui retire aussi son EMC (§8 du script).

---

## 10. Relevé hors périmètre (non modifié)

- **Poke Hunter** : le mod appelle `rollHuntList()` toutes les 30 min mais **n'enregistre pas**
  le résultat ; la liste ne change donc qu'à la capture. Correctif possible seulement dans
  le jar (`EventHandler.onServerTick`).
- `config/cogcapturemarket/` : configuration d'un mod absent du dossier `mods/` (fer à 12 $,
  diamant à 250 $). Sans effet tant que le mod n'est pas réinstallé — à supprimer ou à
  réaligner s'il revient.
- `PROGRESSION-TRAME.md` cite des minions à 450 000 $ et une singularité ultime à
  35 000 000 $ ; les boutiques ont été divisées par 10 le 20/09. Les prix en vigueur sont
  ceux de ce document.
- Les CT gen 7 (2 500 à 15 000 $) coûtent 3 à 4 fois les CT gen 9 (750 à 4 500 $) : écart
  hérité de Pixelmon, sans faille (rien ne se revend), laissé tel quel.
- Le distributeur affiche ses textes en portugais et la devise « ₽ » : codé en dur dans le
  mod `guinimospixelmon`.
