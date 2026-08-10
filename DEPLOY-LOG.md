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
