import starlight from '@astrojs/starlight'
import svelte from '@astrojs/svelte'
import { defineConfig, fontProviders, svgoOptimizer, sessionDrivers } from 'astro/config'

import { markdownExport } from './src/integrations/markdown-export'

// https://astro.build/config
export default defineConfig({
  site: 'https://hono-email.hayatosc.dev',
  session: {
    driver: sessionDrivers.lruCache({ max: 1 }),
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
  vite: {
    optimizeDeps: {
      include: ['astro/zod'],
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--sl-font',
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--sl-font-mono',
    },
  ],
  integrations: [
    markdownExport(),
    starlight({
      title: 'hono-email',
      logo: {
        src: './src/assets/logo.svg',
      },
      favicon: '/favicon.svg',
      description: 'Render, validate, and send HTML email and plain text from hono/jsx.',
      disable404Route: true,
      pagefind: false,
      lastUpdated: true,
      editLink: {
        baseUrl: 'https://github.com/hayatosc/hono-email/edit/main/docs/src/content/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        Head: './src/components/Head.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/hayatosc/hono-email',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Core',
          items: [
            { label: 'render()', slug: 'core/render' },
            { label: 'Strict Mode', slug: 'core/strict-mode' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Document Structure', slug: 'components/document-structure' },
            { label: 'Layout', slug: 'components/layout' },
            { label: 'Typography', slug: 'components/typography' },
            { label: 'Styling Helpers', slug: 'components/styling-helpers' },
          ],
        },
        {
          label: 'Styling',
          items: [
            { label: 'Overview', slug: 'styling/overview' },
            { label: 'hono/css', slug: 'styling/hono-css' },
            { label: 'Tailwind', slug: 'styling/tailwind' },
            { label: 'Font', slug: 'styling/font' },
          ],
        },
        {
          label: 'Markdown',
          items: [
            { label: 'Markdown component', slug: 'markdown/overview' },
            { label: 'With Tailwind', slug: 'markdown/with-tailwind' },
          ],
        },
        {
          label: 'Adapters',
          items: [
            { label: 'SMTP', slug: 'adapters/smtp' },
            { label: 'Resend', slug: 'adapters/resend' },
            { label: 'SendGrid', slug: 'adapters/sendgrid' },
            { label: 'Postmark', slug: 'adapters/postmark' },
            { label: 'Mailgun', slug: 'adapters/mailgun' },
            { label: 'Cloudflare Email', slug: 'adapters/cloudflare' },
            { label: 'Custom Adapters', slug: 'api/custom-adapters' },
          ],
        },
        {
          label: 'Tooling',
          items: [
            { label: 'Live Preview', slug: 'tooling/live-preview' },
            { label: 'Testing', slug: 'tooling/testing' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Email Types', slug: 'api/email-types' },
            { label: 'Adapter Options', slug: 'api/adapter-options' },
            { label: 'Plugin Options', slug: 'api/plugin-options' },
          ],
        },
      ],
    }),
    svelte(),
  ],
})
