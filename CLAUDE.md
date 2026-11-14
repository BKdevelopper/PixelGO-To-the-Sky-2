# Règles du dépôt PixelGO - To the Sky 2

- Chaque changement = un commit (message clair en français), puis `git push`.
- Le dossier doit rester propre : ce qui ne sert plus est supprimé.
- Fichiers temporaires : uniquement dans `_temp/` (ignoré par Git), à vider une fois utilisés.
- `.gitignore` est une liste blanche : un nouveau dossier racine à versionner doit y être ajouté.
- Après un ajout / retrait de mod : `python tools/pixelgo-release/modlist.py`.

## Changelog joueur (FancyMenu)

À chaque changement, l'indiquer au joueur dans le changelog du menu principal, **dans le même commit** :
- `config/fancymenu/assets/changelog/changelog_fr.md` **et** `changelog_en.md` (toujours les deux).
- Uniquement la liste de ce qui a changé, une ligne courte par élément, sans expliquer où le trouver
  ni comment s'en servir :
  - `## Contenu ajouté` / `## Added content`
  - `## Contenu retiré` / `## Removed content`
  - `## Mods ajoutés` / `## Added mods`
  - `## Mods retirés` / `## Removed mods`
  - `## Mods mis à jour` / `## Updated mods` (nom du mod + ancienne -> nouvelle version)
  - `## Corrections` / `## Fixes` (bug corrigé)
- N'afficher que les rubriques qui ont au moins une ligne.
- Remplacer la ligne « Pas encore de nouveautés… » / « Nothing new… » à la première entrée.
- Le changelog du menu décrit la version en cours (celle de `VERSION`) ; ajouter aussi une ligne dans `CHANGELOG.md`.

## /updatemodpack

- `/updatemodpack` -> version mineure suivante (3.0 -> 3.1).
- `/updatemodpack 4` -> version 4.0 (`/updatemodpack 4.2` -> 4.2).

Le contenu du dossier au moment de `/updatemodpack` est la version qui se termine (celle de `VERSION`) ;
tout ce qui change ensuite appartient à la nouvelle version.

Étapes :
1. Clôturer la version en cours (A.B) : tout ce qui est en attente est commité (vérifier les changements
   de mods avec `minecraftinstance.json` / `MODLIST.md` depuis le tag précédent et les porter au changelog),
   `git status` propre, puis tag annoté `git tag -a vA.B -m "Version A.B"` sur ce commit et `git push --follow-tags`.
2. `python tools/pixelgo-release/bump_version.py [version]` : change la version partout dans FancyMenu
   (titre de la fenêtre `config/fancymenu/options.txt`, titre du changelog `pixelgo.menu.changelog_title`
   en fr/en), archive le changelog du menu dans `docs/changelogs/<ancienne version>/` et le remet à zéro.
   (`python` = `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`, l'alias Windows ouvre le Store.)
3. Vérifier : `grep -rn "v<ancienne version>" config/fancymenu/options.txt kubejs/assets/pixelgo/lang` ne doit rien renvoyer.
4. Commit `Version X.Y` (sans tag : `vX.Y` sera posé à la clôture de X.Y), `git push`.
- Dépôt : https://github.com/BKdevelopper/PixelGO-To-the-Sky-2 (identifiants dans `.git/credentials`, jamais versionnés).
