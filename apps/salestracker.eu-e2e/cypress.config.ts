import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      webServerCommands: {
        default: 'nx run salestracker.eu:serve',
        production: 'nx run salestracker.eu:preview',
      },
      ciWebServerCommand: 'nx run salestracker.eu:serve-static',
    }),
    baseUrl: 'http://localhost:4200',
  },
});
