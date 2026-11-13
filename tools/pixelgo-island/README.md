# pixelgo-island — île de départ « Sanctuaire Sakura »

Génère `config/skyblockbuilder/templates/islands/sakura.nbt` (template SkyblockBuilder, MC 1.21.1).

```
node tools/pixelgo-island/generate.mjs          # régénère sakura.nbt + preview.json
node tools/pixelgo-island/render.mjs tools/pixelgo-island/preview.json preview.png se 10
#   vues : se | sw | nw | ne | below ; dernier argument optionnel = coupe en Y (ex. 25 pour voir l'intérieur)
```

- Le waystone, les 2 coffres (dont la poke_key), le portail de donjon (rang C) et le cadre
  « poke bag » sont recopiés tels quels depuis `default.nbt` : ne pas supprimer ce fichier.
- Coordonnées : `DY = 5` (marge sous l'île). Le sol est à y logique 14, soit y réel 19.
  Spawn dans `templates.json5` → référence `sakura` : `[19, 20, 5]`, regard vers le sud.
- Mods utilisés : Another Furniture, Pixelmon, Pokeblocks (peluches),
  Handcrafted, Sooty Chimneys.

# windhaven.mjs — grande île de départ v3 « Windhaven » (template par défaut depuis 2026-11-11)

```
node tools/pixelgo-island/windhaven.mjs        # régénère windhaven.nbt + preview-windhaven.json
node tools/pixelgo-island/render.mjs tools/pixelgo-island/preview-windhaven.json tools/pixelgo-island/preview-windhaven.png se 7
```

- Gabarit 81×50×81, île principale ~65 blocs de diamètre, herbe à y=24 (on marche à 25).
  Spawn `[40, 25, 47]` regard nord (place centrale, face à la fontaine et au Centre Pokémon).
- Zones : Centre Pokémon 2 étages (nord : soigneur, PC, distributeur, cuisine fonctionnelle,
  chambre, salon avec les 2 coffres de départ et le cadre Poké Bag), place + fontaine Poké Ball
  et waystone (centre), moulin (nord-est), champs irrigués (est), arène (sud), cercle du portail
  de donjon (sud-est), colline + sanctuaire des 4 crates + cascade et lac avec ponton (ouest),
  camp (sud-ouest), 4 îlots flottants décoratifs.
- Mêmes blocs repris de `default.nbt` que sakura (waystone, coffres, portail, cadre).
- Mods utilisés : Pixelmon, Handcrafted, Another Furniture, Pokeblocks, Sooty Chimneys, Hel's Crates.
