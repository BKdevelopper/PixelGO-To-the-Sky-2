// priority: 1000
/* =============================================================================
 *  PixelGO — To the Sky : utilitaires partagés par les scripts de recettes
 * =============================================================================
 *  Chargé en premier (priority 1000) pour que 10_/20_/30_ puissent s'en servir.
 * ========================================================================== */

/**
 * Ingrédient « singularité <id> » d'Extended Crafting.
 *
 * 1.16.5 : { "type": "forge:nbt", "item": "extendedcrafting:singularity",
 *            "nbt": "{Id:\"extendedcrafting:coal\"}" }
 * 1.21.1 : le NBT est devenu le composant `extendedcrafting:singularity_id`,
 *          et Forge:nbt est devenu l'ingrédient NeoForge `neoforge:components`.
 */
const PIXELGO_SING_ING = function (id) {
  return {
    type: 'neoforge:components',
    items: 'extendedcrafting:singularity',
    components: { 'extendedcrafting:singularity_id': 'extendedcrafting:' + id }
  }
}


/* -----------------------------------------------------------------------------
 *  POKÉ BALLS
 * -----------------------------------------------------------------------------
 *  ATTENTION : malgré les modèles `pixelmon:dusk_ball`, `pixelmon:master_ball`…
 *  présents dans le jar, Pixelmon 9.4 n'enregistre TOUJOURS qu'un seul item
 *  `pixelmon:poke_ball` (et `pixelmon:poke_ball_lid`). Le type de ball est porté
 *  par le composant de données `pixelmon:poke_ball`.
 *
 *  1.16.5 : Item.of('pixelmon:poke_ball', '{PokeBallID:"dusk_ball"}')
 *  1.21.1 : Item.of('pixelmon:poke_ball', '{"pixelmon:poke_ball":"dusk_ball"}')
 *
 *  C'est exactement ce que fait Pixelmon dans
 *  data/pixelmon/recipe/pokeball/ball/dusk_ball.json.
 * -------------------------------------------------------------------------- */

/* ATTENTION — `Item.of('id', '{…}')` ne fonctionne PAS en KubeJS 2101.
 * Les seules surcharges sont :
 *     of(stack) · of(stack, DataComponentMap)
 *     of(stack, int) · of(stack, int, DataComponentMap)
 * Rhino interprète alors la chaîne JSON comme le `count` et échoue avec
 * « Cannot convert {…} to int ».
 *
 * Pour un RÉSULTAT de recette, on écrit donc le JSON brut :
 *     result: { id: 'pixelmon:poke_ball', count: 3,
 *               components: { 'pixelmon:poke_ball': 'dusk_ball' } }
 * Pour un INGRÉDIENT, on utilise PIXELGO_BALL_ING / PIXELGO_LID_ING ci-dessous.
 *
 * Le bloc `result` d'une Poké Ball, prêt à insérer dans event.custom().        */
const PIXELGO_BALL_RESULT = function (name, count) {
  return {
    id: 'pixelmon:poke_ball',
    count: count || 1,
    components: { 'pixelmon:poke_ball': name }
  }
}

/** Ingrédient strict « Poké Ball <name> » (pour les recettes en JSON brut). */
const PIXELGO_BALL_ING = function (name) {
  return {
    type: 'neoforge:components',
    items: 'pixelmon:poke_ball',
    components: { 'pixelmon:poke_ball': name },
    strict: true
  }
}

/** Ingrédient strict « couvercle <name> ». */
const PIXELGO_LID_ING = function (name) {
  return {
    type: 'neoforge:components',
    items: 'pixelmon:poke_ball_lid',
    components: { 'pixelmon:poke_ball': name },
    strict: true
  }
}
