// Next.js App Router — place at app/robots.ts
// Generates /robots.txt at build time. Use this OR public/robots.txt, never both.
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots

import type { MetadataRoute } from 'next'

// Set NEXT_PUBLIC_SITE_URL in Vercel project settings for all environments.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'

// Crawlers allowed full access.
// The search/citation bots are what drive AI visibility; the training bots
// (GPTBot, Google-Extended, Applebot-Extended, CCBot) are a separate choice —
// removing them costs no search visibility if you object to model training.
const allowedAgents = [
  'Googlebot',
  'Bingbot',
  'GPTBot', // OpenAI training
  'OAI-SearchBot', // ChatGPT Search citations
  'ChatGPT-User', // user-initiated fetch
  'PerplexityBot', // Perplexity index
  'Perplexity-User', // user-initiated fetch
  'ClaudeBot', // Anthropic index
  'Claude-User', // user-initiated fetch
  'Google-Extended', // Gemini + AI Overviews grounding
  'Applebot-Extended', // Apple Intelligence
  'meta-externalagent', // Meta AI
  'CCBot', // Common Crawl
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...allowedAgents.map((userAgent) => ({
        userAgent,
        allow: '/',
      })),
      {
        userAgent: '*',
        allow: '/',
        // Keep this list minimal. Blocking a path here removes it from AI
        // answers as well as search.
        disallow: ['/admin/', '/_next/static/chunks/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
