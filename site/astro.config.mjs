import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://www.blogkub.com',
  build: { format: 'file' },   // outputs about.html (not about/index.html) to match current URLs
  compressHTML: false,
});
