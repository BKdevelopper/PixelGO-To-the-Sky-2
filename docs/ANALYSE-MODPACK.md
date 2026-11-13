# PixelGO — To the Sky 2 : analyse complète et plan d'amélioration

*Analyse du 11/11/2026, faite sur l'instance locale (221 mods, NeoForge 21.1.265, MC 1.21.1), les logs du dernier lancement, la page publique du pack et les packs concurrents.*

---

## 0. En bref : les 12 actions qui rapportent le plus

| # | Action | Pourquoi | Effort |
|---|---|---|---|
| 1 | **Ajouter 8 à 12 captures d'écran** à la galerie CurseForge | La galerie est **vide** (0 image). C'est le 1er frein au téléchargement | 1 h |
| 2 | **Renommer le pack avec les mots-clés** « Pixelmon » et « Skyblock » | La recherche CurseForge se base surtout sur le titre et le résumé | 5 min |
| 3 | **Réécrire le résumé et la description** autour des vraies exclusivités (Minions, Portes Solo Leveling, Ligue, Tour de combat…) | Le résumé actuel contient des fautes (« pokemons », « with mod tech ») et décrit des systèmes qui n'existent plus | 2 h |
| 4 | **Corriger 28 tables de butin cassées** (`set_nbt`) | Les coffres de 28 structures Dungeons Arise sont **vides** en jeu | 30 min |
| 5 | **Retirer ou remplacer les musiques sous copyright** | Risque de retrait du pack par CurseForge ou de DMCA | 1 h |
| 6 | **Régler les conflits de touches** (K, V, G, N, B, C) | Jusqu'à 9 actions sur la même touche : c'est la 1re impression du joueur | 1 h |
| 7 | **Activer les packs de ressources par défaut** | 8 packs sont livrés mais **aucun n'est activé** dans `options.txt` | 5 min |
| 8 | **Ajouter ModernFix, AllTheLeaks, spark, Clumps** | Chargement plus court, moins de RAM, base de tout pack FTB/ATM | 30 min |
| 9 | **Supprimer Integrated Dynamics/Terminals/Tunnels** | Aucun lien avec les quêtes, aucun verrouillage : c'est un contournement possible de la trame | 15 min |
| 10 | **Traduire les quêtes en français** (et idéalement espagnol / portugais) | `fr_fr.json` contient **0** texte de quête alors que le pack est français | 1 à 2 j |
| 11 | **Publier des mises à jour régulières avec un changelog lisible** | La dernière version en ligne date du 25/10, alors que beaucoup de changements ont été faits depuis | continu |
| 12 | **Faire une bande-annonce de 60 s + des clips courts** (TikTok, Shorts) | C'est ce qui fait décoller les packs Pokémon en 2025-2026 | 1 j |

---

## 1. État des lieux

### 1.1 Les chiffres

| Élément | Valeur |
|---|---|
| Version | Minecraft 1.21.1, NeoForge 21.1.265, Pixelmon 9.4.2 |
| Mods | 221 jars (636 Mo), **tous hébergés sur CurseForge** (export propre) |
| Mods maison (Kyusama) | 24 (Minions, Dungeon/Portes, Shop, Sell, Battle Tower, NPC, Expedition, Dimension, Items, Balls, Radar, Pokénav, AutoBattle…) |
| Quêtes | ~717 quêtes, 35 chapitres, 6 groupes |
| Langues des quêtes | en_us complet, zh_cn partiel (628 lignes), **fr_fr : 0 quête** |
| Scripts KubeJS | 21 scripts serveur, 2 client, 2 startup |
| Packs de ressources livrés | 8 (Faithful Pixelmon x32, Glowing Ores, OST, Better Leaves, Dark Mode…), **aucun activé** |
| Shaders | Iris installé, **aucun shader livré** |
| Chargement jusqu'au menu | ~2 min 10 |
| Chargement d'un monde | +31,6 s rien que pour le plugin JEI d'Advanced Loot Info |
| Mises à jour disponibles | 6 (Moog's Structure Lib, ATi Structures, MSS, MVS, NeoOrigins, Puffish Skills) |
| Page CurseForge | ~10 000 téléchargements, **0 image en galerie**, dernière version v2.5 (25/10/2026) |
| Pack précédent (1.16.5) | PixelGO - To the Sky : mise en avant de « 900 quests » sur la page |

### 1.2 Ce qui est déjà au niveau des gros packs

- **Le contenu exclusif.** 24 mods maison, c'est rarissime. Minions façon Hypixel, Portes façon Solo Leveling, Tour de combat, Ligue avec un boss final, Expéditions, Rival, origines reliées aux arbres de compétences : aucun pack Pixelmon concurrent n'a autant de systèmes propres.
- **L'économie documentée** (`ECONOMIE.md`, `PROGRESSION-TRAME.md`). Les packs FTB fonctionnent exactement comme ça : une trame, des murs de progression, des contournements bouchés.
- **Les quêtes stylées** (dégradés de couleur, chapitres groupés, sans recettes grâce à JEI).
- **La performance de base** : Sodium, Lithium, FerriteCore, ImmediatelyFast, Entity Culling sont présents.
- **Le menu principal** (FancyMenu) : boutons personnalisés, fond pixel art, musique.
- **Les outils de génération** (`tools/`) : ça permet de tout régénérer proprement après une mise à jour.
- **Le partenariat d'hébergement** (bannière Shockbyte avec code promo) : comme les packs FTB/ATM avec leurs hébergeurs.

---

## 2. Ce que font les gros modpacks (et ce qu'il faut leur prendre)

### 2.1 FTB (Skies 2, StoneBlock 4, Evolution) et ATM10

| Ce qu'ils font | PixelGO aujourd'hui | À faire |
|---|---|---|
| Une **galerie de 10 à 20 captures** + une vidéo | 0 image | Voir §5 |
| **Résumé d'une ligne avec les mots-clés** (« Skyblock », « Quests », « Tech ») | Résumé avec fautes | Voir §5.2 |
| Un **changelog par version**, lisible par un joueur | Peu visible | Voir §5.5 |
| **Server pack** publié sur chaque version | Oui (ServerPackCreator) | Le publier comme fichier « Server Pack » rattaché sur CurseForge |
| **FTB Essentials / FTB Ranks** pour les serveurs (homes, /back, /spawn, /tpa, permissions) | Absents | Ajouter (côté serveur, voir §3.2) |
| **spark** livré pour le diagnostic de lag | Absent | Ajouter |
| **ModernFix / AllTheLeaks** (ATM10) | Absents | Ajouter |
| **Crash Assistant** (ATM10) : fenêtre claire au crash, envoi du log en un clic | Absent | Ajouter, très utile pour le support |
| **Better Compatibility Checker** : version du pack affichée dans le menu, avertissement si client et serveur ne sont pas à la même version | Absent | Ajouter |
| **Raccourcis clavier sans conflit** au premier lancement | 78 touches non assignées mais beaucoup de conflits | Voir §4 |
| **Écran de chargement de marque** | Écran Mojang/NeoForge standard | Drippy Loading Screen (voir §6) |
| **Quêtes d'introduction courtes** qui donnent une récompense dans les 5 premières minutes | Chapitre « For the Beginning » + « Starter » | Vérifier que la 1re récompense tombe en moins de 5 min |
| Rythme : **première automatisation en 1 à 3 h** | Mur de ~15 h de farm manuel (voir §7) | À reconsidérer |

### 2.2 Les packs Pokémon qui marchent

- **The Pixelmon Modpack** (officiel) : environ 19,8 M de téléchargements selon un classement tiers. Il gagne parce qu'il est **le point d'entrée par défaut** : nom = mot-clé, installation en un clic, peu de mods.
- **COBBLEVERSE** (Cobblemon, 1.21.1) : environ 5,5 M de téléchargements sur Modrinth selon un agrégateur. Ses arguments : **badges et trophées de champions d'arène**, **taux de shiny boosté (1/2048)**, **mises à jour par région** (« vague Sinnoh »), et un pack assez léger pour tourner avec 4 à 6 Go de RAM. Beaucoup de serveurs en dérivent des versions.

Ce qu'on en retient pour PixelGO :

1. **Annoncer des objectifs de collection visibles** : badges, trophées, Pokédex. PixelGO a déjà la Ligue et des trophées : il faut le **dire sur la page** et le montrer en image.
2. **Communiquer par grosses mises à jour à thème** (« Mise à jour Expéditions », « Mise à jour Ligue ») plutôt que par numéros de version.
3. **Encourager les serveurs** : un server pack propre, un fichier `README` pour les hébergeurs, et la mention explicite « server friendly ».
4. **Rester jouable sur un PC moyen** : afficher la RAM conseillée (6 Go mini, 8 Go conseillé) en haut de la description.

---

## 3. Les mods : quoi enlever, quoi ajouter

### 3.1 À supprimer ou à revoir

| Mod(s) | Constat | Recommandation |
|---|---|---|
| **Integrated Dynamics + Integrated Terminals + Integrated Tunnels** (+ Cyclops Core, Common Capabilities si plus rien n'en dépend) | 0 quête, 0 script, aucune recette verrouillée. Fait doublon avec Refined Storage + Pipez. Integrated Tunnels permet d'automatiser **sans passer par la trame** | **Supprimer** (gain de chargement et suppression d'un contournement) |
| **RFTools Storage** | 0 quête, 0 script, doublon avec Refined Storage / Sophisticated Storage | Supprimer |
| **Simple Storage Network** | 3e système de stockage en réseau, référencé dans 1 chapitre | Supprimer et retirer la quête, ou garder si le chapitre en dépend vraiment |
| **Entangled** | 0 quête, pas de verrouillage : accès à distance aux inventaires | Vérifier qu'il ne casse pas la trame, sinon verrouiller sa recette |
| **Advanced Loot Info + Advanced Core Info** | Le plugin JEI d'ALI prend **31,6 s** à chaque chargement de monde | Désactiver son plugin JEI dans sa config, ou le retirer. Le gain est immédiat |
| **Sound Physics Remastered** | Lourd en CPU, réverbération qui ne plaît pas à tout le monde | Garder mais documenter comment le couper, ou le retirer |
| **Iris** en double | Présent dans `mods/` **et** `mods_disabled/` | Nettoyer `mods_disabled/` |
| **InvMoveCompats** `0.5.0+1.21.8` | Le nom du fichier indique 1.21.8 | Vérifier qu'il s'agit bien d'un build multi-version |
| Restes d'**EMI** (`emi.json`, `config/emi.css`) | EMI n'est plus installé | Supprimer ces fichiers de l'export |
| **Scripts KubeJS d'exemple** (« Hello, World! ») | Visible dans les logs | Supprimer `main.js` des 3 dossiers ou les vider |
| **Message de debug** `REGISTER EVENT FIRED` / `TARGET:` (324 lignes) | Un mod lié aux puissances NeoOrigins écrit dans STDOUT | Retirer les `System.out.println` de l'addon concerné |

> **À ne pas toucher** : Mekanism, EnderIO, Cyclic, RFTools Builder/Utility, ProjectE, Mystical Agriculture, Extended Crafting. Ils ont chacun un chapitre de quêtes et des recettes verrouillées dans `35_machines.js` / `30_tech.js`.

### 3.2 À ajouter

**Performance et stabilité** (tous disponibles en NeoForge 1.21.1, présents dans ATM10 ou les packs FTB) :

| Mod | Gain |
|---|---|
| **ModernFix** | Chargement plus rapide, beaucoup moins de RAM (indispensable au-delà de 200 mods) |
| **AllTheLeaks** | Corrige des fuites mémoire de Minecraft et de mods courants (équipe ATM) |
| **spark** | Profileur : permet de trouver ce qui fait lagger un serveur |
| **Clumps** | Regroupe les orbes d'XP. Important ici : l'XP vanilla alimente les compétences (`59_skill_xp_vanilla.js`) et Cog & Capture XP en fait apparaître beaucoup |
| **Packet Fixer** | Évite les déconnexions « packet too big » sur les gros packs (Pixelmon + 221 mods) |
| **Crash Assistant** | Écran clair au crash, partage du log en un clic : réduit le support Discord |
| **Better Compatibility Checker** | Affiche la version du pack, prévient en cas de client/serveur désynchronisés |

**Serveur** (côté serveur uniquement, comme dans les packs FTB) :

| Mod | Gain |
|---|---|
| **FTB Essentials** | /home, /back, /spawn, /tpa, /rtp : attendu par les joueurs de serveur |
| **FTB Ranks** | Permissions sans plugin |

**Qualité de vie et design** :

| Mod | Gain |
|---|---|
| **Drippy Loading Screen** (même auteur que FancyMenu) | Écran de chargement à l'image de PixelGO à la place de l'écran Mojang |
| **Legendary Tooltips** (Iceberg est déjà installé) | Infobulles encadrées selon la rareté : très visible en capture d'écran |
| **Jade Addons** | Plus d'infos dans Jade pour les mods tech |
| **Ping Wheel** | Signaler un point en multijoueur (très utilisé en équipe) |
| **Simple Voice Chat** *(optionnel)* | Populaire sur les serveurs Pokémon SMP |
| Un **shader léger livré mais désactivé** (ex. Complementary Reimagined, licence à vérifier) | Iris est déjà là sans aucun shader : les joueurs qui veulent de belles captures n'ont rien |

### 3.3 Mises à jour en attente

Moog's Structure Lib 3.4.2, ATi Structures 1.4.7, MSS 2.2.0, MVS 5.1.3, **NeoOrigins 2.2.38**, **Puffish Skills 0.19.2**.
NeoOrigins et Puffish Skills sont liés à `neofishcompat` et aux origines `pixelgo_origins` : les tester sur une copie avant.

---

## 4. Conflits de touches (première impression du joueur)

Relevé dans `options.txt`. Certaines touches ne servent que dans une interface précise et ne gênent pas, mais plusieurs se marchent dessus en jeu :

| Touche | Actions en conflit |
|---|---|
| **K** (9) | Compétences Puffish, activer les shaders (Iris), KubeDex, Wiki, Codex NPC PixelGO, vision nocturne (origine), stats des minions, config Fancy Toasts, annuler (baguette) |
| **V** (5) | **Action Pokémon**, **AutoBattle PixelGO**, compétence 1 d'origine, charge ProjectE, mode casque Mekanism |
| **G** (9) | Time in a Bottle, **Pokémon externe**, compétence 2 d'origine, Curios, mode ProjectE, mode coffre Mekanism, bâton EnderIO, Building Gadgets… |
| **N** (6) | **Pokénav**, **Pension**, compétence 3 d'origine, mode Mekanism, nom des familiers, points JourneyMap |
| **B** (7) | **Sac à dos**, compétence 4 d'origine, waypoint JourneyMap, attaque externe suivante, mode bottes Mekanism… |
| **R** (5) | **Envoyer le Pokémon**, renommer au PC, recette JEI, projectile ProjectE, portée Building Gadgets |
| **C** (8) | Descendre (Mekanism), photo, terminal portable, fonction ProjectE… |

**Recommandation** : fixer un plan de touches cohérent et le livrer.

- Les touches **Pixelmon** gardent leurs touches d'origine (R, V, etc.).
- Les **compétences d'origine** passent sur **Alt + 1/2/3/4** (ou Z/X/C/F selon ce qui reste libre).
- Les **ouvertures de menus PixelGO** (Pokénav, Codex, stats minions, AutoBattle) passent sur des touches dédiées sans conflit, ou en combinaison Ctrl.
- **Iris (activer les shaders)** passe hors de K : sinon le joueur coupe les shaders en voulant ouvrir les compétences.
- Les modes d'armure Mekanism et ProjectE restent non assignés par défaut (ils servent tard dans la partie).
- Livrer ces choix avec **Default Options** (BlayTheNinth) pour ne pas écraser les réglages des joueurs à chaque mise à jour.

---

## 5. Page CurseForge et visibilité

C'est là que se joue le nombre de téléchargements. Le contenu du pack est très au-dessus de ce que montre sa page.

### 5.1 Nom

Actuel : **« PixelGO - To the Sky 2 »**. Aucun des deux mots que les joueurs tapent (« Pixelmon », « Skyblock ») n'y figure.

Proposition : **« PixelGO: To the Sky 2 — Pixelmon Skyblock »**
(ou « PixelGO 2 | Pixelmon Skyblock RPG »). Garder le nom de marque devant, les mots-clés derrière.

### 5.2 Résumé (la ligne sous le titre)

Actuel : *« Experience the adventure with pokemons in the sky with mod tech, custom egg pokemon and with quests ! »*
Problèmes : « pokemons » (pas de pluriel en anglais), « mod tech », pas de chiffres, pas d'exclusivité.

Proposition :
> *Pixelmon skyblock RPG: start on a floating island, build minions, clear Solo-Leveling gates, climb the Battle Tower and beat the League. 700+ quests, 24 custom mods.*

### 5.3 Description (ordre conseillé)

1. **Bannière** + une phrase d'accroche.
2. **Configuration requise** : RAM conseillée (8 Go), lien vers le server pack, partenaire Shockbyte + code.
3. **Les 6 exclusivités, une image chacune** :
   - **Minions** façon Hypixel (paliers I → XI, outils, Power Pots)
   - **Portes de donjon** façon Solo Leveling (rangs E → S)
   - **Tour de combat** et **Ligue Pokémon** (avec un vrai boss final : toi)
   - **Expéditions** et **Rival**
   - **9 origines de dresseur**, chacune avec un arbre de compétences
   - **Économie** : ventes, boutiques par catégorie, sacs mystère, lucky blocks Pixelmon
4. **La progression en un schéma** (île → ferme → génération → automatisation → endgame).
5. **Liste des mods principaux** (pas les 221 : les 20 qui parlent aux joueurs).
6. **FAQ** : « Le pack crashe au chargement », « Bloqué sur l'écran Mojang » (voir la mémoire *font PNGs*), « Combien de RAM ? », « Est-ce jouable en solo ? ».
7. **Liens** : Discord, server pack, signaler un bug.

**Supprimer** la mention périmée « team-selection RPG system » (remplacée par les origines). La Clé Méga, le Random Egg et le Ticket SSR existent toujours (vérifié le 12/11).

### 5.4 Galerie (actuellement vide)

Minimum 10 images, en 16:9, prises avec un shader et l'interface masquée (F1) quand c'est un paysage :

1. L'île de départ (Windhaven) au coucher du soleil
2. Une ferme de minions qui tourne
3. L'intérieur d'une Porte de rang S avec un boss
4. La Tour de combat
5. L'arène de la Ligue
6. Le livre de quêtes (chapitres en dégradé : ça se voit tout de suite)
7. L'arbre de compétences d'une origine
8. Une boutique / l'écran de vente
9. Une base endgame (Mekanism / Refined Storage)
10. Le menu principal personnalisé
11. Un Pokémon légendaire dans une tanière (Legendary Dens)
12. Une expédition en cours

### 5.5 Mises à jour et changelog

- Publier **toutes les 2 à 4 semaines**, même petites : CurseForge remonte les projets récemment mis à jour.
- Écrire le changelog **pour les joueurs**, en 3 parties : *Nouveautés / Équilibrage / Corrections*. Les détails techniques restent dans les `.md` internes.
- Nommer les grosses versions par thème (« 2.6 — Expéditions & Rival », « 2.7 — Ligue »).
- **Toujours publier le server pack** en fichier rattaché à la même version.

### 5.6 Communication

- **Bande-annonce de 60 à 90 s** (île → minion → porte → combat de Ligue). Mettre la vidéo en haut de la description.
- **Clips courts** (TikTok, YouTube Shorts) : ouverture de sac mystère, boss de Porte S, shiny, minions qui récoltent. Ce format fait découvrir les packs Pokémon aujourd'hui.
- **Contacter des créateurs** Pixelmon/skyblock (FR, ES, PT-BR, EN) : leur donner un serveur de test.
- **Discord** : salon #bugs, salon #suggestions, rôle « testeur » qui reçoit les versions bêta.

### 5.7 Langues

| Langue | État | Intérêt |
|---|---|---|
| Anglais | complet | marché principal |
| Français | **0 quête traduite** | ta communauté d'origine |
| Chinois | 628 lignes (partiel) | à finir ou retirer |
| Espagnol / Portugais (BR) | absent | **gros public Pixelmon** (Amérique latine, Brésil) |

Les quêtes passent déjà par des clés de traduction (`{quest.xxx.description.N}`) : créer `fr_fr.json`, `es_es.json`, `pt_br.json` est un travail de traduction pur, sans toucher aux quêtes.

---

## 6. Design et identité visuelle

### 6.1 Ce qui marche

- Le **fond du menu** (chambre en pixel art, ambiance « départ d'aventure ») est réussi et cohérent avec Pokémon.
- La **bannière** PixelGO (logo 3D orange + île flottante) est lisible et identifiable.
- Les **titres de chapitres en dégradé** donnent un côté premium au livre de quêtes.

### 6.2 À améliorer

| Point | Constat | Proposition |
|---|---|---|
| **Packs de ressources désactivés** | `options.txt` : `resourcePacks:["vanilla","mod_resources"]`. Faithful Pixelmon x32, Glowing Ores, Better Leaves et l'écran de chargement Pixelmon ne sont **jamais vus** par le joueur | Activer dans l'ordre : Loading Backgrounds, Faithful x32, Glowing Ores, Better Leaves (et l'OST si les droits le permettent). Livrer ce `options.txt` ou passer par Default Options |
| **Fenêtre du jeu** | FancyMenu : titre et icône de fenêtre vides. Le log indique aussi « Unable to find resource pack for setting window icon » | Mettre le titre « PixelGO: To the Sky 2 — v2.x » et une icône (Poké Ball + île) dans `config/fancymenu/options.txt` |
| **Écran de chargement** | Écran Mojang/NeoForge standard pendant ~2 min | **Drippy Loading Screen** avec le logo PixelGO et une barre aux couleurs du pack |
| **Version visible** | Aucune version affichée dans le menu | Ajouter un texte FancyMenu « v2.x » dans un coin (ou via Better Compatibility Checker) |
| **Cohérence des couleurs** | Fond violet/bleu (menu) + logo orange + Dark Mode gris | Garder une palette : violet nuit (fond), orange (accent, boutons au survol), blanc (texte). L'appliquer aux boutons, au chargement et aux bannières |
| **Icône du pack CurseForge** | À vérifier | Logo seul, lisible en 64×64 (pas toute la bannière) |
| **Infobulles** | ColorTooltips + RarityCore déjà présents | Ajouter Legendary Tooltips pour un cadre par rareté |
| **Écran de mort / équipe KO** | Mod « Your team die, you die » | Écran FancyMenu dédié (« Votre équipe est K.O. ») pour renforcer l'identité |
| **Messages de bienvenue** | — | Un message au premier spawn : touches essentielles, livre de quêtes, lien Discord |

---

## 7. Gameplay : rétention des nouveaux joueurs

`PROGRESSION-TRAME.md` (§2 bis) impose **au moins quinze heures de ferme manuelle avant Ex Deorum** (Certificat de récolte, 11 680 cultures).

C'est cohérent avec la trame voulue, mais c'est le point qui risque le plus de faire **désinstaller le pack dans la première heure** :

- dans un skyblock, le joueur s'attend à une première automatisation en 1 à 3 h (FTB Skies, StoneBlock) ;
- un joueur qui arrive par CurseForge vient d'abord pour **Pixelmon** : s'il passe 15 h à récolter du blé avant d'avancer, il ne verra jamais les Portes ni les minions, qui sont pourtant tes meilleurs arguments.

Pistes, du plus léger au plus fort :

1. **Faire progresser Pixelmon en parallèle dès la 1re heure** : captures, premières Portes de rang E, Tour de combat d'entrée de gamme, avec des récompenses en argent modestes mais visibles.
2. **Raccourcir le mur à 4 à 6 h** et décaler la difficulté plus loin (Portes S, Ligue, singularité).
3. **Proposer deux modes** : *Normal* (mur raccourci) et *Expert* (trame actuelle). Les packs FTB et ATM font souvent ça avec une version « Expert » à part.

Dans tous les cas, **afficher un objectif clair à chaque étape** (« Prochain palier : X $ → débloque Y ») dans le livre de quêtes.

---

## 8. Bugs et performances relevés dans les logs

| Problème | Détail | Correctif |
|---|---|---|
| **28 tables de butin Dungeons Arise cassées** | `kubejs/data/dungeons_arise/loot_table/...` utilisent `minecraft:set_nbt`, qui n'existe plus en 1.21.1. Les tables sont rejetées : **les coffres de ces structures sont vides** (aviary, bandit_towers, heavenly_*, illager_fort, mushroom_mines, plague_asylum, shiraz_palace, gladiator_loot…) | Régénérer avec `set_components` / `set_potion` dans le générateur (`tools/pixelgo-loot`) |
| **5 tables Extra Disks** (blocs de stockage chimique) | Erreur dans le mod lui-même | Signaler à l'auteur ou surcharger la table |
| **Plugin JEI d'ALI** | 31,6 s à chaque chargement de monde | Voir §3.1 |
| **Fusion `fpgo:emissive_fossil_ore`** | Le pack Glowing Ores cible `pixelmon:fossil_ore`, qui n'existe plus | Retirer ce modificateur du pack ou mettre à jour le pack |
| **Tag `pixelmon:spawning/drowned`** | Références manquantes | Surcharger le tag avec une liste valide |
| **Modèle `twilightforest:giant_leaves`** | Twilight Forest n'est pas installé : un pack de ressources le référence | Sans gravité, à nettoyer |
| **`tcg:` chemins invalides** (espaces, apostrophes) | Fichiers de cartes avec des noms non autorisés | Sans gravité, renommer si c'est un de tes packs |
| **`Tried to load invalid item`** (×4) | Objet vide dans une donnée (quête, boutique ou récompense) | À retrouver avec le contexte du log |
| **6 395 progrès chargés** | Beaucoup viennent des mods de structures | Possible de désactiver les progrès inutiles pour gagner un peu au chargement |

---

## 9. Risques juridiques et de modération

CurseForge tolère les packs Pixelmon (Pixelmon est lui-même sur la plateforme), mais **les fichiers audio sous copyright inclus directement dans le pack** sont un risque réel de retrait ou de signalement DMCA :

| Fichier | Risque |
|---|---|
| `config/fancymenu/assets/pokemon-theme-song-original2.ogg` | Musique officielle Pokémon : **élevé** |
| `config/fancymenu/assets/menu/last_chance/pallet-town-relaxing-lofi-hiphop-remix.ogg` | Remix d'une musique Pokémon, droits du remixeur + Nintendo : **élevé** |
| `config/fancymenu/assets/nintendo-game-boy-startup.wav` | Son Nintendo : **moyen** |
| `kubejs/assets/minecraft/sounds/records/*.ogg` (13 disques remplacés) | Dépend de la source des musiques : à vérifier |
| `kubejs/assets/minecraft/sounds/custom/pikachu.ogg`, `magikarp.ogg` | Cris officiels : **moyen** |
| `resourcepacks/ThePixelmonOST.zip` (143 Mo) | Pack tiers : vérifier qu'il autorise la redistribution |
| Bannière avec Ectoplasma (Gengar) | Fan art d'un Pokémon : courant dans les packs Pixelmon, risque faible, mais un logo 100 % original protège la marque PixelGO |

**Recommandation** : remplacer les musiques par des morceaux **libres de droits** ou **commandés** (style chiptune / lo-fi « Pokémon-like »). C'est aussi un argument : « musique originale ».

---

## 10. Plan d'action

### Phase 1 — Avant la prochaine version (1 à 2 jours)

- [x] Corriger les 28 tables de butin `set_nbt` (+ illager_fort_treasure : 29 tables, `tools/pixelgo-loot/fix-setnbt.mjs`)
- [ ] Activer les packs de ressources dans le `options.txt` livré
- [x] Régler les conflits de touches (`tools/pixelgo-keys/keys.mjs`, appliqué au `options.txt`) — reste : Default Options pour ne pas écraser les touches des joueurs
- [x] Nettoyer : scripts « Hello World », restes d'EMI, Iris en double — reste : logs de debug (viennent de `neofishcompat`, mod tiers)
- [x] Titre et icône de fenêtre, version dans le menu (v2.6)

### Phase 2 — Page CurseForge (1 jour)

- [x] Nouveau nom avec « Pixelmon Skyblock »
- [x] Nouveau résumé et nouvelle description (§5.2, §5.3) → `CURSEFORGE-PAGE.md`
- [ ] 10 à 12 captures dans la galerie
- [x] Server pack rattaché à la version
- [x] Changelog joueur → `CHANGELOG-2.6.md`

### Phase 3 — Croissance (continu)

- [ ] Traduction FR des quêtes, puis ES et PT-BR — outil `tools/pixelgo-lang/lang.mjs`, FR : 150 / 3 679 unités

---

## Sources

- Page publique du pack (agrégateur) : [moddex.gg — PixelGO To the Sky 2](https://moddex.gg/modpack/pixelgo-2)
- Pack précédent : [CurseForge — PixelGO To the Sky](https://www.curseforge.com/minecraft/modpacks/pixelgo-sky/files/5681055)
- Classement des modpacks 2026 : [champbop.com — Best Minecraft modpacks 2026](https://champbop.com/minecraft/best-minecraft-modpacks/)
- [CurseForge — The Pixelmon Modpack](https://www.curseforge.com/minecraft/modpacks/the-pixelmon-modpack)
- [CurseForge — COBBLEVERSE](https://www.curseforge.com/projects/1210677), [changelog Modrinth](https://modrinth.com/modpack/cobbleverse/changelog), [minecraftbible.com — Cobbleverse](https://minecraftbible.com/modpacks/cobbleverse)
- [CurseForge — FTB Skies 2](https://www.curseforge.com/minecraft/modpacks/ftb-skies-2/files/7825058), [GDLauncher — FTB Skies 2](https://gdlauncher.com/modpacks/curseforge/ftb-skies-2)
- [CurseForge Blog — Top modpacks](https://blog.curseforge.com/top-minecraft-modpacks-on-curseforge/)
