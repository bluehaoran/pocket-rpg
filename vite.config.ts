import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { svelteTesting } from '@testing-library/svelte/vite';

// GitHub Pages serves the site at /pocket-rpg/. Override with BASE=/ for other hosts.
const base = process.env.BASE ?? '/pocket-rpg/';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PocketRPG',
        short_name: 'PocketRPG',
        description: 'Tap-only GM tool for conversational RPGs. Works offline.',
        theme_color: '#B35C00',
        background_color: '#0C0F14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Packs and the tools library are bundled into the JS, so precaching the build covers offline play.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html'
      }
    }),
    // Component tests mount Svelte's client build in jsdom and clean up after each test.
    ...(process.env.VITEST ? [svelteTesting()] : [])
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
