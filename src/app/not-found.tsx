import Link from 'next/link'
import { Container, Hero, Section, Shell } from '@jobboard/components/Chrome'
import { ROUTES } from '@jobboard/content/i18n'

export default function NotFound() {
  return (
    <Shell locale="nl" switchHref={ROUTES.en.index}>
      <Hero
        title="Deze pagina bestaat niet"
        lead="Misschien is de vacature gesloten, of is de link verouderd."
      />
      <Container>
        <Section first>
          <p>
            <Link href={ROUTES.nl.index}>Bekijk alle vacatures</Link>
          </p>
        </Section>
      </Container>
    </Shell>
  )
}
