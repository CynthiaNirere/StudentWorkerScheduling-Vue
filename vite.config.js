import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { fileURLToPath, URL } from "node:url";

import dns from "dns";
dns.setDefaultResultOrder("verbatim");

export default () => {
  const baseURL =
    process.env.APP_ENV === "development" ? "/" : "/sev2026/t1";

  return defineConfig({
    plugins: [vue(), vuetify({ autoImport: true })],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    server: {
      host: "localhost",
      port: 8081,
    },

    base: baseURL,

    build: {
      outDir: 'dist',
      assetsDir: 'assets',

      sourcemap: process.env.NODE_ENV === 'development',

      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for core dependencies
            'vendor': ['vue', 'vue-router'],
            // Vuetify in separate chunk due to size
            'vuetify': ['vuetify'],
            // Axios and services
            'services': ['axios'],
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production', 
        }
      },
      
      chunkSizeWarningLimit: 1000,
    },

    optimizeDeps: {
      include: ['vue', 'vue-router', 'vuetify', 'axios']
    },
  });
};