# Website edits for linking the job board

Hand this to whoever manages Sanity for effectiefaltruisme.nl. Part 1 is
content only and can be done in the Studio today. Part 2 needs the site's
developer and is not ready yet — it is here so the plan is written down in one
place.

Right now the main site does not link to the board at all. The career guide
lists 80,000 Hours and Probably Good under job boards, but not our own, so
almost everyone who finds the board arrives from search.

**Do Part 1 once the review queue is being cleared daily.** The board went
three weeks without a new listing in September 2026. Sending the site's
visitors to a board that looks unmaintained costs more than not linking to it.
The daily review mail (see README, "The daily review loop") is what fixes that;
wait until a week of it has kept the newest listing under a few days old.

---

## Part 1 — links (content only)

### 1. Career guide: add the board next to 80,000 Hours (required)

On `/carrieregids`, in the section **Vacaturebanken en talentendirectories**,
add a card **directly after** "80,000 Hours' job board". That card already says
it suits people willing to move abroad; ours is for people who are not, so the
two read as a pair.

- Title: **Vacaturebord van EA Nederland**
- Text: *Een korte, met de hand samengestelde lijst met banen in Nederland, met
  bij elke vacature onze reden erbij. Voor wie niet naar het buitenland kan of
  wil verhuizen.*
- Link: `https://vacatures.effectiefaltruisme.nl/vacatures`

On the English career guide, the same card:

- Title: **EA Netherlands job board**
- Text: *A short, hand-picked list of roles in the Netherlands, each with our
  reason for listing it. For people who can't or would rather not move
  abroad.*
- Link: `https://vacatures.effectiefaltruisme.nl/en/jobs`

Please keep "impactvol" and "impactful" out of this copy. The board avoids both
on purpose, and its method page explains why.

### 2. Footer: add a link under the career guide (required)

The footer lists Introductiecursus, Vrijwilligerswerk, Artikelen,
Carrièregids, Donatiegids and so on. Add, directly after **Carrièregids**:

- Dutch: **Vacatures** → `https://vacatures.effectiefaltruisme.nl/vacatures`
- English: **Jobs** → `https://vacatures.effectiefaltruisme.nl/en/jobs`

### 3. Header: add "Vacatures" (optional, later)

The header carries only Evenementen and Introductiecursus, which is a
deliberate, short list. Adding a third item is a design call for whoever owns
the site. The suggestion is to leave it until the board's beta label comes off,
then add **Vacatures** / **Jobs** after Introductiecursus.

### 4. No other changes

- The board already links back to the site: the introductiecursus, the
  carrièregids, the begrippenlijst, the newsletter and the contact page. None of
  that needs touching.
- Don't copy listings into the main site's CMS. The board has its own Sanity
  project on purpose, so thousands of job documents stay out of the dataset the
  team uses for everything else.

---

## Part 2 — serve the board at effectiefaltruisme.nl/vacatures (not ready yet)

Later, the board can live on the main domain without merging the two codebases.
Both are Next.js on Vercel, and the board already uses the paths it would have
there — `/vacatures` in Dutch and `/en/jobs` in English — so the main site only
has to forward those paths to it.

**Main site (the developer):** add rewrites in `next.config`, forwarding
`/vacatures/:path*` and `/en/jobs/:path*` to the same paths on
`vacatures.effectiefaltruisme.nl`, plus the board's asset prefix. This is the
Next.js multi-zone setup.

**Board (us), before the main site changes anything:**

- serve its own scripts and styles under a distinct `assetPrefix`, so they do
  not collide with the main site's `/_next/`;
- move its fonts from `/fonts/` to a path under that prefix, for the same
  reason;
- set `NEXT_PUBLIC_SITE_URL` to `https://effectiefaltruisme.nl`, so canonical
  URLs, the sitemap and structured data name the main domain;
- once the rewrites are live, redirect the subdomain to the main domain (301),
  so the search ranking it has built moves across.

The studio (`/studio`), the review dashboard (`/review`) and the cron and
decision endpoints stay on the subdomain. Nobody outside the team needs them on
the main domain.

This replaces the full folder merge described as M8 in the README. That merge
remains possible, but nothing about linking the two sites requires it.
