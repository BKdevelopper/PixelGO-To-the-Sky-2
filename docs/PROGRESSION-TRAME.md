# PixelGO — To the Sky : audit de la trame principale

Vérification du pack contre la progression voulue, relevé des contournements,
et correctifs appliqués.

> **Prix en vigueur : voir `ECONOMIE.md`** (équilibrage du 27/09/2026). Les montants
> cités plus bas (minions à 450 000 $, singularité à 35 000 000 $…) sont historiques, tout
> comme les chemins des marchands (`pixelgo_shop.json`, `minecraft_blocks_1_2.json`…),
> réorganisés par catégorie dans `kubejs/data/pixelgo/pixelmon/npc/preset/shopkeeper/`.

```
Étape 1  farm manuel        cultiver, vendre, encaisser        (seule source de revenus)
Étape 2  rendement          réinvestir : outils, enchantements
    ——— mur : Certificat de récolte, 11 680 cultures, ~15 h de ferme ———
Étape 3  génération         Ex Deorum (minerais) + Botany Pots (culture auto)
Étape 4  accélération       Click Machine, Item Collector, sacs, Power Pots
         -> Pierre Philosophale -> endgame ProjectE
Annexe   exploration        des ressources et des objets, jamais un raccourci
Objectif financer l'équipe Pokémon pour les Portes de rang S
```

Le §2 est l'audit d'origine. Le **§2 bis** répond à la demande ultérieure :
imposer au moins quinze heures de ferme manuelle avant Ex Deorum.

---

## 1. Verdict

La trame **n'était pas respectée**. Douze contournements ont été trouvés, dont
trois qui annulaient à eux seuls la quasi-totalité du parcours :

| # | Contournement | Étape sautée | Gravité |
|---|---|---|---|
| A | `projecte:philosophers_stone_alt` jamais retirée | 1 → 4, **fin de trame** | critique |
| B | Le butin d'exploration se revendait des centaines de milliers de $ | 1 et 2 | critique |
| C | Le maillage de ficelle donnait déjà tous les minerais au tamis | 3 | critique |
| D | La boîte mystère de palier 1 contenait la moitié de l'étape 3 et 4 | 3 et 4 | forte |
| E | Botany Pots : 245 recettes à base de terre cuite | 3 | forte |
| F | Générateur de cobble : 6 bûches + 2 seaux | 3 | forte |
| G | Collecteur / Relais / Condensateur MK1 sans Pierre Philosophale | 4 + endgame | forte |
| H | Click Machine : pierre + bloc de redstone + boule de slime | 4 | moyenne |
| I | Item Collector : 1 perle de l'Ender + 4 obsidiennes | 4 | moyenne |
| J | Sac à dos Sophisticated : ficelle + cuir + coffre | 4 | moyenne |
| K | Gamme « auto » d'Ex Compressum + tamis/marteau mécaniques, en fer nu | 4 | moyenne |
| L | Ferme automatique d'Industrial Foregoing, en fer et plastique | 3 et 4 | moyenne |

À l'inverse, **trois piliers tenaient déjà très bien** et n'ont pas été touchés :

- les **minions** ne se craftent pas, ils ne s'achètent : l'étape 3 passait déjà
  par l'argent du farm — leur PRIX, lui, était beaucoup trop bas (voir §2 bis) ;
- les **machines Mekanism / EnderIO / Cyclic** sont verrouillées par les items
  enchantés dans `35_machines.js` (160 unités de matière chacun) ;
- les **récompenses de quêtes** ne donnent que 425 000 $ sur tout le pack,
  soit une fraction du coût de la singularité ultime (35 000 000 $).

---

## 2. Le détail, contournement par contournement

### A. La Pierre Philosophale se craftait pour neuf items banals

`00_removals.js` retirait bien `projecte:philosophers_stone`. Mais ProjectE en
publie **deux** : `philosophers_stone` et `philosophers_stone_alt`, même coût
(4 poudres de redstone, 4 poudres de pierre lumineuse, 1 diamant), motif
simplement pivoté. La variante `_alt` restait active.

Conséquence : la recette de fin de trame écrite dans `30_tech.js` — table
Ultime 9×9, 80 items enchantés et une singularité ultime — était décorative. Le
joueur pouvait allumer la pierre dès qu'il avait un diamant, puis ouvrir tout
ProjectE (transmutation, matière noire, condensateurs) sans avoir farmé.

**Correctif** — `15_farm_gate.js` : `rm('projecte:philosophers_stone_alt')`.

> Un audit automatique a comparé les 47 identifiants de suppression du pack aux
> 13 330 recettes présentes dans les jars : `philosophers_stone_alt` était la
> seule vraie omission. Le seul autre identifiant sans cible,
> `pixelmon:pokeball/ball/park_ball`, est mort mais sans effet.

### B. L'exploration payait mieux que la ferme, de trois ordres de grandeur

Trois faits se combinaient :

1. Les marchands livrés par Pixelmon rachètent les « trésors » très cher :
   couronne antique **300 000 $**, statue 200 000, bracelet 100 000, vase
   50 000, or antique 30 000, grosse pépite 20 000, éclat de comète 12 500…
2. Ces objets sont dans les coffres d'exploration du pack : les tables de
   Dungeons Arise en contiennent 8 couronnes, 9 statues, 11 ors antiques,
   13 grosses pépites. Les Portes de donjon en lâchent 2 à 3 par coffre.
3. `pixelgo_shop` est en mode `BLACKLIST` avec un filtre vide : la Boutique
   Portable donne accès aux 91 marchands d'origine depuis n'importe où. Et
   `pixelgosell` est pire : son index (`ShopPriceIndex`) lit **tous** les
   presets du datapack, filtre ou pas — le log du 13/09 affiche
   « Indexed 5785 sellable shop items from 478 NPC presets ». Le bouton
   « tout vendre » vendait donc au prix Pixelmon, où qu'on soit.

Un seul coffre de Porte S rapportait plus de 100 000 $. Une ferme de blé
manuelle en rapporte ~3 000 par cycle. L'étape 1 ne servait à rien.

**Correctif** — les 91 presets de Pixelmon sont réécrits dans
`kubejs/data/pixelmon/pixelmon/npc/preset/shopkeeper/` avec **tous les prix de
rachat divisés par 50** (4 962 prix touchés, 760 Ko). Les prix d'**achat** ne
bougent pas — aucun aller-retour rentable n'est créé. Même traitement pour les
deux boutiques du pack qui rachetaient du butin de donjon : `exp_dealer`
(bonbons Exp, pierres d'évolution) et `mints`.

L'exploration reste payante — une Porte S rapporte maintenant ~3 000 $, soit un
cycle de ferme — mais ne remplace plus la ferme.

> Le diviseur est isolé dans une seule constante : régénérer ces fichiers avec
> `SELL_DIVISOR` à 20 ou à 100 est une affaire de trente secondes (§5).

### B bis. La ferme, elle, ne payait pas

Symétriquement : `minecraft:carrot`, `minecraft:melon`, `minecraft:melon_slice`,
`minecraft:cocoa_beans`, les champignons et les graines avaient un prix de
rachat de **0**. Seuls le blé, la pomme de terre, la citrouille, la canne à
sucre et le cactus se vendaient. La carotte et le melon, deux des trois cultures
citées dans la trame, étaient invendables.

**Correctif** — `pixelgo/minecraft_blocks_1_2.json`, 17 prix posés :

| Récolte brute | $ | Transformation (récompense de l'étape 2) | $ |
|---|---|---|---|
| blé, pomme de terre, **carotte**, citrouille, canne, cactus, fèves de cacao, champignons, verrue | 40 | ballot de foin (9 blés) | 400 |
| tranche de melon | 8 | bloc de champignons (×9) | 400 |
| graines de blé | 10 | **melon-bloc** (9 tranches) | 90 |
| patate toxique | 5 | pain (3 blés) | 140 |
| pissenlit, coquelicot | 15 | patate cuite, teinture verte, sucre | 50 / 50 / 45 |

Chaque transformation rapporte 11 à 25 % de plus que la somme de ses
ingrédients : compacter et cuisiner devient le premier gain de rendement, ce qui
est exactement le propos de l'étape 2. Aucune boucle d'arbitrage n'est ouverte —
tous les prix d'achat restent très au-dessus des prix de rachat.

### C. Le maillage de ficelle donnait déjà tout le tableau périodique

Neuf ficelles (vers à soie + feuillage, disponible la première heure) font un
`exdeorum:string_mesh`. Or, au tamis sur du gravier, ce maillage rend déjà :
fer, or, cuivre, **diamant, émeraude**, lapis, charbon, osmium, étain, plomb,
argent, aluminium, nickel, zinc, iridium, thorium, bore, magnésium. Sur de
l'ardoise concassée, en plus : platine, uranium, lithium.

« À ce stade il a accès à l'ensemble des ressources du jeu » — l'étape 3 —
tombait donc **avant la première vente de blé**.

**Correctif** — `15_farm_gate.js` retire, dans `exdeorum:sieve` et
`exdeorum:compressed_sieve`, toutes les sorties minérales des maillages
**ficelle et silex** (deux expressions régulières, ~200 recettes). Ce qui reste
à ces deux paliers est exactement le nécessaire d'amorçage, vérifié source par
source :

| Source | Reste au maillage ficelle / silex |
|---|---|
| terre | graines de blé, melon, citrouille, betterave, carotte, pomme de terre, canne, bambou, baies, cailloux |
| mousse | les 34 pousses d'arbre |
| gravier | silex, cailloux de pierre / andésite / diorite / granite, stalactite |
| sable | cactus, varech, quartz certus, buisson mort, silex |
| sable des âmes | os, larmes de ghast, verrue du Nether, poudre à canon |
| pierre noire / roche du Nether concassées | cailloux, poudre de blaze, crème de magma, spores |

Les bruts Pixelmon ajoutés par `30_tech.js` (bauxite, silicium, argent, platine,
les trois tumblestones) suivent la même règle : `30_tech.js` a reçu un
`ORE_MESH_FLOOR = 2` qui saute les paliers ficelle et silex.

Le premier minerai passe donc par le **maillage de fer**, dont la recette porte
désormais le Certificat de récolte (§2 bis). Et comme les quatre lingots ne
peuvent alors venir que de la boutique (600 $ pièce) ou d'un coffre, la boucle
voulue se referme : **cultiver → vendre → acheter du fer → tamiser**.

### D. La boîte mystère de palier 1 contenait déjà les étapes 3 et 4

La toute première quête du chapitre *Starter* (attraper un Bulbizarre) donne une
boîte de palier 1 ; les deux suivantes donnent les paliers 2 et 3. Or chaque
boîte tire 1 à 2 objets dans une table qui contenait :

- **palier 1** : tamis, tonneau et creuset Ex Deorum, maillage de fer, Botany
  Pot à entonnoir, générateur de cobble, **Item Collector**, **sac à dos**,
  collecteur ProjectE, fleur d'énergie, cristal d'infusion, panneau solaire ;
- **palier 2** : Power Pot 1, collecteur MK2, fleur d'énergie sombre, piédestal
  d'infusion, maillage doré, générateurs de cobble pierre et fer ;
- **palier 3** : marteaux automatiques, maillage de diamant, Power Pot 2,
  Item Collector avancé, condensateur MK1, **Time in a Bottle**, foreuse laser ;
- **palier 4** : **singularité ultime** — la clé de la Pierre Philosophale, en
  vente 35 000 000 $, tombait d'une boîte à 10 000 000 $ (et chaque boîte peut
  en tirer une du palier au-dessus, donc la chaîne partait du palier 1).

**Correctif** — 55 entrées retirées des quatre tables
(`kubejs/data/loot/loot_table/tier1..4.json`) et remplacées par 45 entrées de
contenu Pokémon (potions, bonbons Exp, bonbons rares, capsules et patchs de
talent, capsules d'argent et d'or, écailles cœur, PP Max, charmes). Les boîtes
restent généreuses, mais dans le registre qui est le leur : l'équipe Pokémon.

Le stockage (tonneaux, coffres, disques, tuyaux, élévateurs, poubelles) et les
objets Pokémon ont été conservés tels quels : ils ne font sauter aucune étape.

### E. Botany Pots : 245 recettes, toutes en terre cuite

Un pot de fleur plus quatre terres cuites — et la terre cuite vient de l'argile
du tonneau Ex Deorum. La culture automatique, cœur de l'étape 3, coûtait donc
quelques minutes de jeu.

Retirer 245 recettes une à une était ingérable et aurait supprimé 240 variantes
purement décoratives. Mais **toutes passent par un `minecraft:flower_pot`**.

**Correctif** — le péage est déplacé sur le pot de fleur : 5 briques + le
Certificat de récolte donnent 4 pots. Une seule recette touchée, les 245
variantes verrouillées d'un coup — et le semoir d'Industrial Foregoing, qui en
demande un aussi, avec elles. Le certificat n'étant pas consommé, les pots
redeviennent bon marché une fois le mur franchi : on retarde l'ouverture de la
culture automatique, on ne taxe pas l'agrandissement de la ferme.

La voie « achat » reste ouverte : le marchand PixelGO vend un pot à entonnoir,
porté de 2 500 à 400 000 $ (§2 bis). Les deux voies de l'étape 3 coûtent
maintenant la même chose, ce qui est exactement ce que dit la trame (« par craft
ou par achat »).

### F. Générateur de cobble : la roue libre du skyblock

6 bûches, 1 verre, 2 seaux — et le cobble devient infini, donc le gravier, donc
le sable, donc tout le tamisage.

**Correctif** — le Certificat de récolte dans la recette du palier bois. Les
paliers supérieurs s'améliorent à partir de lui, ils sont donc couverts.

### G. ProjectE : les trois machines EMC de palier 1 n'exigeaient pas la Pierre

Collecteur MK1 (pierre lumineuse + bloc de diamant + four), Relais MK1
(obsidienne + bloc de diamant) et Condensateur MK1 (coffre alchimique +
diamants + obsidienne) se craftent sans elle. Un collecteur posé contre un
condensateur duplique n'importe quel objet à l'infini : les étapes 3 et 4
devenaient décoratives, et la fleur d'énergie ramassée en boîte de palier 1
accélérait encore le processus.

Les paliers MK2 et MK3 étaient déjà protégés : ils demandent de la matière
noire, donc du carburant aeternalis, donc la Pierre.

**Correctif** — la Pierre Philosophale entre dans les trois recettes de palier 1.
Elle **n'est pas consommée** (`hasCraftingRemainingItem`, comme pour le charbon
alchimique), ce qui garde l'énoncé « la Pierre Philosophale débloque le endgame »
littéralement vrai plutôt que symbolique.

**Mise à jour 2026-11-08** — ProjectE ne génère plus d'EMC : les collecteurs et
relais MK1 à MK3 n'ont plus aucune recette (`00_removals.js`) et sont masqués de
JEI/EMI. L'EMC ne vient plus que d'objets réellement brûlés. Seul le Condensateur
MK1 garde la Pierre dans sa recette. Project Expansion a été retiré du pack ; les
16 paliers de tickets / œufs PixelmonGo utilisent désormais des objets ProjectE
(`TICKET_UPGRADES`, `20_pixelmon.js`).

### H à L. Les accélérateurs de l'étape 4

Toutes ces recettes reçoivent une **récolte** (`#pixelgo:farm_harvest`, 1 440
unités de culture, consommée — voir §3), en remplacement d'un ingrédient banal
du motif. Deux exceptions portent le **Certificat** : l'Item Collector et le sac
à dos sont les deux seuls objets d'étape 4 dont la recette ne touche ni au fer,
ni à l'or, ni au diamant, ni à la redstone — sans lui, ils se fabriqueraient
avant le mur.

| Recette | Avant | Après |
|---|---|---|
| `clickmachine:click_machine` | pierre + bloc de redstone + slime | + récolte |
| `itemcollectors:basic_collector` | perle de l'Ender + 4 obsidiennes | une obsidienne → **certificat** |
| `sophisticatedbackpacks:backpack` | ficelle + cuir + coffre | un cuir → **certificat** |
| `powerpots:power_pot_1/2/3` | 8 blocs de fer / or / diamant | un bloc → récolte |
| `exdeorum:mechanical_sieve` / `mechanical_hammer` | fer nu | + récolte |
| `excompressum:auto_sieve`, `auto_heavy_sieve`, `auto_hammer`, `auto_compressed_hammer`, `auto_compressor` | fer nu | + récolte |
| `tiab:time_in_a_bottle` | or + diamant + horloge | un or → récolte |
| `industrialforegoing:plant_gatherer` / `plant_sower` / `plant_fertilizer` | plastique + châssis | la redstone → récolte |

---

## 2 bis. Le mur des 15 heures

Demande ultérieure : **au moins 15 heures de ferme manuelle avant Ex Deorum.**
Les péages décrits ci-dessus coûtaient 160 unités de culture — une trentaine de
minutes. Trois choses ont dû changer.

### Le Certificat de récolte

Un objet nouveau, `kubejs:harvest_certificate`, tient désormais seul toute la
frontière entre l'étape 2 et l'étape 3.

| | |
|---|---|
| **Coût** | 8 × `#pixelgo:farm_harvest` + 1 × `#pixelgo:farm_seal` = **11 680 unités de culture** |
| **En pratique** | huit ballots de foin enchantés, soit 11 520 blés moissonnés, bottelés puis compactés à la main |
| **Ouvre** | Ex Deorum (maillages fer / doré / diamant), pot de fleur → les 245 Botany Pots + le semoir IF, générateur de cobble, Item Collector, sac à dos |
| **Consommé ?** | **Non.** `containerItem` en fait son propre reste de fabrication : il revient dans la grille à chaque usage |

Le non-consommable est le point important. Le mur doit se franchir **une fois**,
pas à chaque pot de fleur — sinon un Botany Pot coûterait 11 680 cultures et la
ferme ne pourrait plus jamais grandir. C'est un laissez-passer, pas une monnaie.

**D'où sort le chiffre.** Une ferme manuelle mûre — parcelle agrandie à la terre
du tonneau, outils de récolte en zone achetés chez le marchand Minions,
SquatGrow pour forcer la pousse — produit de l'ordre de **800 unités à l'heure**,
temps de replantage, d'attente et d'aller-retour en boutique compris.
11 680 / 800 ≈ **14,6 h**. Un joueur très efficace (1 500/h) tombera vers 8 h, un
joueur tranquille (500/h) vers 23 h.

C'est une estimation, pas une mesure : elle n'a pas pu être jouée. Le curseur
est unique et lisible — le nombre de `H` dans le motif du certificat
(`15_farm_gate.js`, section 0). **Chaque case vaut 1 440 unités, soit ~1 h 45 de
ferme.** Sept cases ≈ 13 h, neuf cases ≈ 16 h.

### Le palier 2 a dû être resserré

`#pixelgo:farm_harvest` contenait cinq items de coûts très différents. Le calcul
« 8 × 1 440 » n'a de sens que si chaque entrée vaut vraiment 1 440 unités. Trois
ont été retirées :

- `enchanted_bread` — 480 blés seulement : il divisait le mur par trois ;
- `enchanted_baked_potato`, `enchanted_cactus_green` — 160 unités + du
  combustible ;
- `enchanted_brown/red_mushroom_block` — les blocs de champignon exigent la
  Toucher de soie, donc une table d'enchantement, donc des diamants : l'entrée
  aurait été morte avant le mur qu'elle est censée garder.

Restent le **ballot de foin** (160 ballots = 1 440 blés) et le **melon-bloc**
(160 blocs = 1 440 tranches), tous deux exactement à 1 440.

### Les deux portes dérobées qu'il fallait fermer en même temps

**Les minions.** Un minion de blé coûtait **4 950 $**, soit 124 blés vendus. Il
automatise la ferme en deux minutes : les quinze heures seraient devenues quinze
heures d'AFK, pas quinze heures de ferme. Les prix sont alignés sur le coût du
certificat (11 680 cultures ≈ 467 000 $ de vente), en gardant les rapports
d'origine entre paliers :

| Palier | Avant | Après |
|---|---|---|
| 45 minions de palier 1 | 4 950 $ | **450 000 $** |
| 16 minions de palier 2 | 19 800 $ | **1 800 000 $** |
| 3 minions de palier 3 (diamant, émeraude, mithril) | 79 200 $ | **7 200 000 $** |

**Le Botany Pot en boutique.** 2 500 $, soit 63 blés — la voie « achat » de
l'étape 3 valait moins d'une minute de ferme. Portée à **400 000 $**, l'équivalent
en argent du certificat. Les deux voies coûtent maintenant la même chose, ce qui
est bien ce que dit la trame : « par craft ou par achat ».

### Un effet de bord qu'il a fallu réparer

Verrouiller le tamisage des minerais a cassé la **Boutique Portable** : sa
recette demandait 4 lingots d'aluminium et du silicium, deux bruts Pixelmon qui
ne s'obtiennent qu'au tamis. Elle serait devenue inaccessible pendant tout le
mur — et avec elle l'étape 2 entière, puisqu'on n'aurait plus rien pu **acheter**.

Elle est refaite en produits de ferme : **8 papiers** (canne à sucre) **+ 1 sceau
de récolte** (160 unités de culture). Le marché s'ouvre donc sur la première
vraie récolte, ce qui en fait le premier jalon de la partie plutôt qu'un blocage.

Vendre, en revanche, n'a jamais eu besoin de cet objet : `/pixelsell` et le
bouton de l'inventaire Pixelmon lisent l'index global des boutiques, vérifié
dans `PixelSellCommand`. Le joueur peut donc encaisser dès la première botte.

### Ce que le joueur fait pendant ces quinze heures

Rien de ce qui précède ne coupe la boucle d'amorçage, vérifiée pas à pas :
terre du tonneau → tamis à la ficelle → graines, carottes, pommes de terre,
canne à sucre → ferme ; cailloux de pierre → cobble → marteau → gravier → sable
→ poudre → argile → creuset en porcelaine → lave ; poudre au tamis → poudre d'os.
L'eau vient du creuset en bois, le combustible du charbon de bois.

Et il a de quoi dépenser : les 19 outils de récolte en zone de la boutique
Minions (82 $ pour la houe de bleu, jusqu'à 9 249 $ pour le couteau à verrues),
le fer à 600 $ le lingot, et le bonus de compactage — bottelage et boulangerie
rapportent 11 à 25 % de plus que la somme des ingrédients. C'est exactement
l'étape 2 : réinvestir la vente dans le rendement.

---

## 2 ter. Le chapitre « The beginning »

Vérification demandée : le chapitre est-il à jour et cohérent ?
**Non, et pas seulement à cause du mur.**

### Ce qui n'allait pas avant même mes changements

Le chapitre était **à moitié réécrit**. Les textes des quêtes vivent dans
`config/ftbquests/quests/lang/en_us.snbt` ; certains avaient été remplacés par
des textes riches écrits en clair (les maillages silex à netherite, les
marteaux, le ver à soie, la poussière, l'eau…), les autres pointaient encore
vers les anciennes clés `{quest.for_the_beginning.description.N}` du pack
1.16.5 — **décalées d'un cran**.

Résultat : dix-sept quêtes affichaient en jeu le texte d'une autre quête.

| Quête | Texte réellement affiché |
|---|---|
| First Logs | « Use Crook to destroy leaves and collect Silkworm. » |
| The Crook | « Place the Mesh on the Sieve. » |
| String Mesh | « Thanks to the sieve you will get your first resources. » |
| Netherite Mesh | « The Heavy Sieve is used to sift the compressed blocks. » |
| Heavy Sieve | « The barrel allows you to transform blocks. » |
| **The Barrel** | *(vide)* |
| First Bucket | « Use silkworm and sapling on barrel to obtain dirt. » |
| Dirt from Nothing | « Use water and dust on barrel to obtain clay. » |
| Clay | « …craft the void portal to go into overworld. » *(portail qui n'existe plus)* |
| Obsidian | « The hammer transforms the basic blocks: Cobblestone → Gravel… » |
| Stone Hammer | « To transform the blocks more quickly, use the Compressed Hammer. » |
| Compressed Stone Hammer | « This crucible is an improvement of the wooden crucible. » |
| Lava at Last | « It is a miniature and automatic culture farm. » |
| Hopper Botany Pot | « You will need a lot of cobblestone for your early game. » |
| Cobblestone Generator | « sneak right click on the dirt » |
| Mob Catcher | « sneak right click on blackstone » |

Une seule quête tombait juste par hasard (le creuset en bois).

Autre défaut structurel : **le maillage de diamant n'avait aucune dépendance**.
Il flottait dans le vide au lieu de suivre le maillage doré, ce qui cassait la
lecture de la chaîne des tamis.

### Ce qui a été fait

**Les dix-sept descriptions sont réécrites**, en clair et dans le style des
quêtes déjà reprises (sous-titre, intertitre `&6&l…&r`, puces, `&e&lTip:&r`).
Elles disent maintenant ce que fait vraiment la quête à laquelle elles sont
attachées — et, quand c'est le cas, qu'elle est derrière le mur.

**La chaîne des maillages est réparée** : ficelle → silex → fer → doré →
diamant → netherite.

**Une branche « ferme » de neuf quêtes** est ajoutée à droite du chapitre, en
`x = 9` à `10,5`, là où rien ne se trouvait. C'est elle qui explique la trame au
joueur :

```
String Mesh
    │
    ├─ First Seeds .............. 64 graines de blé
         │
         ├─ A Real Field ........ 64 blés          ──┐
              │                                      ├─ Your Only Income  (info : comment vendre, combien vaut quoi)
              ├─ The Enchanted Crop ... 160 blés     │
              │    │                                 │
              │    ├─ The Portable Shop .. 8 papiers + 1 culture enchantée
              │         │
              │         └─ Reinvest ...... la houe de bleu, 82 $
              │
              └─ Bale It ......... 16 ballots
                   │
                   └─ The Enchanted Bale ... 160 ballots = 1 440 blés
                        │
                        └─ ★ THE HARVEST CERTIFICATE ★
                             │
                             ├─ Iron Mesh
                             ├─ Botany Pot
                             └─ Cobblestone Generator
```

La quête **Your Only Income** est une simple coche : elle n'a rien à fabriquer,
elle sert uniquement à poser les règles de l'économie — le bouton de vente,
`/pixelsell`, le prix de chaque culture, le bonus de compactage, et le fait que
le butin d'exploration ne paie volontairement presque rien.

La quête **The Harvest Certificate** annonce les 11 680 cultures, les ~15 heures,
le fait que le certificat n'est pas consommé, ce qu'il ouvre, et la voie
alternative par l'argent (minion à 450 000 $, Botany Pot à 400 000 $).

**Trois quêtes existantes déclarent maintenant le certificat en dépendance** :
Iron Mesh, Botany Pot et Cobblestone Generator. Le joueur voit donc le mur dans
le livre avant de le rencontrer dans l'établi.

### Langue

Le livre de quêtes de ce pack est **en anglais** (`options.txt` est sur `en_us`,
et les 4 131 quêtes existantes sont rédigées en anglais). Les neuf nouvelles
quêtes et les dix-sept réécritures suivent cette langue pour rester homogènes.
Si tu veux le chapitre en français, tout est regroupé dans
`config/ftbquests/quests/lang/en_us.snbt` — ou dans un `fr_fr.snbt` à côté.

### Vérifications passées

- 4 158 identifiants de quêtes, de tâches et de récompenses : **aucun doublon** ;
- accolades et crochets équilibrés dans le chapitre et dans le fichier de texte ;
- **aucune dépendance orpheline** ;
- plus aucune quête du chapitre ne pointe vers les anciennes clés.

---

## 2 quater. Langue et mise en forme

### Audit de langue

Le pack tourne en `en_us` (`options.txt`) et les 4 131 quêtes sont en anglais.
Trois poches de français traînaient dans ce que lit le joueur :

| Où | État |
|---|---|
| `kubejs/client_scripts/pixelgo/tooltips.js` | **intégralement en français** — les ~90 infobulles du pack : pots de culture, générateurs de cobble, nourriture, disques, Refined Storage, tickets, Aura |
| Nom de l'objet que j'avais créé | « Certificat de récolte » |
| 4 messages de jeu | « Invocation en recharge — encore X s. », « Ticket en recharge — … », le préfixe « Méga- » |

Tout est repassé en anglais. Vérification automatique sur l'ensemble du livre de
quêtes et des chaînes de script destinées au joueur (accents + vocabulaire
français, hors « Pokémon ») : **0 ligne restante**. Et **0 séquence `&` ou `§`
invalide** sur les 3 000 lignes de texte.

Les commentaires de code restent en français — ils s'adressent à toi, pas au
joueur, et le reste du pack est écrit comme ça.

### L'objet Certificat

| | |
|---|---|
| Nom | `§dHarvest Certificate` (magenta, comme les objets de palier du pack) |
| Rareté | `epic` |
| Pile | 1 |
| Texture | `kubejs/assets/kubejs/textures/item/harvest_certificate.png` — parchemin 16×16 avec sceau de cire |
| Infobulle | coût, ce qu'il ouvre, et la mention **« Never consumed »** en vert |

### Charte de mise en forme des quêtes

Les 28 quêtes du chapitre suivent maintenant la même grammaire visuelle :

```
&7&oPhrase d'ambiance en italique gris.&r     <- une ligne, donne le ton
                                              <- ligne vide
&6&lTitre de section&r                        <- or gras
&8· &fitem &8→ &7explication                  <- puce grise, item en blanc
                                              <- ligne vide
&c&lAvertissement.&r                          <- rouge gras : ce qui bloque
&a&lBonne nouvelle.&r                         <- vert gras : ce qui débloque
&e&lTip:&r &7conseil                          <- jaune gras : toujours en dernier
```

Le code couleur est constant d'une quête à l'autre :

| Couleur | Usage |
|---|---|
| `&6` or | titres de section |
| `&7` gris | corps de texte |
| `&f` blanc | noms d'objets |
| `&e` jaune | chiffres et quantités (`&e&l11 680&r`) |
| `&a` vert | argent, gains, ce qui est débloqué |
| `&c` rouge | murs, blocages, avertissements |
| `&8` gris foncé | puces, notes secondaires |
| `&d` magenta | le Certificat de récolte |
| `&b` cyan | objets enchantés et paliers techniques |

Deux quêtes reçoivent une forme distinctive pour servir de repère visuel dans la
page : le **Certificat** est un `gear` en taille 1,5, et **Your Only Income**,
qui n'a rien à fabriquer, prend le `square` déjà utilisé par les panneaux
d'information du pack.

---

## 2 quinquies. Le sommaire en dégradé

Le sommaire du livre — six groupes, trente chapitres — était en couleurs
plates (`&e` et `&6`). Il passe en dégradés véritables.

### Ce qui rend le dégradé possible

FTB Library ne se limite pas aux seize couleurs du chat. Son
`TextComponentParser` teste le caractère qui suit un `&` : si c'est `#`, il
lit six chiffres hexadécimaux et appelle `TextColor.parseColor`. Vérifié au
bytecode (`parse0`, offset 285 : `bipush 35` puis `arraycopy` de 6
caractères). Autrement dit :

```
&#RRGGBB   couleur libre, 16 millions de teintes
&z         texte arc-en-ciel animé (RainbowTextColor)
```

Un dégradé s'écrit donc en préfixant **chaque caractère** par sa propre
couleur. Inutile de passer par un générateur en ligne : le script
`gradient.js` interpole en HSL, ce qui donne une transition régulière là où
une interpolation RVB traverse des gris ternes.

`Style.withColor` ne réinitialise pas les autres attributs, contrairement aux
codes hérités `§` : un `&l&n` posé en tête reste actif sur tout le dégradé.

### La charte chromatique

Les six groupes parcourent une roue chromatique complète, du vert de la ferme
jusqu'à l'or de la fin de partie. La couleur d'un chapitre indique donc sa
place dans la progression.

| Groupe | Teintes | Du … au … |
| --- | --- | --- |
| `-=[ STARTING OFF ]=-` | vert → émeraude | `#8FF55C` → `#19F097` |
| `-=[ TECHNOLOGY ]=-` | cyan → azur | `#5CF5E0` → `#1997F0` |
| `-=[ DIMENSIONS ]=-` | bleu → violet | `#5C82F5` → `#7D19F0` |
| `-=[ PIXELMON ]=-` | violet → magenta | `#C75CF5` → `#F019B0` |
| `-=[ MAGIC ]=-` | rose → rouge | `#F55CAD` → `#F01920` |
| `-=[ END GAME ]=-` | or → orange brûlé | `#F5CE5C` → `#F04419` |

Les en-têtes sont en gras **et** soulignés (`&l&n`), encadrés par `-=[ ]=-`,
et saturés à 88 %. Les chapitres reprennent la plage de teintes de leur
groupe mais plus clairs et moins saturés (luminosité 78 → 63 %, saturation
70 %), précédés d'un tiret : la hiérarchie se lit sans lire les mots.

Quatre chapitres gardent leur gras parce que le pack les met en avant :
*Ender IO*, *PixelGO Gates*, *Poké Balls*, *The Ball Line*. *Welcome*, seul
hors groupe, reçoit un dégradé or indépendant.

### Un point technique qu'il a fallu contourner

Vingt-six des trente titres n'étaient pas des littéraux mais des
substitutions — `{quest.storage.title.1}` — résolues depuis
`kubejs/assets/kubejs/lang/en_us.json`. Or le parser traite une substitution
comme un bloc : il applique le style courant au composant entier, donc un
dégradé ne peut pas la traverser. Les titres ont été résolus et écrits en
littéral dans `lang/en_us.snbt`. Les clés du JSON KubeJS restent en place,
elles servent encore aux titres de quêtes.

Au passage, deux corrections de nom : *The beginning* → **The Beginning**, et
*Pokedex* → **Pokédex**.

### Vérifications

- 6 953 séquences `&` contrôlées dans le livre entier, **0 invalide**
- 30 titres de chapitre, 30 identifiants uniques, aucun chapitre sans titre
- 6 titres de groupe, 36 titres en dégradé au total
- 0 substitution `{…}` restante dans un titre
- accolades SNBT équilibrées
- le script est idempotent : une seconde passe redonne le même fichier

---

## 2 sexies. Le retrait d'Industrial Foregoing

Le mod a été retiré du pack après coup. Sept recettes KubeJS le nommaient et
échouaient au chargement. Deux traitements selon le rôle de la référence.

### Substitution — la recette doit continuer d'exister

Mekanism fournit tous les équivalents, ce qui évite d'inventer des
ingrédients ou d'affaiblir les recettes concernées.

| Recette | Avant | Après |
| --- | --- | --- |
| `kubejs:pink_slime_block` | 9 × `pink_slime_ingot` | 8 `slime_ball` + `#c:dyes/pink` |
| Étoile du Nether (table tier 3) | `pink_slime_ingot` | `mekanism:ingot_refined_obsidian` |
| Cuve créative Mekanism | `sludge_bucket` | `mekanism:nutritional_paste_bucket` |
| Cuve créative Mekanism | `pink_slime_bucket` | `mekanism:lithium_bucket` |
| `projectexpansion:basic_emc_link` | `industrialforegoing:plastic` | recette supprimée (mod retiré 2026-11-08) |
| Boîte mystère palier 2 | `industrialforegoing:plastic` | `mekanism:hdpe_sheet` |

Les six items de remplacement ont été vérifiés un par un dans les jars
(présence du modèle `assets/<ns>/models/item/<id>.json`).

### Mise sous condition — l'objet n'existe plus

La récolteuse, le semoir et le fertiliseur étaient les trois accélérateurs de
l'étape 4 côté ferme automatique. Plutôt que de les effacer, leurs recettes
passent derrière `Platform.isLoaded('industrialforegoing')` — méthode
confirmée sur `PlatformWrapper` du jar KubeJS. Même traitement pour le
retrait des six outils infinis dans `00_removals.js`.

Conséquence : plus aucune erreur sans le mod, et **le péage se remet en place
tout seul** si tu réinstalles Industrial Foregoing un jour. Rien à réécrire.

La trame n'en souffre pas : l'étape 4 garde les Botany Pots à entonnoir, les
Power Pots, la Click Machine, l'Item Collector et Time in a Bottle.

### Deux dégâts collatéraux réparés

Le péage sur `minecraft:flower_pot` verrouillait aussi le semoir d'IF — le
commentaire qui l'expliquait était devenu faux, il a été corrigé.

Surtout, la quête `663F24AECB749138` du chapitre *Storage* demandait
l'**Infinity Backpack** d'IF. FTB Quests l'avait déjà dégradée en
`ftbquests:missing_item` : tâche impossible, chapitre bloqué. Elle demande
maintenant `sophisticatedbackpacks:survival_infinity_upgrade`, qui est
exactement le même objectif — un sac sans limite — avec un mod présent. Sa
description (« The backpack can be improved with different upgrades ») reste
juste, et ses récompenses ne bougent pas.

Une entrée EMC morte (`industrialforegoing:plastic`) a été retirée de
`config/ProjectE/custom_emc.json`.

### Vérifications

- 20 scripts KubeJS contrôlés à la syntaxe, **0 en erreur**
- les 6 items de substitution présents dans les jars
- les 3 recettes IF entièrement contenues dans le `if`, aucune référence
  laissée dehors
- `storage.snbt` équilibré, `custom_emc.json` et `tier2.json` JSON valides
- restent 4 `missing_item` dans `gates.snbt`, **antérieurs** et étrangers à
  Industrial Foregoing — à traiter séparément si tu veux

---

## 3. Le mécanisme de péage

Les verrous s'appuient sur les items « enchantés » de **PixelGO Minions**. La
recette `pixelgo_minions:enchanted` est une `CustomRecipe` d'établi ordinaire :
5 cases de 32, soit **160 unités** de la matière première, pour un item
enchanté. Vérifié dans le jar : `EnchantedRecipe extends CustomRecipe`, et la
table `ENCHANTED_OF` mappe bien `enchanted_hay_bale → minecraft:hay_block`,
`enchanted_seeds → minecraft:wheat_seeds`, etc.

Ces items ont trois propriétés qui en font un sceau parfait :

1. **aucun marchand ne les vend** (le marchand `minions_enchanted` ne fait que
   les racheter) — ils ne peuvent venir que de la récolte du joueur ;
2. **ils ne sont pas rentables à la revente** : 160 blés valent 6 400 $ à la
   pièce contre 95 $ une fois enchantés. Le sceau est un pur puits, jamais un
   raccourci économique ;
3. **le pack s'en sert déjà** (`35_machines.js`) pour verrouiller Mekanism,
   EnderIO et Cyclic : le correctif prolonge une mécanique existante au lieu
   d'en inventer une.

Trois objets, de trois natures différentes :

**`#pixelgo:farm_seal`** — 160 unités d'une culture **brute**. Sert d'apport au
certificat et à la Boutique Portable.
> blé · carotte · pomme de terre · graines · tranche de melon · citrouille ·
> canne à sucre · cactus · fèves de cacao · verrue du Nether · champignons

**`#pixelgo:farm_harvest`** — **1 440 unités**, sous forme compactée. Coût
courant, consommé, des accélérateurs de l'étape 4.
> ballot de foin (160 ballots = 1 440 blés) · melon-bloc (160 blocs = 1 440 tranches)

**`kubejs:harvest_certificate`** — le mur. 8 récoltes + 1 sceau = 11 680 unités.
**Non consommé** : fabriqué une fois, il ouvre l'étape 3 pour toute la partie.

Le reste de l'étape 4 n'a pas besoin du certificat : Click Machine, Power Pots,
tamis et marteau mécaniques, gamme auto d'Ex Compressum, Time in a Bottle et les
machines agricoles d'Industrial Foregoing demandent tous du fer, de l'or, du
diamant, de la redstone ou du plastique — donc le maillage de fer, donc le
certificat. L'ordre est garanti par transitivité. Les deux seules exceptions,
l'Item Collector (perle + obsidienne) et le sac à dos (ficelle + cuir + coffre),
portent le certificat directement.

---

## 4. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `kubejs/server_scripts/pixelgo/15_farm_gate.js` | **nouveau** — tous les péages, priorité 95 |
| `kubejs/startup_scripts/pixelgo_items.js` | + le Certificat de récolte (`containerItem`, non consommé) |
| `kubejs/assets/kubejs/textures/item/harvest_certificate.png` | **nouveau** — sprite 16×16 |
| `kubejs/server_scripts/pixelgo/40_tags.js` | + les deux tags de sceau |
| `kubejs/server_scripts/pixelgo/30_tech.js` | `ORE_MESH_FLOOR` : bruts Pixelmon à partir du maillage de fer |
| `kubejs/server_scripts/pixelgo/10_minecraft.js` | Click Machine et Power Pots déplacés vers `15_farm_gate.js` |
| `kubejs/data/loot/loot_table/tier1..4.json` | −55 entrées de machines, +45 entrées Pokémon |
| `kubejs/data/pixelgo_shop/recipe/portable_shop.json` | recette refaite en produits de ferme |
| `.../shopkeeper/pixelgo/minions_minions.json` | 64 prix de minions × 91 |
| `.../shopkeeper/pixelgo/pixelgo_shop.json` | Botany Pot 2 500 → 400 000 $ |
| `.../shopkeeper/pixelgo/minecraft_blocks_1_2.json` | 17 prix de rachat agricoles |
| `.../shopkeeper/pixelgo/exp_dealer.json`, `mints.json` | rachat ÷ 50 |
| `.../shopkeeper/{pokemart,daycare,utility,wild}/**` | **91 fichiers nouveaux** — rachat ÷ 50 |
| `config/ftbquests/quests/chapters/for_the_beginning.snbt` | +9 quêtes de ferme, 3 dépendances vers le certificat, chaîne des maillages réparée |
| `config/ftbquests/quests/lang/en_us.snbt` | 17 descriptions réécrites, 28 quêtes remises en forme (titre + sous-titre + description) |
| `config/ftbquests/quests/lang/en_us.snbt` | 36 titres de chapitre et de groupe passés en dégradé `&#RRGGBB` |
| `config/ftbquests/quests/chapters/storage.snbt` | quête *Infinity Backpack* repointée sur Sophisticated Backpacks |
| `config/ProjectE/custom_emc.json` | 1 entrée EMC morte retirée |
| `kubejs/client_scripts/pixelgo/tooltips.js` | ~90 infobulles traduites du français vers l'anglais |
| `kubejs/server_scripts/custom_item/{mega_key,ssr_ticket}.js`, `50_interactions.js` | 4 messages de jeu traduits |

La priorité 95 de `15_farm_gate.js` est délibérée : inférieure à 100, le script
passe après `10_minecraft` et `30_tech` et peut donc retirer aussi bien les
recettes des mods que celles du pack ; supérieure à 90, `35_machines`
(`replaceInput`) travaille ensuite sur le résultat, comme avant.

---

## 5. Réglages

**La durée du mur.** Un seul curseur : le nombre de `H` dans le motif du
certificat, `15_farm_gate.js` section 0. Chaque case vaut 1 440 unités de
culture, soit **~1 h 45 de ferme manuelle**.

| Cases `H` | Coût | Durée estimée à 800 u/h |
|---|---|---|
| 6 | 8 800 | ~11 h |
| 7 | 10 240 | ~13 h |
| **8 (actuel)** | **11 680** | **~15 h** |
| 9 | 13 120 | ~16 h |

Si le mur bouge, **bouger les prix des minions avec** : ils sont la voie
« argent » du même palier. La correspondance est 1 unité de culture ≈ 40 $.

**Rendre l'exploration plus ou moins payante.** Le diviseur des prix de rachat
est une constante unique (`SELL_DIVISOR = 50`). Régénérer les 91 presets depuis
`Pixelmon-1.21.1-9.4.0-universal.jar`,
`data/pixelmon/pixelmon/npc/preset/shopkeeper/**` : 20 = exploration plus
payante, 100 = moins.

**Fermer aussi la Boutique Portable sur les marchands d'origine.** Si les 91
pokemarts accessibles de partout gênent, passer `config/pixelgo_shop-common.toml`
en `WHITELIST` avec `filter = ["pixelgo:preset/shopkeeper/*"]`. Ce réglage
n'affecte **que** l'écran d'achat : le bouton « tout vendre » lit l'index
complet, c'est pourquoi le correctif principal porte sur les prix eux-mêmes.

---

## 6. À vérifier en jeu

Rien n'a pu être lancé ici — ce sont des vérifications de démarrage, par ordre
d'importance :

1. **Le Certificat ne doit PAS être consommé.** C'est le point le plus fragile
   du correctif : il repose sur `containerItem` de l'`ItemBuilder` KubeJS
   (présent dans le jar, signature `containerItem(ResourceLocation)`).
   Fabriquer un pot de fleur et vérifier que le certificat revient dans la
   grille. S'il disparaît, chaque Botany Pot coûterait 11 680 cultures — il
   faudrait alors repasser les péages sur `#pixelgo:farm_harvest`.
2. `logs/kubejs/server.log` au premier chargement : les deux `event.remove`
   par expression régulière du §C doivent retirer ~200 recettes sans erreur.
3. Dans EMI/JEI : tamiser du gravier avec un maillage de ficelle ne doit plus
   proposer aucun minerai ; `exdeorum:iron_mesh` doit afficher le certificat.
4. `projecte:philosophers_stone` ne doit plus avoir qu'une seule recette,
   celle de la table Ultime.
5. La Boutique Portable doit être fabricable dès la première récolte
   (8 papiers + 1 sceau) — sinon l'étape 2 est bloquée.
6. Le bouton « tout vendre » sur une couronne antique doit annoncer 6 000 $ et
   non 300 000.
7. Les 245 recettes de Botany Pots doivent toutes remonter au pot de fleur
   verrouillé (vérifier l'arbre d'utilisation dans EMI).
8. Le chapitre **The beginning** doit s'ouvrir sans erreur et afficher la
   colonne « ferme » à droite. Vérifier surtout que les dix-sept descriptions
   réécrites correspondent bien à leur quête — c'est précisément ce qui était
   cassé avant.
