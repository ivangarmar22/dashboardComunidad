import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // En GitHub Pages la web cuelga de /<repositorio>/
  base: process.env.BASE_PATH || '/',
  server: { port: 3000 },
  build: {
    rolldownOptions: {
      output: {
        // Librerías y datos en archivos aparte: al actualizar los datos solo cambia su archivo
        codeSplitting: {
          groups: [
            { name: 'libs', test: /node_modules/ },
            { name: 'data', test: /[/\\]data[/\\][^/\\]+\.json$/ },
          ],
        },
      },
    },
  },
});
