import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Puerto fijo y reservado — nunca 3000/5173/4200/8080, que son los
    // defaults de CRA/Vite/Angular/Spring que los proyectos administrados
    // suelen usar. Así DevVault nunca compite por su propio puerto.
    port: 5050,
    strictPort: true, // si 5050 está ocupado, falla en vez de saltar a otro puerto silenciosamente
  },
})
