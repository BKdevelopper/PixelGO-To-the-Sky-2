# Changelog — PixelGO - To the Sky 2

## v3.1 — 2026-11-14

- Île Windhaven réenregistrée (même taille 81x50x81) : maison meublée (mobilier et Pokédolls avec leurs données), minerais, 4 Master Chests cachés à usage unique (graines d'inferium, clé Ultra, totem, livre Harvesting IV), 8 tonneaux vides, 2 Portes de rang E à la place de la Porte de rang C, waystone déplacée.
- Configs générées par les mises à jour : réservoirs Sophisticated Storage, Jade, InvMove.
- Sacs mystère : générateurs d'énergie et tamis / marteaux automatiques ajoutés, objets créatifs retirés, objets en netherite passés en diamant, objets non revendables en boutique.
- Loot : Origin Ball retirée, bases de Poké Ball ajoutées (tables de matériaux de ball).
- L'osmium brut se cuit au four / haut fourneau.
- Loot : les lingots de netherite deviennent 3 à 4 débris de netherite (coffres, Battle Tower, sacs Treasure Bags, drops de Pokémon).
- Lingot de crystaltine (Extended Crafting) : les 2 étoiles du Nether de la recette remplacées par 2 émeraudes.
- Quêtes : chapitre Légendaires refait en collection (`tools/pixelgo-quests/legendaries.mjs`) — 108 quêtes de capture (légendaires, fabuleux, oiseaux de Galar, Ultra-Chimères) en anneaux autour d'un grand checkmark final ; quêtes d'objets et d'explications supprimées.
- Quêtes : nouveau chapitre Baies (`tools/pixelgo-quests/berries.mjs`), même page de collection — 78 baies (toutes celles de Pixelmon), 1 Dime par baie, 10 Poke Coins au checkmark central.
- Random EV / IV / Level / Size (PixelGO Items) : seul craft = table ultime Extended Crafting, les 78 baies + saphir / rubis / super bonbon / silicium (`35_machines.js`). Anciennes recettes retirées (établi du mod, enrichissement Mekanism, four à alliage et lieur d'âmes Ender IO, solidificateur Cyclic). Quêtes ajoutées au chapitre Créatif, textes du chapitre PixelGO Items mis à jour.
- PixelGO - JourneyMap x Pixelmon 1.0.0 -> 1.0.1 : le mod avait le même modId (`pixelgo`) que PixelGO Enchant, NeoForge ne gardait que la version la plus haute (Enchant 1.1) et ignorait la carte sans erreur. Jar repatché avec le modId `pixelgo_journeymap` (classes, `neoforge.mods.toml`, `assets/pixelgo_journeymap`).
- Mods ajoutés : PixelGO - JourneyMap x Pixelmon 1.0.1, Huge Structure Blocks 1.1.6.
- Mods mis à jour : Architectury API 13.0.11 -> 13.0.12, Ender IO 8.2.12-beta -> 8.2.13-beta, Entity Culling 1.11.3 -> 1.12.1, FTB Chunks 2101.1.23 -> 2101.1.24, Particular Reforged 1.5.7 -> 1.6.1, PixelGO - Backpack 1.0.0 -> 2.0.0, PixelGO - Information - Jade 2.0.0 -> 3.0.0, PixelGO - Minions 5.0.0 -> 6.0.0, ShatterLib / OctoLib 0.6.3 -> 0.6.3.2, Sophisticated Core 1.5.33 -> 1.5.35, Sophisticated Storage 1.6.17 -> 1.6.18.

## v3.0

- Version de départ du dépôt GitHub.
- Changelogs précédents : [`docs/changelogs/`](docs/changelogs/).
