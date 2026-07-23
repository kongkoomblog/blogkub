import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://www.blogkub.com',
  build: {
    format: 'file',              // about.html, not about/index.html
    inlineStylesheets: 'always'  // inline layout CSS into each page (no external /_astro dep)
  },
  compressHTML: false,
});
