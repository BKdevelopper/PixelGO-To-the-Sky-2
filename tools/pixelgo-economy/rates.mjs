/**
 * Gains par heure des sources d'argent du pack, AVANT / APRÈS l'équilibrage.
 * Toutes les vitesses sont lues dans les configs ou les recettes ; les hypothèses de jeu
 * (joueur actif, pas d'accélérateur de temps) sont écrites en clair à côté de chaque ligne.
 *
 * Usage :  node tools/pixelgo-economy/rates.mjs
 */
const H = 3600; // secondes par heure

// Prix de revente (avant -> après)
const P = {
  crop: [40, 40], seed: [10, 10], flint: [40, 0], bone: [40, 1], gunpowder: [40, 1], magma: [40, 1],
  pearl: [40, 1], mushroom: [40, 3], mushroomBlock: [400, 1], berry: [150, 40], sugar: [45, 12],
  enchCobble: [95, 0]
};
const rows = [];
const add = (name, before, after, note) => rows.push({ name, before: Math.round(before), after: Math.round(after), note });

// 1. Ferme manuelle — référence de PROGRESSION-TRAME.md : ~800 unités/h
add('Ferme manuelle (référence)', 800 * 40, 800 * 40, '800 cultures/h, inchangé : c\'est l\'ancre');

// 2. Tamis à la main, terre, maillage ficelle — ~2 400 blocs/h
const dirtBefore = 0.125 * 10 + (0.1 + 0.1 + 0.1) * 40 + 0.05 * 5 + 0.25 * 40;
const dirtAfter = 0.05 * 10 + (0.01 * 3) * 40 + 0.05 * 5 + 0.25 * 0;
add('Tamis manuel (terre, ficelle)', 2400 * dirtBefore, 2400 * dirtAfter, `${dirtBefore.toFixed(1)} $ -> ${dirtAfter.toFixed(2)} $ par bloc`);

// 3. Tamis automatique Ex Compressum (autoSieveSpeed 0.1 -> 10 ticks/bloc = 7 200 blocs/h), terre achetée 1 $
add('Tamis auto (terre, ficelle), net de la terre', 7200 * (dirtBefore - 1), 7200 * Math.max(0, dirtAfter - 1), 'terre au distributeur à 1 $');
// 3 bis. Tamis compressé auto (autoHeavySieveSpeed 0.05 -> 1 bloc/s), terre compressée, netherite
add('Tamis compressé auto (terre, netherite)', 3600 * 504, 3600 * 0, '504 $ -> 0 $ par bloc (plus de culture ni de silex vendable)');

// 4. Générateur de cobble netherite (64 blocs / 5 ticks = 768/s) -> pierre enchantée (160 = 95 $)
add('Générateur cobble netherite -> pierre enchantée', 768 * H / 160 * 95, 0, 'la pierre enchantée ne se revend plus');
add('Générateur cobble netherite -> distributeur', 768 * H * 1, 0, 'cobble acheté 2 $ / racheté 1 $ -> 1 $ / 0 $');

// 5. Botany Pot à entonnoir, blé (1200 -> 2400 ticks, terre labourée +10 %)
const potBefore = (72000 / (1200 / 1.1)) * (40 + 2.7 * 10);
const potAfter = (72000 / (2400 / 1.1)) * 40;
add('Botany Pot à entonnoir (blé)', potBefore, potAfter, '1 blé + ~2,7 graines -> 1 blé, pousse x2 plus lente');
add('Power Pot III (blé)', potBefore * 8 * 4, potAfter * 4 * 2, 'vitesse x8 rendement x4 -> x4 / x2');

// 6. Essence de nature Mystical Agriculture en pot (1 essence / ~1200 ticks)
add('Pot Mystical Agriculture (essence de nature)', 60 * (320 / 3), 60 * 40, '8 blés / 3 essences -> 1 culture / essence');

// 7. Minion de blé palier I (15 s x speedMultiplier x 2 actions)
add('Minion de blé, palier I', H / (15 * 0.3 * 2) * 40, H / (15 * 0.75 * 2) * 40, 'speedMultiplier 0,3 -> 0,75');
add('Minion de blé, palier max', H / (7 * 0.3 * 2) * 40, H / (7 * 0.75 * 2) * 40, 'stockage 15 cases à vider');

// 8. Pay Day, Pokémon niveau 100, 20 utilisations (PP) par combat, Pièce Rune x2, Happy Hour x2, 1 combat / min
add('Pay Day (niv. 100, Pièce Rune + Happy Hour)', 60 * 20 * 100 * 5 * 4, 60 * 20 * 100 * 0.05 * 4, 'pay-day-multiplier 5 -> 0,05 ; paye même en fuyant');
add('G-Max Gold Rush (Miaouss Gigamax, 3 tours)', 60 * 3 * 100 * 100 * 4, 60 * 3 * 100 * 0.2 * 4, 'multiplicateur 100 -> 0,2');

// 9. Champignon géant à la poudre d'os (~45 blocs de chapeau, 1 cycle / 5 s avec FTB Ultimine)
add('Champignon géant + Toucher de soie', 720 * 45 * 400, 720 * 45 * 1, 'bloc de champignon 400 $ -> 1 $');
add('Champignon géant sans Toucher de soie', 720 * 13 * 40, 720 * 13 * 3, '~13 champignons par cycle, 40 $ -> 3 $');

// 10. Distributeur : bloc de slime 45 $ -> 9 boules à 40 $
add('Arbitrage bloc de slime (1 clic = 1 pile)', 64 * (9 * 40 - 45) * 600, 0, '600 clics/h ; les boules ne se revendent plus');
add('Arbitrage argile -> boules (Recycler)', 64 * (4 * 40 - 3) * 600, 0, 'boule d\'argile 40 $ -> 0 $');
add('Broyeur Cyclic : canne -> 3 sucres', 7200 * (3 * 45 - 40), 7200 * Math.max(0, 3 * 12 - 40), 'sucre 45 $ -> 12 $');

// 11. ProjectE : un collecteur final (ordre 1e9 EMC/s) + transmutation du pain (140 $, EMC ~72)
add('ProjectE fin de partie -> pain transmuté', 1e9 / 72 * 140 * H, 0, 'plus aucun objet revendable n\'a d\'EMC');

// 12. Ticket horaire (MK 0 = 8 cannes enchantées = 1 280 cannes ≈ 51 200 $ de ventes)
add('Ticket horaire (valeur en cultures), AFK 1 h', 2 * 1280 * 40, 0, '30 min -> 60 min, et seul le temps actif compte');

const fmt = (n) => n.toLocaleString('fr-FR').replace(/ /g, ' ');
console.log('| Source | Avant ($/h) | Après ($/h) | Pourquoi |');
console.log('|---|---:|---:|---|');
for (const r of rows) console.log(`| ${r.name} | ${fmt(r.before)} | ${fmt(r.after)} | ${r.note} |`);
