import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'sunroom',
    themes: {
      sunroom: {
        dark: false,
        colors: {
          primary: '#02795f',
          'primary-darken-1': '#015f4e',
          secondary: '#f9a66c',
          error: '#f76c6c',
          warning: '#f4c95d',
          info: '#3b82f6',
          success: '#02795f',
          background: '#f7f7f7',
          surface: '#ffffff',
          'on-surface': '#1f2933',
        },
      },
    },
  },
  defaults: {
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VBtn: { variant: 'flat' },
  },
})
