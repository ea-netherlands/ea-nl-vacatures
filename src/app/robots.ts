import type { MetadataRoute } from 'next'
import { absolute } from '@jobboard/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/studio'] }],
    sitemap: absolute('/sitemap.xml'),
  }
}
