import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://www.blogkub.com',
  build: {
    format: 'file',            // about.html, not about/index.html — matches current URLs
    inlineStylesheets: 'never' // one shared cached CSS file per layout (dedup across pages)
  },
  compressHTML: false,
});
