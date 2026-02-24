import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

const vuetify = createVuetify({
  components,
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