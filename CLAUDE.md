# Règles du dépôt PixelGO - To the Sky 2

- Chaque changement = un commit (message clair en français), puis `git push`.
- Le dossier doit rester propre : ce qui ne sert plus est supprimé.
- Fichiers temporaires : uniquement dans `_temp/` (ignoré par Git), à vider une fois utilisés.
- `.gitignore` est une liste blanche : un nouveau dossier racine à versionner doit y être ajouté.
- Après un ajout / retrait de mod : `python tools/pixelgo-release/modlist.py`.

## /updatemodpack

- `/updatemodpack` -> version mineure suivante (3.0 -> 3.1).
- `/updatemodpack 4` -> version 4.0 (`/updatemodpack 4.2` -> 4.2).

Étapes :
1. `python tools/pixelgo-release/bump_version.py [version]`
2. Remplir la nouvelle section de `CHANGELOG.md` avec les commits depuis le dernier tag (`git log vX.Y..HEAD`).
3. Commit `Version X.Y`, tag `vX.Y`, `git push --follow-tags`.
