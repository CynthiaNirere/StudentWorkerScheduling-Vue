/**
 * Vuetify3 Plugin
 */
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Import VDataTable from labs (included in vuetify package)
import { VDataTable } from "vuetify/labs/components";

// Misc
import { loadFonts } from "./webfontloader";
loadFonts();

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: "#80162B",
    secondary: "#E1E1E1",
    accent: "#47121D",
    success: "#47121D",
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
    VDataTable, // Add VDataTable component
  },
  directives,
  theme: {
    defaultTheme: "myCustomLightTheme",
    themes: {
      myCustomLightTheme,
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});

export default vuetify;