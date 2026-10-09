# DevVault UI

Interfaz web de **DevVault**, una aplicación local para organizar workspaces y operar proyectos desde un solo lugar. Este repositorio contiene únicamente el frontend; la API está en el repositorio `devvault`.

## Funcionalidades

- Crear workspaces y seleccionar directorios del equipo.
- Quitar un workspace de DevVault, avisando antes de que los archivos de la carpeta no se borran.
- Escanear carpetas y abrir los proyectos detectados.
- Iniciar/detener proyectos y consultar sus servicios.
- Abrir un proyecto en el editor que elijas (VS Code, IntelliJ, Sublime, Zed o Bloc de notas).
- Ver métricas y alertas de runtime.
- Consultar rutas HTTP declaradas que detecta el escáner estático.
- Explorar ramas, commits, cambios locales y estado de `fetch` de repositorios Git.
- Administrar reglas de automatización y activar/desactivar plugins integrados.

## Stack

React 19 · Vite 8 · Tailwind CSS 4 · TanStack Query · React Router · Lucide.

## Requisitos

- Node.js y npm compatibles con Vite 8.
- DevVault Backend disponible en `http://127.0.0.1:8080`.

## Desarrollo local

Instala las dependencias y arranca Vite:

```bash
npm ci
npm run dev
```

La interfaz queda en `http://localhost:5050`. Vite usa puerto fijo (`strictPort`); si está ocupado, libera el puerto o cambia el valor en `vite.config.js`.

La URL base de la API se decide en `src/lib/api.js` según el modo:

- En desarrollo (`npm run dev`) la UI corre en 5050 y el backend en 8080, así que hace falta la URL absoluta `http://127.0.0.1:8080/api/v1`. Las peticiones van cross-origin, y el backend solo permite los orígenes `http://localhost:5050` y `http://127.0.0.1:5050` (está en `CorsConfig.java` del backend). Si mueves el puerto de Vite, hay que añadirlo ahí también.
- En el build de producción la UI y la API se sirven desde el mismo origen, de modo que usa la ruta relativa `/api/v1`. Fijar aquí `8080` haría que la preview empaquetada hablara con el backend equivocado.

Si el backend usa otro host o puerto en desarrollo, ajusta ese valor.

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

La UI asume que el backend se ejecuta en la máquina del usuario y no lleva autenticación: no hay login, ni token, ni nada guardado en `sessionStorage`. El backend se enlaza a `127.0.0.1` y rechaza las peticiones con un `Origin` ajeno.

`dist/` está versionado a propósito. Es lo que permite arrancar DevVault sin Node.js instalado en la máquina de destino, que es el caso de uso de la preview empaquetada para Windows. El submódulo `ui/` del repositorio del backend es una copia de este repositorio.
