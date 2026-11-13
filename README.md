# PixelGO - To the Sky 2

Modpack Minecraft **NeoForge 1.21.1** (Pixelmon skyblock). Version actuelle : voir [`VERSION`](VERSION).

## Contenu du dépôt

| Dossier / fichier | Rôle |
|---|---|
| `config/`, `defaultconfigs/` | Configuration des mods |
| `kubejs/` | Scripts, recettes, textures et traductions du pack |
| `fancymenu_data/`, `patchouli_books/`, `skyblockbuilder/` | Menus, livres, îles |
| `resourcepacks/` | Packs de ressources maison (les autres sont dans `manifest.json`) |
| `tools/` | Outils de génération (quêtes, économie, shop, loot…) |
| `docs/` | Documents de conception et anciens changelogs |
| `manifest.json` | Liste des mods au format CurseForge (IDs projet / fichier) |
| `MODLIST.md` | Liste lisible des mods |
| `CHANGELOG.md` | Historique des versions |

Les `.jar` des mods, les mondes, logs et réglages personnels ne sont **pas** versionnés.

## Outils de version

```bash
python tools/pixelgo-release/modlist.py        # régénère manifest.json + MODLIST.md
python tools/pixelgo-release/bump_version.py   # 3.0 -> 3.1
python tools/pixelgo-release/bump_version.py 4 # -> 4.0
```
