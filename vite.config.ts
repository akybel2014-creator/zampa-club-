import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawTidioKey = (env.VITE_TIDIO_KEY || '').trim();
  const validTidioKey = /^[a-zA-Z0-9_-]{8,64}$/.test(rawTidioKey)
    ? rawTidioKey
    : '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'tidio-html-config',
        transformIndexHtml(html) {
          const placeholderRegex =
            /\s*<script\s+src=["']\/\/code\.tidio\.co\/%VITE_TIDIO_KEY%\.js["']\s+async\s*><\/script>/i;
          if (validTidioKey) {
            return html.replace(
              placeholderRegex,
              `\n    <script src="//code.tidio.co/${validTidioKey}.js" async></script>`
            );
          }
          return html.replace(placeholderRegex, '');
        },
      },
      {
        name: 'inline-entry-css',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
          const htmlAsset = bundle['index.html'];
          if (!htmlAsset || htmlAsset.type !== 'asset') return;

          let html =
            typeof htmlAsset.source === 'string'
              ? htmlAsset.source
              : Buffer.from(htmlAsset.source).toString('utf-8');

          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (!fileName.endsWith('.css') || chunk.type !== 'asset') continue;
            const cssText =
              typeof chunk.source === 'string'
                ? chunk.source
                : Buffer.from(chunk.source).toString('utf-8');

            const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const linkRegex = new RegExp(
              `<link\\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\\/?${escapedName}["'][^>]*>`,
              'i'
            );

            if (linkRegex.test(html)) {
              html = html.replace(linkRegex, `<style>${cssText}</style>`);
              delete bundle[fileName];
            }
          }

          htmlAsset.source = html;
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
