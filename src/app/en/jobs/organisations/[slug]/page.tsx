import type { Metadata } from 'next'
import { EmployerPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { getEmployer, getEmployersWithRoles } from '@jobboard/sanity/queries'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 900

export async function generateStaticParams() {
  const employers = await getEmployersWithRoles()
  return employers.map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const employer = await getEmployer(slug)
  if (!employer) return { title: 'Organisation not found' }
  return bilingualMetadata({
    locale: 'en',
    nlPath: ROUTES.nl.employer(slug),
    enPath: ROUTES.en.employer(slug),
    title: `Working at ${employer.name}`,
    description: (employer.leverageNoteEn ?? employer.leverageNoteNl)?.slice(0, 155) ?? undefined,
  })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <EmployerPage locale="en" slug={slug} />
}
