// Miroir cote client de App\Services\FiscalCalculator. Toute page qui affiche un
// apercu de TVA / TTC avant enregistrement doit passer par ici : sinon l'apercu
// et la facture enregistree divergent d'un centime.
//
// La reference, c'est ce fichier : le round2() de FiscalCalculator est ecrit pour
// reproduire toFixed(2) ci-dessous, pas l'inverse. Si la regle d'arrondi change
// ici, elle doit changer la-bas aussi (tests/Unit/FiscalCalculatorTest.php).

/** Arrondi au centime. */
export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return +n.toFixed(2);
}

/**
 * Calcule [non_taxable, taxable, tva, ttc] pour un type de destination donne
 * ('national' | 'international').
 *
 * La TVA et le TTC sont derives de la base SAISIE, pas de la base arrondie : pour
 * 86,825 le TTC vaut 330,81 + 86,825 * 1,20 = 435,00. Arrondir la base a 86,83
 * d'abord donnerait 435,01, soit un centime de trop facture au client. Seul
 * l'affichage de la base est arrondi — c'est pour ca qu'une base a 3 decimales
 * peut donner des lignes affichees dont la somme differe d'un centime du total.
 */
export function computeFiscal(typeDestination, taxable, nonTaxable = 0) {
  const isInternational = typeDestination === 'international';
  const taux = isInternational ? 0.2 : 0.1;
  const base = Math.max(0, Number(taxable) || 0);
  const nt = isInternational ? Math.max(0, Number(nonTaxable) || 0) : 0;
  const tva = round2(base * taux);
  const ttc = round2(nt + base + tva);

  return { taux, nonTaxable: round2(nt), taxable: round2(base), tva, ttc, rawTaxable: base, rawNonTaxable: nt };
}
