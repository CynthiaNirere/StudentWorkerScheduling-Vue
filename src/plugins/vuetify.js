import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
/**
 * Vuetify3 Plugin
 */
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Misc
import { loadFonts } from "./webfontloader";
loadFonts();

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: "#12086f",
    secondary: "#E1E1E1",
    accent: "#0d0660",
    success: "#4CAF50",
    error: "#EE5044",
    teal: "#63BAC0",
    blue: "#196CA2",
    yellow: "#F8C545",
    darkblue: "#032F45",
  },
};

const vuetify = createVuetify({
  components: {
    ...components,
  },
  directives,
  theme: {
    defaultTheme: 'navyBlueTheme',
    themes: {
      navyBlueTheme: {
        dark: false,
        colors: {
          // Navy Blue Color Palette (from the image you shared)
          primary: '#12086F',      // Darkest navy - sidebar, main buttons
          secondary: '#2B35AF',     // Medium navy - secondary actions
          accent: '#4361EE',        // Bright blue - highlights, links
          info: '#4895EF',          // Sky blue - info messages
          success: '#4CC9F0',       // Light cyan - success states
          warning: '#FFA500',       // Orange - warnings
          error: '#EF476F',         // Red/pink - errors, delete
          background: '#F5F7FA',    // Light gray background
          surface: '#FFFFFF',       // White - cards, surfaces
          
          // Text colors
          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-accent': '#FFFFFF',
          'on-success': '#000000',
          'on-error': '#FFFFFF',
          'on-background': '#1A1A1A',
          'on-surface': '#1A1A1A',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})

export default vuetify