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
  defaults: {
    VBtn: { size: 'large' },
    VCard: { density: 'comfortable' },
    VList: { density: 'comfortable' },
    VListItem: { density: 'comfortable' },
    VChip: { size: 'default' },
    VTextField: { density: 'comfortable' },
    VSelect: { density: 'comfortable' },
    VAppBar: { density: 'default' },
  },
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
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
      dark: {
        dark: true,
        colors: {
          primary: "#7B68EE",        // Lighter purple for dark mode
          secondary: "#5B6FFF",      // Lighter blue
          accent: "#6B8AFF",         // Lighter accent
          info: "#6BAFFF",           // Lighter info
          success: "#5CDAFF",        // Lighter success
          warning: "#FFB84D",        // Lighter warning
          error: "#FF6B93",          // Lighter error
          background: "#121212",     // Dark background
          surface: "#1E1E1E",        // Dark surface

          // Text colors for dark mode
          "on-primary": "#FFFFFF",
          "on-secondary": "#FFFFFF",
          "on-accent": "#FFFFFF",
          "on-success": "#000000",
          "on-error": "#FFFFFF",
          "on-background": "#FFFFFF",
          "on-surface": "#FFFFFF",
        },
      },
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});

export default vuetify;