/**
 * Vuetify3 Plugin
 */

// Core
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

// Misc
import { loadFonts } from "./webfontloader";
loadFonts();

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "navyBlueTheme",
    themes: {
      navyBlueTheme: {
        dark: false,
        colors: {
          primary: "#12086F",
          secondary: "#2B35AF",
          accent: "#4361EE",
          info: "#4895EF",
          success: "#4CC9F0",
          warning: "#FFA500",
          error: "#EF476F",
          background: "#F5F7FA",
          surface: "#FFFFFF",

          // Text colors
          "on-primary": "#FFFFFF",
          "on-secondary": "#FFFFFF",
          "on-accent": "#FFFFFF",
          "on-success": "#000000",
          "on-error": "#FFFFFF",
          "on-background": "#1A1A1A",
          "on-surface": "#1A1A1A",
        },
      },
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});

export default vuetify;