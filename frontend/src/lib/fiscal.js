// Miroir cote client de App\Services\FiscalCalculator. Toute page qui affiche un
// apercu de TVA / TTC avant enregistrement doit passer par ici : sinon l'apercu
// et la facture enregistree divergent d'un centime.

/**
 * Arrondi au centime, aligne sur le round() de PHP.
 *
 * Math.round(v * 100) / 100 ne suffit pas : 86.825 * 100 vaut 8682.499999999999
 * en flottant, donc on obtiendrait 86.82 la ou PHP renvoie 86.83. Passer par la
 * notation exponentielle ("86.825e2") fait faire la mise a l'echelle au parseur
 * decimal, qui lui donne bien 8682.5.
 */
export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // Hors de cette plage JS bascule en notation exponentielle ("1e-7") et le
  // truc du "e2" produirait NaN ; aucun montant reel n'y arrive.
  if (Math.abs(n) >= 1e15) return n;
  if (Math.abs(n) < 1e-6) return 0;
  return Number(`${Math.round(Number(`${n}e2`))}e-2`);
}

/**
 * Calcule [non_taxable, taxable, tva, ttc] arrondis au centime pour un type de
 * destination donne ('national' | 'international').
 *
 * Les bases sont arrondies d'abord, puis la TVA et le TTC en sont derives, de
 * sorte que les lignes affichees s'additionnent toujours au total affiche.
 */
export function computeFiscal(typeDestination, taxable, nonTaxable = 0) {
  const isInternational = typeDestination === 'international';
  const taux = isInternational ? 0.2 : 0.1;
  const base = Math.max(0, round2(taxable));
  const nt = isInternational ? Math.max(0, round2(nonTaxable)) : 0;
  const tva = round2(base * taux);
  const ttc = round2(nt + base + tva);

  return { taux, nonTaxable: nt, taxable: base, tva, ttc };
}
