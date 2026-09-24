# DevVault UI

Interfaz web de **DevVault**, una aplicación local para organizar workspaces y operar proyectos desde un solo lugar. Este repositorio contiene únicamente el frontend; la API está en el repositorio `devvault`.

## Funcionalidades

- Crear workspaces y seleccionar directorios del equipo.
- Escanear carpetas y abrir los proyectos detectados.
- Iniciar/detener proyectos y consultar sus servicios.
- Ver métricas y alertas de runtime.
- Consultar rutas HTTP declaradas que detecta el escáner estático.
- Explorar ramas, commits, cambios locales y estado de `fetch` de repositorios Git.
- Administrar reglas de automatización y activar/desactivar plugins integrados.

## Stack

React 19 · Vite 8 · Tailwind CSS 4 · TanStack Query · React Router · Lucide.

## Requisitos

- Node.js y npm compatibles con Vite 8.
- DevVault Backend disponible en `http://localhost:8080`.

## Desarrollo local

Instala las dependencias y arranca Vite:

```bash
npm ci
npm run dev
```

La interfaz queda en `http://localhost:5050`. Vite usa puerto fijo (`strictPort`); si está ocupado, libera el puerto o cambia el valor en `vite.config.js`.

La URL base de la API se configura actualmente en `src/lib/api.js` (`http://localhost:8080/api/v1`). Si el backend usa otro host o puerto, actualiza ese valor y permite el origen de la UI en la configuración CORS del backend.

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # bundle de producción en dist/
npm run preview   # previsualizar el bundle
npm run lint      # análisis estático con Oxlint
```

## Estructura

- `src/pages/`: pantallas de Workspaces, Projects, detalle de proyecto, Monitoring, Automation y Logs.
- `src/components/`: componentes compartidos de navegación, estados y paneles.
- `src/lib/api.js`: cliente HTTP de la API.
- `public/`: recursos estáticos.

## Notas

La UI asume que el backend se ejecuta localmente y que responde en la URL configurada en `src/lib/api.js`. La autenticación todavía no está habilitada en el backend.
