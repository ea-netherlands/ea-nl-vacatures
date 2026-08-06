/**
 * Shown at /studio when no Sanity project is configured yet.
 *
 * This is the curation surface, so the person who lands here first is likely EA
 * NL staff rather than whoever set the repo up. A crash tells them nothing; the
 * M0 checklist tells them exactly what is missing and why the board still works
 * without it.
 */

import { Container, Hero, Section } from '@jobboard/components/Chrome'
import { Icon } from '@jobboard/components/Icon'
import u from '@jobboard/components/ui.module.css'
import s from '@jobboard/components/layout.module.css'

export function SetupNeeded() {
  return (
    <div className="jb-root" lang="nl">
      <Hero
        title="Nog één stap: het Sanity-project"
        lead="De redactieomgeving heeft een Sanity-project nodig. Het vacaturebord zelf werkt al wel — het laat alleen nog geen vacatures zien."
      />
      <Container>
        <Section first>
          <div className={s.prose}>
            <h2 className={s.sectionHeading}>Wat je moet doen</h2>
            <ol
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                paddingLeft: 'var(--space-6)',
                lineHeight: 'var(--lh-relaxed)',
              }}
            >
              <li>
                Maak een <strong>nieuw</strong> project aan op{' '}
                <a href="https://sanity.io/manage" rel="noopener">
                  sanity.io/manage
                </a>
                . Niet het project van de rest van de website: het bord houdt duizenden
                vacaturedocumenten uit die dataset, en een eigen project is gratis en vanaf de
                eerste dag eigendom van EA Nederland.
              </li>
              <li>
                Zet de project-id in <code>.env.local</code>:
                <pre
                  style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    background: 'var(--bg-muted)',
                    borderRadius: 'var(--radius-card)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    overflowX: 'auto',
                  }}
                >
                  {`NEXT_PUBLIC_SANITY_PROJECT_ID=jouw-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=token-met-editor-rechten`}
                </pre>
              </li>
              <li>
                Voeg <code>http://localhost:3300</code> toe aan de toegestane herkomsten (CORS) in
                het Sanity-dashboard, met inloggegevens toegestaan.
              </li>
              <li>
                Start de server opnieuw. Deze pagina wordt dan de beoordelingswachtrij.
              </li>
            </ol>

            <div style={{ marginTop: 'var(--space-8)' }}>
              <div className={u.callout + ' ' + u.calloutInfo}>
                <span className={u.calloutIcon}>
                  <Icon name="info-circle" />
                </span>
                <div>
                  Het <code>SANITY_API_WRITE_TOKEN</code> heeft alleen de promotie- en
                  verlooptaak nodig. Zonder dat token kun je hier al wel inloggen en redigeren.
                </div>
              </div>
            </div>

            <h2 className={s.sectionHeading} style={{ marginTop: 'var(--space-12)' }}>
              Wat je hier straks vindt
            </h2>
            <p style={{ color: 'var(--fg-muted)', lineHeight: 'var(--lh-relaxed)' }}>
              Vier weergaven: de vacatures die op beoordeling wachten, gesorteerd op score;
              wat live staat; wat deze week verloopt; en het archief. Daarnaast de
              organisaties en de uitlegpagina’s.
            </p>
            <p
              style={{
                color: 'var(--fg-muted)',
                lineHeight: 'var(--lh-relaxed)',
                marginTop: 'var(--space-4)',
              }}
            >
              Elke vacature in de wachtrij komt binnen met een concept van de zin “waarom
              staat dit op het bord”. Jouw werk is die zin bijschaven, niet hem verzinnen.
            </p>

            <p className={u.linkRow}>
              <a href="/vacatures">
                Bekijk het bord <Icon name="arrow-right" />
              </a>
              <a href="https://sanity.io/manage" rel="noopener">
                Sanity-dashboard <Icon name="external-link" />
              </a>
            </p>
          </div>
        </Section>
      </Container>
    </div>
  )
}
