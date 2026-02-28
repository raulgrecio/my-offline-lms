# Offline LMS & Scraper — Task List

## ✅ Milestone 0 & 1: Inicialización, Base de Datos y Autenticación

- [x] Inicializar proyecto Node.js con TypeScript (`package.json`, `tsconfig.json`)
- [x] Instalar dependencias: `playwright`, `better-sqlite3`, `p-queue`, `sharp`, `pdfkit`, `playwright-extra`, `puppeteer-extra-plugin-stealth`
- [x] Configurar SQLite (`better-sqlite3`) y crear el esquema de BBDD en `src/db/schema.ts`:
  - [x] Tabla `LearningPaths`
  - [x] Tabla `Courses`
  - [x] Tabla `LearningPath_Courses` (relación N:M con order_index)
  - [x] Tabla `Course_Assets` (con estados PENDING/DOWNLOADING/COMPLETED/FAILED)
- [x] Implementar módulo de autenticación interactiva con Playwright en `src/scraper/login.ts`:
  - [x] Modo `headless: false` para 2FA manual
  - [x] Guardado de sesión en `data/.auth/state.json`
  - [x] Exportación de cookies formato Netscape en `data/.auth/cookies.txt`
- [x] Entry point `src/index.ts` con inicialización de BD
- [x] `.gitignore` configurado (excluye `data/`, `.env`, `node_modules/`)
- [x] `README.md` completo con arquitectura, stack, instrucciones y roadmap
- [x] `.env.example` con todas las variables configurables

## 🔜 Milestone 2: Motor de Scraping (Discovery & Mapping)

- [/] Implementar `src/scraper/mapper.ts` — scraper de Learning Paths
  - [x] Cargar sesión guardada (`state.json`) en Playwright
  - [x] Navegar a URL de Learning Path
  - [/] Interceptar requests XHR/JSON con `page.route()` o `page.on('response')`
  - [ ] Extraer lista de cursos y su orden
  - [ ] Insertar en `LearningPaths` y `LearningPath_Courses` con upsert (evitar duplicados)
- [ ] Implementar `src/scraper/courseMapper.ts` — scraper de Cursos
  - [ ] Para cada curso: navegar a su URL
  - [ ] Detectar lista de Guides (URLs de los visores de imágenes)
  - [ ] Detectar lista de Vídeos (URLs de los players)
  - [ ] Insertar en `Courses` y `Course_Assets` con status `PENDING`
- [ ] Implementar `src/scraper/interceptor.ts` — utilidad de intercepción de red
  - [x] Helper para registrar/analizar respuestas JSON de la plataforma
  - [/] Detectar patrones de API (pagination tokens, auth headers)

## ⏳ Milestone 3: Motor de Descarga de Assets e Imágenes (Guides → PDF)

- [ ] Implementar `src/downloader/queue.ts` — sistema de colas
  - [ ] Configurar `p-queue` con concurrencia configurable (`.env`)
  - [ ] Implementar retry automático con backoff exponencial
  - [ ] Actualizar estado en SQLite (PENDING → DOWNLOADING → COMPLETED/FAILED)
- [ ] Implementar `src/downloader/guides.ts` — descarga de Guides
  - [ ] Leer assets `type=guide` con status `PENDING` desde SQLite
  - [ ] Autenticación HTTP con cookies guardadas
  - [ ] Descarga de imágenes individuales a directorio temporal `/tmp`
  - [ ] Detectar orientación con `sharp` (portrait vs landscape)
- [ ] Implementar `src/utils/pdf.ts` — generación de PDFs
  - [ ] Generar PDF por guide con `pdfkit`
  - [ ] Manejar páginas portrait (normal) y landscape (rotación 90°)
  - [ ] Control de memoria: stream a disco (no cargar todo en RAM)
  - [ ] Guardar en `data/assets/courses/<slug>/<guide-slug>.pdf`
  - [ ] Actualizar `local_path` y status en SQLite

## ⏳ Milestone 4: Motor de Descarga de Vídeos

- [ ] Implementar `src/downloader/videos.ts` — descarga de vídeos
  - [ ] Leer assets `type=video` con status `PENDING` desde SQLite
  - [ ] Invocar `yt-dlp` via `child_process.spawn()` con flags:
    - [ ] `--cookies data/.auth/cookies.txt`
    - [ ] `--write-subs --write-auto-subs --sub-lang es,en`
    - [ ] `--output "data/assets/courses/%(id)s/%(title)s.%(ext)s"`
    - [ ] `--merge-output-format mp4`
  - [ ] Parsear stdout de yt-dlp para progreso
  - [ ] Actualizar estado en SQLite al completar/fallar
  - [ ] Evitar redescargas: skip si `local_path` ya existe en disco

## ⏳ Milestone 5: Web Local de Estudio (React SPA)

- [ ] Crear proyecto `offline-web/` con Vite + React + TypeScript
  ```bash
  cd offline-web && npx create-vite@latest . -- --template react-ts
  ```
- [ ] Instalar dependencias: `react-pdf`, `react-router-dom`
- [ ] Implementar `src/utils/exporter.ts` — exportador SQLite → JSON
  - [ ] Generar `offline-web/public/api.json` con estructura jerárquica
  - [ ] Incluir: paths → courses → assets (PDFs, vídeos, transcripciones)
- [ ] Crear páginas React:
  - [ ] `LearningPathsPage` — listado de paths con progreso general
  - [ ] `CoursePage` — índice de guides y vídeos de un curso
  - [ ] `GuidePage` — visor de PDF con `react-pdf`
  - [ ] `VideoPage` — reproductor vídeo HTML5 + visor de transcripción sincronizado
- [ ] Implementar tracking de progreso en `localStorage`
  - [ ] Marcar guide/vídeo como "completado"
  - [ ] Barra de progreso por curso
- [ ] Añadir búsqueda básica sobre títulos y transcripciones

## Notes

- Las credenciales y cookies están en `data/.auth/` — nunca commitear
- Respetar rate limits con `REQUEST_DELAY_MS` en `.env`
- Ejecutar `pnpm exec playwright install chromium` antes del primer login
- En WSL2: necesario `npx playwright install-deps chromium` para dependencias del sistema
