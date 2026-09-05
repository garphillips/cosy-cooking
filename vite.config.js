import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The built dist/index.html inlines every script and stylesheet so the game
// runs from file:// or any static host with no server.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
});
