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



## ⏳ Milestone 3: Motor de Descarga de Assets e Imágenes (Guides → PDF)



## ⏳ Milestone 4: Motor de Descarga de Vídeos


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

