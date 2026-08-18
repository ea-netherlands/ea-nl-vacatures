# EA Nederland — vacaturebord

A curated job board for the Dutch effective altruism community. Built from the
product spec dated 5 August 2026.

The board ingests listings from Dutch government feeds, academic feeds, ATS APIs
for a maintained employer watchlist, and the two main EA job boards; classifies
each one against a two-axis taxonomy; discards the large majority; and promotes a
small shortlist into Sanity as drafts. A curator reviews the shortlist, edits a
one- or two-sentence note explaining why the role matters, and publishes.

**The editorial note is the product. Everything upstream of it is plumbing that
exists to make writing it cheap.**

---

## Quick start

```bash
npm install
npm run migrate   # applies the schema (local PGlite if DATABASE_URL is unset)
npm run seed      # seeds the employer watchlist and sources from Appendix A
npm run dev       # http://localhost:3300/vacatures
```

Nothing above needs credentials. With no `DATABASE_URL` the pipeline runs against
a local PGlite database in `.pgdata/`; with no Sanity project the board renders
its empty states rather than failing.

To run the pipeline against real sources:

```bash
npm run ingest -- --source=wvn-sitemap    # the most important single source
npm run ingest                            # every enabled source
npm run classify                          # needs an Anthropic credential
npm run promote -- --dry-run               # see what would reach the queue
```

---

## What is where

Everything lives under `src/jobboard/` so the eventual merge into the main site
is a folder copy plus a handful of route entries (spec §6.2a).

```
src/jobboard/
  theme/theme.css        THE MERGE SWAP POINT — every design value, scoped to .jb-root
  taxonomy/              the four cause areas, leverage archetypes, the e2g gate
  db/                    schema.sql + a dual-mode client (pg | PGlite)
  ingest/adapters/       one file per source family; adapters are pure
  classify/              stage one (deterministic) and stage two (the model)
  sanity/                schemas, the review queue, the promotion job
  content/               glossary mirror, style guide, interface strings
  components/            the board's UI, CSS Modules only
  pages/                 one implementation per page, shared by both locales
  seed/employers.ts      the watchlist from Appendix A, with its verify flags
src/app/                 thin route wrappers, NL canonical + EN under /en
src/scripts/             the CLI
```

Three rules keep the merge cheap, and all three are good practice anyway:

1. **One top-level directory.** Routes, components, Sanity schemas and the
   ingestion worker all live under `src/jobboard/`.
2. **No global CSS.** Every value comes from `theme/theme.css`, which declares
   its tokens on `.jb-root` rather than `:root` so nothing can leak either way.
   At merge time that file is swapped for the main site's tokens.
3. **The worker is deployable independently.** `runIngest`, `runClassification`
   and `runPromotion` are plain functions with no coupling to the request; the
   cron routes are a thin wrapper over them.

---

## The framing

The board answers one question, and every page is built around it: **how do you
work on the world's largest and most neglected problems from the Netherlands?**

The part that is easy to erode, and shouldn't be: the board says up front that
someone genuinely optimising for impact should look at **80,000 Hours**,
**Probably Good** and the **EA Opportunities board** first, because most of the
strongest roles are not in the Netherlands. Only then does it explain that this
board is for people who cannot or will not relocate — a partner's job, children
in school, caring responsibilities, a residence permit, or simply not wanting to
leave — and that this is a reasonable trade-off rather than a lack of commitment.

That statement appears in three places by design: the full band on the index and
the method page (`InternationalFirst`), and a one-line form on every listing page
(`InternationalNote`), because most visitors arrive at a listing from a
Dutch-language search and never see the index. Copy lives in `content/i18n.ts`
under `intl*`, not in Sanity, so it cannot quietly disappear from a page.

### The four cause areas

`global-health-wellbeing`, `farmed-animal-welfare`, `global-catastrophic-risks`,
`better-futures`. That is the whole vocabulary — see `taxonomy/index.ts`, which
documents what changed from the earlier eight and why.

Two consequences worth knowing:

- **AI work splits across two areas.** Catastrophe-shaped risk (takeover,
  misalignment, catastrophic misuse) is `global-catastrophic-risks`; who holds
  power and which values get locked in is `better-futures`. This is a real
  judgement call on some listings, so the prompt states the boundary explicitly
  and tells the model to use `secondaryCauses` when a role touches both.
- **Effective giving, meta and career capital are not cause areas.** Meta work is
  categorised by the problem it serves. "This is a stepping stone" is a statement
  about leverage, so `career-capital` lives on the leverage axis.

### Climate is out of scope, with a referral

Climate is not a cause area and there is no label for it. The reason is
neglectedness, not importance: it already attracts a great deal of Dutch money,
talent and political attention, and the problems on this board do not. Readers
who want climate work are sent to **Effective Environmentalism**.

This replaced a Giving Green allowlist gate. That gate worked, but it admitted
five organisations — a category nobody browses — and it implied the board held a
view on climate effectiveness that it is not the right project to hold. The
exclusion is recorded in `EXCLUDED_TOPICS` (`taxonomy/index.ts`), fed into the
classifier prompt, rendered on the method and problem-area pages, and the five
removed employers are listed in `OUT_OF_SCOPE` (`seed/employers.ts`) so nobody
re-adds them from Appendix A.

## The one mechanical gate

`earning-to-give` is **never** a judgement call. There are thousands of
well-paid Amsterdam jobs and a classifier will find a plausible case for most of
them; one diluted category would drag down trust in the whole board.

So it is an employer-level boolean, checked **before** the model sees a listing
(the label is simply absent from the options it is given) and enforced **again**
on its output. The double enforcement is deliberate: a model told not to use a
label will occasionally use it anyway.

- **`earning-to-give`** requires `e2g_allowlisted` **and** (`salary_max >=
  E2G_SALARY_FLOOR` **or** `e2g_salary_presumed`).

`src/jobboard/taxonomy/gates.ts`, with tests in `pipeline.test.ts`.

---

## Pipeline

```
sources → raw_listing → listing → stage 1 (free) → stage 2 (model) → Sanity drafts → curator
                                       ↓                  ↓                            ↓
                                   decision           decision                     decision
```

Postgres holds the whole pipeline; Sanity holds only what a human has looked at.
Thousands ingested → tens promoted → a handful published, with every drop logged
in `decision` so the thresholds can be tuned rather than guessed at.

Nothing is auto-published in v1. Revisit that only once there are a few hundred
human decisions to calibrate against.

### Commands

| Command | What it does |
|---|---|
| `npm run migrate` | Applies `schema.sql`. Idempotent. |
| `npm run seed` | Seeds the watchlist and sources. Re-running fills gaps rather than clobbering curator edits. |
| `npm run ingest` | Runs every enabled source. `--source=X` for one, `--discover` to harvest employers from the EA boards. |
| `npm run classify` | Two-stage filter. `--skip-notes` for a cheap threshold-calibration pass. |
| `npm run promote` | Writes the shortlist to Sanity as drafts. `--dry-run` first. |
| `npm run expire` | Auto-unpublishes past expiry. `--linkcheck` for dead-link detection on crawl sources. |
| `npm run grade` | The M3 calibration tool. See below. |
| `npm run pipeline` | ingest → classify → promote, end to end. |
| `npm run mirror-glossary` | Refreshes the glossary mirror and distils the style guide. **Run before generating any page.** |
| `npm run generate-explainers` | Generates the explainer layer, Dutch-first. |
| `npm test` | 39 tests over the deterministic core. |

### Calibrate the thresholds before trusting the queue (M3)

This step is not optional — it is what stops the queue arriving full of noise on
day one and being abandoned.

```bash
npm run grade -- --export=grading.csv   # a sample stratified across the score range
# fill in human_verdict: belongs | borderline | reject
npm run grade -- --import=grading.csv
npm run grade                            # precision/recall at each threshold
```

The report prints precision and recall for every combination of total and cause
threshold, with the current one marked. Change it in `taxonomy/index.ts` once the
table gives you a reason to, not before.

---

## Sources

| Source | Status | Notes |
|---|---|---|
| werkenvoornederland (sitemap) | **Working** — verified live, 1284 vacancies → 52 relevant | CC-0 data. The JSON-LD description is a one-liner, so the adapter takes structured facts from the markup and the body from the page's anchored sections. |
| CSO Vacature API | Disabled pending credentials | No self-service signup. The sitemap crawl covers the same ground, so this is not a blocker. |
| AcademicTransfer | **Working** — verified live | Has full JSON-LD nested under `mainEntity`. Crawl-delay 10s is honoured centrally; the crawl is incremental and budgeted, 25 detail pages per run. |
| Partos | **Working** — verified live | No JSON-LD; the HTML parser is the real path. Resolves the member organisation from the outbound link and uses that as `apply_url`. |
| 80,000 Hours | **Working** — verified live, 197 NL-eligible | Algolia credentials read live from the page each run. Primarily a *discovery* source for the watchlist. |
| Probably Good | **Working** — verified live, 231 NL-eligible | A whitelisted persisted GraphQL query mints a fresh scoped Algolia key each run. Poll at most daily — it is their paid quota. |
| ATS adapters | Built, per-employer | Greenhouse, Ashby, Lever, Workable, Recruitee, Personio, SmartRecruiters, Teamtailor, Breezy, Workday, BambooHR. Every gotcha in §7.2 is handled and commented. |
| EURAXESS | Disabled | Set `config.exportUrl` if an export exists; it may replace the AcademicTransfer crawl. |

Closure detection uses set difference only for sources that return a complete
set. A budgeted crawl does not, so those get a weekly `HEAD` check instead —
marking listings closed from a truncated crawl would silently empty the board.

---

## The Dutch-first explanatory layer

There is no human writer on this project. That is engineered around rather than
wished away, in this order:

1. `npm run mirror-glossary` — mirrors EA NL's **human-translated** glossary and
   distils a style guide from the existing Dutch pages. The glossary is
   authoritative and includes the explicit keep-in-English list, which is the
   part no model can infer. **Do this before writing any page.**
2. `npm run generate-explainers -- --all` — generates each page **natively in
   Dutch**, never translated into it, then runs an adversarial
   anti-translationese pass until it returns no findings.
3. `--en` composes the English versions separately from the same outline. A
   one-sentence note survives machine translation; a page of argument does not.

Pages are written to `content/explainers/*.md` for review whether or not you
`--publish`.

**Residual risk, stated honestly:** this reaches prose that is clearly competent
and probably not distinctive. If anyone at EA NL who reads Dutch comfortably ever
has twenty minutes, spend it reading the method page aloud — text-to-speech makes
stilted prose obvious in a way silent reading does not. That is an offer, not a
dependency.

---

## Deployment

Phase 1 is a standalone app on `vacatures.effectiefaltruisme.nl`, which needs one
DNS record and nothing from the contractor. The board can be fully live, indexed
and in use before the main repo arrives.

1. Create the GitHub repo and a **new** Sanity project (not the main site's).
2. Add the DNS record and deploy to Vercel.
3. Set the environment from `.env.example`. `CRON_SECRET` is not optional — the
   pipeline endpoints are otherwise public.
4. `vercel.json` already carries the cron schedule.

Phase 2 (M8, not urgent): copy `src/jobboard/` in, swap `theme/theme.css` for the
main site's tokens, mount the routes at `/vacatures` and `/en/jobs`, and 301 the
subdomain so accumulated search ranking transfers.

---

## Before launch

Carried from the spec's own verification backlog, and reduced to what is left.

**Resolved during the build** — 80k's Algolia credentials, Probably Good's data
API, AcademicTransfer's JSON-LD, and Partos's access method are all working
against live sources.

**Still needs a person:**

- [ ] Email `helpdesk@werkenvoornederland.nl` for CSO API credentials, and
      confirm the read API is still supported. Longest lead time; start first.
- [ ] Email 80,000 Hours, Probably Good and Partos for explicit reuse
      permission. One email each, removes the only real ambiguity in the stack.
- [ ] Create the GitHub repo, the Sanity project, and the DNS record.
- [ ] Decide who owns the classifier API key and its budget.
- [ ] Work through the 26 watchlist entries flagged `VERIFY` — `npm run seed`
      prints them.
- [ ] Live-test the ATS endpoints marked unverified in §7.2 (SmartRecruiters,
      Workday, BambooHR, Teamtailor bodies, Personio `.de` vs `.com`).
- [ ] Check Google's current job-posting guidance for aggregators that link out
      before launch. We set `directApply: false`, which is honest for a
      link-out board, but the guidance moves.
- [ ] Have a Dutch lawyer glance at §10 if anything there feels close to the line.
- [ ] Hand-grade 100 classifications (`npm run grade`) before wiring the queue
      into anyone's week.
- [ ] Seed 25–40 listings by hand before anyone sees the board. Launching an
      empty board is the most reliable way to ensure nobody returns.

**Worth doing alongside launch:** EA NL's existing AI safety career guide has
aged — it recommends Catalyze Impact and Timaeus without noting that Catalyze is
a Colorado 501(c)(3) and Timaeus has merged into Resolution. A board that launches
pointing at a stale guide gives the impression of a resource that isn't maintained.

---

## Two deliberate departures from the spec

1. **The review queue uses Tabler icons, not emoji.** The spec sketches the
   Structure Builder view with emoji; the EA NL design system forbids emoji
   anywhere. The curator lives in that queue daily, so it gets real icons.
2. **The model split is explicit and configurable.** §8.4 asks for a small fast
   model for triage and the strongest for prose. That is the default, set in
   `lib/anthropic.ts` and overridable per environment, so it can be re-tuned
   after the M3 grading pass without touching code.

---

## Metrics

Because the primary user is someone who doesn't know EA exists, the headline
metrics are reach and comprehension, not placements. Expect organic search to be
near zero for the first two or three months — that is the normal shape, not a
failure signal. Set the real review at three months.

The pipeline records what those metrics need: `apply_click` for outbound
click-through per listing (server-side, so it survives ad blockers), and
`decision` for promotion precision and curator throughput. The quality gate that
sits above all of them is the share of listings at organisations appearing on
neither 80k nor Probably Good — the `onEaBoards` flag on `employer` is there to
measure it.
