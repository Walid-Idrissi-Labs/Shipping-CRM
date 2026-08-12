# Production deploy log — dpex-maroc.com

**What this file is for.** Deploys to OVH shared hosting go straight from the local working
tree over SFTP, so nothing about shipping produces a git commit on its own. That means
`git status` and `git diff` cannot answer "is this live yet?" — they only show what differs
from the last commit, which could be arbitrarily stale relative to production.

This file closes that gap. **Every production deploy gets an entry here and a matching
commit + tag pushed to GitHub.** If a change is described below, it is live. If it is in the
working tree but not below, it is not.

> Note: `MAINTENANCE.md` (the full shipping playbook: SFTP commands, phpMyAdmin migration
> process, hosting constraints) is deliberately gitignored and stays local-only. This log is
> the tracked, pushed counterpart — it records *what* shipped and *when*, not *how*.

## The convention

1. Ship to production following `MAINTENANCE.md`.
2. Add an entry at the top of the log below.
3. Commit the round's code together with this file: `deploy(prod): <short summary>`.
4. Tag it `prod-YYYY-MM-DD` (add `-2`, `-3` for a second or third deploy in one day) and push
   both the branch and the tag:
   ```bash
   git tag prod-YYYY-MM-DD
   git push origin main --tags
   ```

`git describe --tags` then answers "which commit is live?", and `git log prod-YYYY-MM-DD..HEAD`
answers "what have I written since that hasn't shipped?"

An entry records: what changed, any **migrations** that were run by hand in phpMyAdmin (these
do not travel with the code, so this is their only record), and any **production `.env`
changes** (the production `.env` is never uploaded, so its edits leave no trace anywhere else).

---

## 2026-08-12 (2) — Arrondi fiscal: le total enregistré est celui de l'écran de création

Tag: `prod-2026-08-12-2`

**Corrige et remplace la manche (1) ci-dessous**, dont le diagnostic était faux. À déployer
même si (1) est déjà en ligne.

Le vrai mécanisme de l'écart d'un centime : les deux côtés calculaient déjà la **même**
somme (330,81 + 86,825 + 17,37 = 435,004999999999995 en flottant), mais ne l'arrondissaient
pas pareil. `toFixed(2)` en JS arrondit la valeur binaire exacte → 435,00 ; `round()` en PHP
« recale » d'abord le nombre sur son écriture décimale courte (435,005) puis arrondit vers le
haut → 435,01. L'écran de création annonçait donc 435,00 et la base enregistrait 435,01.

La manche (1) avait attribué ça à l'ordre des opérations et arrondissait la base taxable
avant d'en dériver la TVA — ce qui donnait bien deux écrans cohérents, mais à 435,01, soit un
centime de trop facturé au client. C'est le total de l'écran de création qui est le bon :
330,81 + 86,825 × 1,20 = 435,00 exactement.

Correctif : la TVA et le TTC repartent de la base **saisie** (l'arrondi de la base n'est que
de l'affichage), et `FiscalCalculator::round2()` reproduit la règle de `toFixed(2)` — arrondi
du développement décimal exact du double, en s'écartant de zéro sur une égalité parfaite.
`sprintf('%.2f')` ne convenait pas : sur une égalité binaire exacte (23,295 + 2,33 = 25,625,
représentable tel quel) il arrondit au pair, 25,62, là où l'écran de création donne 25,63.

Vérifié sur 53 601 cas (dont toutes les égalités exactes) : 0 écart entre PHP et le calcul
JS d'origine. `tests/Unit/FiscalCalculatorTest.php` fige la règle, et
`tests/Feature/InvoiceRoundingTest.php` vérifie le trajet complet POST → base → page de
détail (il échouait avant ce correctif).

Backend (`FiscalCalculator.php`) + frontend (`lib/fiscal.js`, écrans facture et avoir).
Pas de migration, pas de changement `.env`.

**À retenir sur la lecture des montants :** avec une base saisie à 3 décimales, les lignes
imprimées (330,81 + 86,83 + 17,37) peuvent totaliser un centime de plus que le total (435,00).
C'est voulu : le total suit la base réellement saisie, seul son affichage est arrondi. Saisir
des bases à 2 décimales fait disparaître le cas. La requête SQL de la manche (1) qui cherchait
les lignes ne s'additionnant pas au total n'a donc plus lieu d'être — elle remonterait des
factures parfaitement normales.

---

## 2026-08-12 (1) — Arrondi fiscal: les lignes d'une facture s'additionnent enfin au total

> ⚠️ Diagnostic erroné, corrigé par la manche (2) ci-dessus. Conservé pour la trace.

Tag: `prod-2026-08-12`

Bug d'un centime entre l'écran de création d'une facture et sa page de détail / son PDF.

`FiscalCalculator` stockait une base taxable **arrondie** au centime, mais dérivait la TVA
et le TTC de la base **brute**. Avec une saisie à 3 décimales (86,825), la facture affichait
donc 330,81 + 86,83 + 17,37 mais un total de 435,00 — un document fiscal dont les lignes ne
s'additionnent pas au total, en plus d'un écart d'un centime avec l'aperçu de création.

Correctif : les bases (`non_taxable`, `taxable`) sont arrondies **avant** d'en dériver la TVA
et le TTC, ce qui rend `ttc = non_taxable + taxable + tva` vrai par construction sur les
valeurs stockées. Le même ordre de calcul est appliqué côté frontend via un nouveau module
partagé `frontend/src/lib/fiscal.js`, utilisé par l'écran facture et l'écran avoir. Son
arrondi passe par la notation exponentielle (`"86.825e2"`) pour reproduire exactement le
`round()` de PHP, là où `Math.round(v * 100) / 100` divergerait d'un centime.

Comme tout passe par `FiscalCalculator`, la création, la modification, l'aperçu PDF et les
avoirs sont corrigés d'un coup. Couvert par `tests/Unit/FiscalCalculatorTest.php` (invariant
+ cas 3 décimales), et le miroir JS a été comparé à PHP sur 803 cas aléatoires : 0 écart.

Backend (`FiscalCalculator.php`) + frontend. Pas de migration, pas de changement `.env`.

**Factures déjà émises :** ce correctif n'agit que sur les documents créés à partir de
maintenant. Requête en lecture seule pour repérer d'éventuelles lignes anciennes
incohérentes (à passer dans phpMyAdmin) :

```sql
SELECT id, numero_n, annee, non_taxable, taxable, tva, ttc,
       ROUND(non_taxable + taxable + tva, 2) AS ttc_attendu
FROM factures
WHERE ROUND(non_taxable + taxable + tva, 2) <> ROUND(ttc, 2);
```

---

## 2026-08-11 (7) — Solde impayé: plain colored text instead of pills

Tag: `prod-2026-08-11-7`

Small visual tweak to round (6): the "Solde impayé" column on the client list rendered
amounts as pill badges — dropped in favor of plain right-aligned colored text (same
green/amber/red logic), matching the plainer accent-colored-text pattern already used
elsewhere in the app (e.g. facture amounts on the client detail page) rather than a pill.

Frontend-only (`Clients.jsx`). No migrations, no `.env` changes.

---

## 2026-08-11 (6) — Solde impayé column on the client list, alert threshold setting

Tag: `prod-2026-08-11-6`

Two related changes to how a provider tracks unpaid client balances:

- On the client detail page's "Factures du Client" total (shipped in round 5 as "Total net
  TTC"), the total now correctly counts only unpaid (`impayee`) entries, netting any avoirs
  tied to an unpaid facture. Relabeled "Total net TTC impayé". Frontend-only
  (`ClientDetail.jsx`).
- The provider's client list page: the "Ville" column is gone, replaced by a sortable
  "Solde impayé" column showing each client's net unpaid TTC balance (unpaid factures minus
  avoirs tied to unpaid factures), computed server-side in one aggregate query per page —
  no N+1. Color-coded: green at exactly 0, red above a configurable per-provider threshold,
  amber in between. The threshold is a new setting under Réglages → Facturation → "Seuil
  d'alerte solde impayé", defaulting to 5000 MAD.

**Migration run in phpMyAdmin:**
```sql
alter table `providers` add `unpaid_alert_threshold` decimal(10, 2) not null default '5000';
```
Tracking insert (batch number derived from `SELECT MAX(batch) FROM migrations;` at deploy
time, not from the local Docker verification run):
```sql
INSERT INTO migrations (migration, batch) VALUES ('2026_08_11_000002_add_unpaid_alert_threshold_to_providers_table', N);
```
Verified against a disposable local MySQL 8.0 (Docker) brought up to production's current
migration baseline before applying — `SHOW COLUMNS` confirmed `decimal(10,2) default
5000.00` lands exactly as intended.

No production `.env` changes.

---

## 2026-08-11 (5) — Client detail: total on the factures list

Tag: `prod-2026-08-11-5`

The provider's client detail page now shows a net total under the "Factures du Client"
list, in the same box, right below the table. It sums TTC across all factures and avoirs
shown for that client, netting avoirs as negative — matching the visual pattern already
used for "Total TTC" on the invoice detail page (top border divider, bold amount in the
brand color).

Frontend-only change (`frontend/src/pages/provider/ClientDetail.jsx`). No migrations, no
`.env` changes.

---

## 2026-08-11 (4) — Réclamations refresh themselves

Tag: `prod-2026-08-11-4`

A réclamation conversation now updates on its own while it is open, so a reply appears
without the other person reloading the page. Polling, not WebSockets — nothing new runs on
the server, it is the same `GET` the page already made.

- Both conversation pages (client and provider) refresh on a tiered cadence: **30s** while a
  message is under 2 minutes old, **2 min** up to 10 minutes, **5 min** after that. Fast only
  during a live exchange, which costs a few dozen extra requests per conversation rather than
  per day.
- **Refresh stops entirely while the tab is hidden** and catches up the moment it comes back.
  This is not only about load: opening a conversation marks it read, so refreshing in a
  background tab would mark replies read for someone who is not looking at them and the
  unread badge would never appear.
- The client unread badge and the provider pending-count outline also refresh every 2 minutes,
  so someone parked on one page still finds out that the other side wrote.
- Fixed along the way: sending a reply used to blank the whole conversation behind the loading
  screen for over a second. It now updates in place, and a new message fades in.
- A background refresh that fails is now silent — previously any failed load of a conversation
  redirected back to the list, which on a refresh would have thrown someone off the page
  mid-reply over a brief network blip.

Frontend only. No migrations. No production `.env` changes.

---

## 2026-08-11 (3) — Neutral réclamation form placeholder

Tag: `prod-2026-08-11-3`

The "Sujet" field on the client réclamation/remarque form (`/client/reclamations`) had a
placeholder giving a damaged-package example (`"Ex. : Colis endommagé à la livraison"`),
which read as alarming rather than instructional. Changed to a neutral prompt
(`"Résumez votre demande en quelques mots"`) describing what to put in the field instead of
suggesting something went wrong.

No migrations. No production `.env` changes.

---

## 2026-08-11 (2) — Remarques & Réclamations

Tag: `prod-2026-08-11-2`

Clients en compte can now open a remarque or a réclamation and hold a conversation with us
about it, instead of it arriving by phone or WhatsApp with no trace.

- New client section (`/client/reclamations`): list, an inline create form, and the thread.
  A thread has a reference (`REC-2026-0001`), a type (remarque or réclamation), and can
  optionally be attached to one of the client's own expéditions or factures.
- New provider section (`/dashboard/reclamations`): inbox with status tabs, thread view with
  the client panel, the linked document, and the Ouverte / En traitement / Résolue control.
- Only a client can open a thread. Replying is either side. A team reply moves `ouverte` to
  `en_traitement`; a client reply to a `resolue` thread reopens it to `en_traitement`.
- Unread is tracked per side by message id (not timestamp — whole-second timestamps make a
  message written in the same second as the read mark look "not new"). Provider gets the
  usual green sidebar outline via `pending-counts`; client gets a count badge in the sidebar
  and a dot on the mobile tab bar.
- Text only — no attachments. Throttles are deliberately loose (6 new threads/hour, 20
  messages/min per user); these are known, paying clients.

**⚠️ Order matters on this one:** run the SQL below **before** uploading the files.
`GET /api/dashboard/pending-counts` now counts réclamations and fires on every provider
navigation — code live against a missing table would 500 the whole provider dashboard.

**Migrations run in phpMyAdmin:**
- `2026_08_11_000001_create_reclamations_tables` — creates `reclamations` and
  `reclamation_messages`

No production `.env` changes.

---

## 2026-08-11 — Simplify account-request delete confirmations

Tag: `prod-2026-08-11`

The "Rejeter" and "Supprimer définitivement" confirmations on a demande de compte
(`AccountRequests.jsx`) no longer require typing "supprimer" — both are now a plain
title/description with Confirm/Cancel buttons.

No migrations. No production `.env` changes.

---

## 2026-08-10 — IP origin tracking, blocking, and bot traps on public forms

Tag: `prod-2026-08-10`

Spam on the public forms was arriving with no way to tell where it came from or to stop a
repeat offender. Public submissions now record their origin, the provider can see it, and can
block the address.

- Public devis and compte submissions record the submitting IP, the raw `X-Forwarded-For`
  header, and a bot-signal flag.
- Provider sees "Origine de la demande" on both demande detail views: IP, approximate
  city/country, ISP, and how many demandes that address has sent versus how many were
  accepted.
- Blocking an address returns 403 on all public form submissions and drops public tracking
  from 30/min to 3/min for it. Blocking is refused for the provider's own IP and for
  private/reserved addresses.
- New "Adresses IP bloquées" card in Paramètres: location, block date, refused-attempt
  counter, unblock.
- Honeypot field and submit-timing check on both public forms — conclusive bot signals are
  refused outright; a missing timing measurement is only flagged, never refused.
- Geolocation via ipinfo.io, resolved lazily when a provider opens a demande (never during a
  visitor's submission) and cached permanently per IP.
- Fixed: a failed public-form submission left the error banner scrolled out of view, so a
  refused visitor saw nothing change and simply clicked submit again.

**Migrations run in phpMyAdmin:**
- `2026_08_10_000001_add_origin_tracking_to_public_requests` — adds `ip_address`,
  `ip_forwarded_for`, `bot_signal` (+ index on `ip_address`) to `quote_requests` and
  `account_requests`
- `2026_08_10_000002_create_ip_geolocations_table`
- `2026_08_10_000003_create_blocked_ips_table`

**Production `.env` changes:**
- `IPINFO_TOKEN` added — needed for city/country. Without it the app shows the raw IP and
  makes no outbound call.
- `TRUSTED_PROXIES` added, deliberately **left empty**. See the open item below.

**⚠️ Open item — IP accuracy is unverified in production.** Nobody knows yet whether OVH puts
a proxy in front of PHP. Empty `TRUSTED_PROXIES` is the safe default: a forged
`X-Forwarded-For` can never be trusted, so a wrong setting is useless rather than
exploitable. Real traffic will settle it — if demandes show a private `ip_address`
(`127.0.0.1`, `10.x`, `192.168.x`) next to a public `ip_forwarded_for`, there is a proxy and
`TRUSTED_PROXIES` must be set. **Until then, treat IP blocking as unverified.** The UI already
detects this state, says so in French, and hides the block button rather than let one address
stand in for every visitor. Background: `config/security.php`.

---

## ~2026-08-07 — Timezone removal, header clock

Tag: `prod-2026-08-07`

> **Date reconstructed**, not recorded at the time — this round predates the log and was
> confirmed live retroactively. Treat the date as approximate; the contents are accurate.

- Removed the per-provider timezone setting and the future-date validation built on it
  (`ValidatesFutureDate`, `TimezonePreview`, `ProviderTimezoneTest` all deleted).
- Added a live clock to the provider header (`HeaderClock`).
- Shipment status dates covered by `ShipmentStatusDateTest` instead.

**Migration run in phpMyAdmin:**
- `2026_08_07_000000_drop_timezone_from_providers_table`

---

## Before this log

Everything committed before `prod-2026-08-07` predates this log and its deploy status was
never recorded. Assume it is live — the app has been in production throughout — but there is
no per-round record of when any of it shipped.
