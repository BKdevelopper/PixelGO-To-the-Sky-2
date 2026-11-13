# Origines Pixelmon

9 origines NeoOrigins 100 % Pixelmon. Chacune débloque son propre arbre Pufferfish's Skills.
Tout le contenu est dans `generate.mjs` (Node 18+) :

```bash
node tools/pixelgo-origins/generate.mjs
```

Le script efface puis réécrit ses sorties. Ne modifiez pas les fichiers générés à la main.

| Sortie | Rôle |
|---|---|
| `kubejs/data/neoorigins/origins/origin_layers/origin.json` | `replace: true` : le calque Origine ne propose que `pixelgo_origins:*` |
| `kubejs/data/neoorigins/origins/origin_layers/class.json` | calque Classe désactivé (`enabled: false`) |
| `kubejs/data/pixelgo_origins/origins/{origins,powers}/` | origines et pouvoirs |
| `kubejs/assets/pixelgo_origins/lang/{en_us,fr_fr}.json` | textes (origines, pouvoirs, arbres) |
| `config/puffish_skills/categories/origin_<id>/` | un arbre par origine (verrouillé par défaut) |
| `config/puffish_skills/config.json` | garde `pixelgo` et ajoute les `origin_*` |

Scripts KubeJS associés (écrits à la main) :
- `59_skill_xp_vanilla.js` crédite l'XP vanilla à Trainer's Path ET à l'arbre d'origine débloqué
  (via `SkillsAPI`, car la commande `experience add` crédite aussi les catégories verrouillées).
- `61_origines_pixelmon.js` : à la connexion, un joueur qui a encore une ancienne origine ou une
  classe passe par `/neoorigins reset` et choisit à nouveau.
- `00_removals.js` retire la recette `neoorigins:orb_of_class`.

## Les origines

| Origine | Type | Forces (PixelGO Enchant + vanilla) | Faiblesse | Capstone (pouvoir via Puffish) |
|---|---|---|---|---|
| Ranger | Normal / Vol | +8 capture, +5 % vitesse, ½ dégâts de chute | -2 armure | Vitesse I |
| Chercheur | Psy | +1 jet chromatique, +8 % XP Pokémon, +1 chance | -15 % dégâts | +2 jets chromatiques |
| Combattant | Combat | +12 % XP Pokémon, +15 % EV, +1 attaque | -6 capture | Force I |
| Éleveur | Normal | +20 pas d'œuf, +2 amitié, 25 % jumeaux (animaux) | -15 % dégâts | +50 % jumeaux |
| Soigneur | Fée | +3 % PV d'équipe, +1 amitié, régénération ×1,5 | -20 % dégâts | Régénération I |
| Pêcheur | Eau | -10 % attente de pêche, respiration aquatique, +30 % nage | -6 % vitesse sur terre | Grâce du dauphin + vision nocturne dans l'eau |
| Botaniste | Plante | +12 % récolte, aura de croissance (4 blocs) | +50 % dégâts de feu | +1 butin sur cultures et bûches |
| Montagnard | Roche / Sol | +5 fossile, minage ×1,25 (pioche), +20 % anti-recul | -30 % nage | Célérité I |
| Fouineur | Ténèbres | +8 % butin Pokémon, +8 % Poké Loot, vision nocturne | -4 PV max | Invisible dans le noir |

Chaque origine a aussi :
- **★ son arbre** : le pouvoir `neofishcompat:unlock_puffish_category` débloque `origin_<id>` quand on
  choisit l'origine et le reverrouille quand on la quitte (sans effacer la progression).
- **Évolution I/II/III** : `tier_powers` NeoOrigins (paliers de victimes de `config/neoorigins/gameplay.toml`),
  qui renforcent l'attribut phare de l'origine.

## Forme des arbres

```
            capstone (coût 3, exige 12 points dépensés)
   keyA (2) ─┤  C3  ├─ keyB (2)        keyA ⟷ keyB : exclusifs
     A3      │  C2  │    B3
     A2      │  C1  │    B2
     A1 ─────┴ root ┴─── B1
```

13 compétences, coût total 17. Une clé est toujours exclue, donc 15 points suffisent pour tout le
reste : 1 point de départ + `LEVEL_LIMIT` 14. Courbe `300 + 120 L + 8 L²` (≈ 25 000 XP vanilla au
total, l'équivalent de Trainer's Path vers le niveau 25). Pas de source Puffish (`sources: []`) :
seul le script 59 apporte l'XP.

## Pièges

1. **Pouvoirs donnés par Puffish = « dynamic grants »** (`neofishcompat:unlock_power`). Ils sont
   enregistrés dans les données NeoOrigins et **survivent à un changement d'origine** : Puffish ne
   met pas à jour les récompenses d'une catégorie verrouillée. Chaque pouvoir de capstone porte donc
   `power_condition: neoorigins:origin` + `power_condition_mode: ALLOW` (`lockToOrigin`).
2. **Deux régimes de texte.** NeoOrigins lit `power.<ns>.<id>.name/description` **brut**
   (`Language.getOrDefault`) : un `%` s'écrit `%`. Puffish et les noms d'origine passent par
   `translate`, donc un `%` s'écrit `%%` (y compris dans `fallback`). `tText()` échappe ; `tr()` non.
   N'écrivez pas de `%` dans les descriptions d'origine.
3. **Calques** : sans `replace: true`, NeoOrigins *fusionne* les listes d'origines des datapacks.
   Avec `replace`, seuls les champs écrits remplacent les anciens : écrivez-les tous.
4. Les icônes Puffish des Poké Balls passent par `pixelmon:poke_ball` + composant (`icon()`). Les
   icônes d'origine NeoOrigins sont un simple id d'item.
5. `neofishcompat 1.0.1` exige `neoorigins ≤ 2.2.24` et `puffish_skills ≤ 0.18.3` : bloquez ces
   versions lors des mises à jour.

## En jeu

- Le choix apparaît à la première connexion. Pour changer ensuite, il faut un Orbe d'Origine.
- `/neoorigins set <joueur> neoorigins:origin pixelgo_origins:ranger` force une origine.
- `/neoorigins reset <joueur>` rouvre le choix.
- `/puffish_skills category open <joueur> puffish_skills:origin_ranger` ouvre l'arbre ;
  `/puffish_skills points add <joueur> puffish_skills:origin_ranger 5` ajoute des points.
