import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://ipambe.github.io',
  base: '/mario-pelota-team-selector',
  integrations: [sitemap()]
})