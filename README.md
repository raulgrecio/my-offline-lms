# my-offline-lms

> Plataforma personal para descargar y estudiar offline materiales de cursos online (guides en PDF, vídeos, transcripciones) con autenticación automática 2FA y web local de estudio.

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Prerrequisitos](#prerrequisitos)
5. [Instalación](#instalación)
6. [Uso](#uso)
7. [Fases del Proyecto](#fases-del-proyecto)
8. [Estructura de Directorios](#estructura-de-directorios)
9. [Base de Datos](#base-de-datos)
10. [Variables de Entorno](#variables-de-entorno)
11. [Roadmap](#roadmap)

---

## Descripción del Proyecto

`my-offline-lms` es una herramienta personal de scraping y descarga masiva para extraer materiales educativos de una plataforma online con autenticación (login + 2FA) y construir una plataforma local de estudio offline. El sistema está diseñado con:

- **Descargas paralelas** controladas (p-queue)
- **Reanudación de descargas** (estado en SQLite)
- **Tolerancia a fallos** y reintentos automáticos
- **Ejecución incremental** sin re-descargar assets completados

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI / Entrypoint                         │
│                      (src/index.ts)                          │
└───────────────┬─────────────────┬───────────────┬───────────┘
                │                 │               │
    ┌───────────▼──────┐ ┌────────▼──────┐ ┌─────▼──────────┐
    │   Scraper Layer  │ │  Download     │ │   Offline Web  │
    │  (Playwright +   │ │  Engine       │ │   (React/Vite) │
    │   Stealth)       │ │  (p-queue +   │ │                │
    │                  │ │  yt-dlp)      │ │                │
    └───────────┬──────┘ └────────┬──────┘ └─────┬──────────┘
                │                 │               │
    ┌───────────▼─────────────────▼───────────────▼───────────┐
    │                   SQLite (better-sqlite3)                 │
    │                  data/db.sqlite                           │
    └─────────────────────────────────────────────────────────┘
```

**Flujo de datos principal:**

1. `login.ts` → Playwright abre el navegador, el usuario hace login + 2FA → se guardan `state.json` y `cookies.txt` en `data/.auth/`
2. **Scrapers de mapeo** → Usan la sesión guardada para interceptar XHR/JSON → insertan metadatos en SQLite (sin descargar binarios)
3. **Download Engine** → Lee tareas `PENDING` de SQLite → descarga en paralelo → actualiza estado a `COMPLETED`/`FAILED`
4. **Web local** → Lee `api.json` exportado desde SQLite → sirve PDFs, vídeos y transcripciones localmente

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Runtime | **Node.js 18+** | Primera opción por rendimiento I/O asíncrono y ecosistema |
| Lenguaje | **TypeScript** | Type-safety, mejor DX, detección de errores en compilación |
| Navegación/Scraping | **Playwright + playwright-extra** | Más robusto que Puppeteer; soporte de contextos multi-tab y intercepción de red |
| Anti-bot | **puppeteer-extra-plugin-stealth** | Enmascara señales de automatización (WebDriver, navigator.plugins…) |
| Base de datos | **better-sqlite3** | SQLite síncrono, sin servidor, ideal para estado local; WAL mode para escrituras concurrentes |
| Paralelización | **p-queue** | Cola de concurrencia con rate limiting y prioridades; simple y probada |
| Procesado de imágenes | **sharp** | Detecta orientación EXIF; resize en memoria antes de pasar a PDFKit |
| Generación de PDF | **pdfkit** | Genera PDFs streaming; manejo correcto de páginas landscape/portrait |
| Descarga de vídeos | **yt-dlp** (subprocess) | Estándar de facto; soporta HLS/DASH, subtítulos `.vtt`/`.srt`, cookies Netscape |
| Web local | **Vite + React + TS** | SPA ligera; `react-pdf` para visor, video nativo HTML5 |

### Por qué Node.js sobre Python

Para el scraping, Playwright tiene soporte nativo de Node.js con mejor integración de async/await. Python sería redundante salvo que yt-dlp no pueda invocarse via subprocess (lo puede). La única excepción es `ffmpeg` (dependencia de sistema, no de lenguaje).

---

## Prerrequisitos

### Sistema

- **Node.js** v18 o superior → [nodejs.org](https://nodejs.org)
- **pnpm** (gestor de paquetes) → `npm install -g pnpm`
- **yt-dlp** → Para descarga de vídeos:
  ```bash
  # Linux / WSL
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  ```
- **ffmpeg** → Requerido por yt-dlp para muxing vídeo+audio:
  ```bash
  # Ubuntu / WSL
  sudo apt update && sudo apt install -y ffmpeg
  ```
- **Playwright Browsers** → Se instala en el paso de instalación

### Para WSL2

Si ejecutas en WSL2, Playwright necesita acceso a display o ejecutar en modo headed con VcXsrv/WSLg. Asegúrate de tener habilitado WSLg o configura `DISPLAY` correctamente.

```bash
# Instalar dependencias del sistema para Playwright (Chromium)
npx playwright install-deps chromium
```

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url> my-offline-lms
cd my-offline-lms

# 2. Instalar dependencias Node.js
pnpm install

# 3. Instalar navegadores de Playwright
pnpm exec playwright install chromium

# 4. Crear directorio de datos (se crea automáticamente al ejecutar, pero puedes crearlo manualmente)
mkdir -p data/.auth data/assets

# 5. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con la URL base de la plataforma
```

---

## Uso

### Paso 1: Autenticación (Milestone 1 — ✅ Implementado)

Lanza el script de login interactivo. Se abrirá una ventana de Chromium donde deberás hacer el login manualmente (incluyendo el 2FA). Una vez detectada la sesión, se guardan las cookies automáticamente.

```bash
# ts-node directo (desarrollo)
pnpm exec ts-node src/scraper/login.ts <URL_LOGIN> <SELECTOR_POST_LOGIN>

# Ejemplo:
pnpm exec ts-node src/scraper/login.ts https://mi-plataforma.com/login "#dashboard"
```

**Salida esperada:**
```
Iniciando navegador para Auth...
Navegando a https://mi-plataforma.com/login
Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.
Login exitoso detectado. Guardando estado de la sesión y cookies...
Sesión y cookies guardadas con éxito en data/.auth/
```

Archivos generados:
- `data/.auth/state.json` → Sesión Playwright (localStorage, sessionStorage, cookies)
- `data/.auth/cookies.txt` → Cookies formato Netscape (para yt-dlp)

### Paso 2: Inicializar base de datos

```bash
pnpm start
# o en modo desarrollo con hot-reload:
pnpm dev
```

Crea el fichero `data/db.sqlite` con el esquema completo.

### Paso 3: Ejecutar scrapers de mapeo (Milestone 2 — 🔜 Próximo)

```bash
# Aún en desarrollo
pnpm exec ts-node src/scraper/mapper.ts <URL_LEARNING_PATH>
```

### Paso 4: Descargar assets (Milestone 3 & 4 — 🔜 Próximo)

```bash
# Descargar guides (imágenes → PDF)
pnpm exec ts-node src/downloader/guides.ts

# Descargar vídeos y subtítulos
pnpm exec ts-node src/downloader/videos.ts
```

### Paso 5: Web local de estudio (Milestone 5 — 🔜 Próximo)

```bash
cd offline-web
pnpm install
pnpm dev
# Abre http://localhost:5173
```

---

## Fases del Proyecto

### ✅ Milestone 0 & 1 — Inicialización y Autenticación

- [x] Proyecto Node.js + TypeScript configurado
- [x] SQLite (`better-sqlite3`) con esquema relacional
- [x] Login interactivo con Playwright + stealth (soporte 2FA automático)
- [x] Guardado de sesión (`state.json`) y cookies (`cookies.txt`)

### 🔜 Milestone 2 — Motor de Scraping (Discovery & Mapping)

- [ ] Scraper de Learning Paths (intercepción XHR/JSON)
- [ ] Scraper de Cursos (metadatos, índices de Guides y Videos)
- [ ] Inserción iterativa en SQLite sin duplicados

### 🔜 Milestone 3 — Descarga de Guides (Imágenes → PDF)

- [ ] Sistema de colas con `p-queue` + rate limiting
- [ ] Reanudación y tolerancia a fallos por asset
- [ ] Detección de orientación con `sharp` (portrait/landscape)
- [ ] Generación de PDFs por guide con `pdfkit`

### 🔜 Milestone 4 — Descarga de Vídeos

- [ ] Invocación de `yt-dlp` via `child_process.spawn()`
- [ ] Descarga de vídeo + subtítulos sincronizados
- [ ] Estado tracked en SQLite (evita redescargas)

### 🔜 Milestone 5 — Web Local de Estudio (React SPA)

- [ ] Proyecto Vite + React + TypeScript
- [ ] Exportador de SQLite → `api.json`
- [ ] Vistas: Learning Paths → Cursos → Assets
- [ ] Visor de PDFs (`react-pdf`) y reproductor de vídeo nativo
- [ ] Progreso de estudio en `localStorage`

---

## Estructura de Directorios

```
my-offline-lms/
├── src/
│   ├── db/
│   │   └── schema.ts          # Inicialización SQLite + esquema
│   ├── scraper/
│   │   ├── login.ts           # ✅ Auth interactiva 2FA con Playwright
│   │   ├── mapper.ts          # 🔜 Mapeo de Learning Paths y Cursos
│   │   └── interceptor.ts     # 🔜 Intercepción de red XHR/JSON
│   ├── downloader/
│   │   ├── guides.ts          # 🔜 Descarga de imágenes + generación PDF
│   │   ├── videos.ts          # 🔜 Descarga de vídeos via yt-dlp
│   │   └── queue.ts           # 🔜 Sistema de colas p-queue
│   ├── utils/
│   │   ├── pdf.ts             # 🔜 Helpers de orientación y PDFKit
│   │   └── retry.ts           # 🔜 Estrategia de reintentos
│   └── index.ts               # ✅ Entry point + inicialización BD
├── offline-web/               # 🔜 SPA React/Vite
├── data/
│   ├── .auth/
│   │   ├── state.json         # Sesión Playwright (generado en runtime)
│   │   └── cookies.txt        # Cookies Netscape para yt-dlp (generado)
│   ├── db.sqlite              # Base de datos local (generado en runtime)
│   └── assets/
│       ├── learning-paths/
│       └── courses/
├── external/
│   ├── peticion_inicial.md    # Especificación original del proyecto
│   ├── implementation_plan.md.resolved
│   └── task.md.resolved
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Base de Datos

Esquema SQLite en `src/db/schema.ts`:

```
LearningPaths          Courses
──────────────         ──────────────
id TEXT PK             id TEXT PK
slug TEXT              slug TEXT UNIQUE
title TEXT             title TEXT
description TEXT
        │                    │
        └──────┬─────────────┘
               │
    LearningPath_Courses
    ────────────────────
    path_id TEXT FK
    course_id TEXT FK
    order_index INTEGER
               │
               │
        Course_Assets
        ─────────────────────────────
        id TEXT PK
        course_id TEXT FK
        type TEXT (guide | video)
        url TEXT
        metadata JSON
        status TEXT (PENDING | DOWNLOADING | COMPLETED | FAILED)
        local_path TEXT
```

---

## Variables de Entorno

Crea un `.env` en la raíz del proyecto (copia desde `.env.example`):

```env
# URL base de la plataforma de cursos
PLATFORM_BASE_URL=https://mi-plataforma-online.com

# Selector CSS que indica login exitoso (ej: el dashboard post-login)
LOGIN_SUCCESS_SELECTOR=#dashboard

# Concurrencia de descargas paralelas (recomendado: 3-5)
DOWNLOAD_CONCURRENCY=4

# Delay entre requests en ms (respetar rate limits de la plataforma)
REQUEST_DELAY_MS=500
```

---

## Roadmap

| Milestone | Estado | Descripción |
|-----------|--------|-------------|
| 0 & 1 | ✅ Completo | Inicialización, DB, Auth 2FA |
| 2 | 🔜 Próximo | Scraping y mapeo de cursos |
| 3 | ⏳ Pendiente | Descarga de guides → PDF |
| 4 | ⏳ Pendiente | Descarga de vídeos y subtítulos |
| 5 | ⏳ Pendiente | Web local React de estudio |

---

## Notas de Seguridad

- Las cookies y credenciales se guardan en `data/.auth/` que está en `.gitignore`. **Nunca subas este directorio a un repositorio.**
- Este proyecto es para uso **personal y educativo** únicamente. Respeta los términos de servicio de la plataforma que uses.
