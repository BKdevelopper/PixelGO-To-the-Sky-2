# Règles du dépôt PixelGO - To the Sky 2

- Chaque changement = un commit (message clair en français), puis `git push`.
- Le dossier doit rester propre : ce qui ne sert plus est supprimé.
- Fichiers temporaires : uniquement dans `_temp/` (ignoré par Git), à vider une fois utilisés.
- `.gitignore` est une liste blanche : un nouveau dossier racine à versionner doit y être ajouté.
- Après un ajout / retrait de mod : `python tools/pixelgo-release/modlist.py`.

## Changelog joueur (FancyMenu)

À chaque ajout ou changement visible en jeu, informer le joueur dans le changelog du menu
principal, **dans le même commit** :
- `config/fancymenu/assets/changelog/changelog_fr.md` **et** `changelog_en.md` (toujours les deux).
- Infos pratiques pour le joueur : quoi, où le trouver, comment l'utiliser (touche, recette, quête…).
  Phrases courtes, pas de détails techniques.
- Rubriques : `## Nouveautés` / `## New`, `## Équilibrage` / `## Balance`,
  `## Corrections` / `## Fixes`, `## Mods ajoutés` / `## Added mods`, `## Mods retirés` / `## Removed mods`.
- Remplacer la ligne « Pas encore de nouveautés… » / « Nothing new… » à la première entrée.
- Le changelog du menu décrit la version en cours (celle de `VERSION`) ; ajouter aussi une ligne dans `CHANGELOG.md`.

## /updatemodpack

- `/updatemodpack` -> version mineure suivante (3.0 -> 3.1).
- `/updatemodpack 4` -> version 4.0 (`/updatemodpack 4.2` -> 4.2).

Étapes :
1. `python tools/pixelgo-release/bump_version.py [version]` : change la version partout dans FancyMenu
   (titre de la fenêtre `config/fancymenu/options.txt`, titre du changelog `pixelgo.menu.changelog_title`
   en fr/en), archive le changelog du menu dans `docs/changelogs/<ancienne version>/` et le remet à zéro.
2. Vérifier : `grep -rn "v<ancienne version>" config/fancymenu/options.txt kubejs/assets/pixelgo/lang` ne doit rien renvoyer.
3. Commit `Version X.Y`, tag annoté `git tag -a vX.Y -m "Version X.Y"`, `git push --follow-tags`.
- Dépôt : https://github.com/BKdevelopper/PixelGO-To-the-Sky-2 (identifiants dans `.git/credentials`, jamais versionnés).
