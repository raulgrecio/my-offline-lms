# my-offline-lms

> Plataforma personal para descargar y estudiar offline materiales de cursos online (PDFs, vídeos, transcripciones) con arquitectura limpia (Clean Architecture) y CLI unificado.

---

## Tabla de Contenidos

1. [Descripción](#descripción)
2. [Arquitectura (Clean Architecture)](#arquitectura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Prerrequisitos](#prerrequisitos)
5. [Instalación](#instalación)
6. [Guía de Uso (CLI)](#guía-de-uso)
7. [Estructura de Directorios](#estructura-de-directorios)
8. [Variables de Entorno](#variables-de-entorno)

---

## Descripción

`my-offline-lms` es una herramienta robusta diseñada para sincronizar y descargar contenido educativo de plataformas como Oracle University. Utiliza Playwright para la interceptación de tráfico y automatización, y SQLite como base de datos persistente para gestionar el estado de las descargas.

---

## Arquitectura

El proyecto sigue los principios de **Arquitectura Limpia (Clean Architecture)**:

- **src/domain**: Núcleo del negocio. Entidades, Value Objects e interfaces de servicios/repositorios. Sin dependencias externas.
- **src/application**: Casos de uso (Login, Sync, Download). Contiene la lógica de coordinación de la aplicación.
- **src/infrastructure**: Implementaciones técnicas. DB (SQLite), Browser (Playwright), Servicios (yt-dlp, Filesystem).
- **src/presentation**: Interfaz de entrada. Actualmente implementado como una CLI en `cli.ts`.

---

## Stack Tecnológico

- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript
- **Automatización**: Playwright + playwright-extra (Stealth)
- **Base de Datos**: better-sqlite3
- **Descarga de Vídeos**: yt-dlp
- **Procesamiento**: sharp (imágenes) & pdfkit (PDFs)
- **Testing**: Vitest

---

## Prerrequisitos

### Sistema
- **Node.js**: v18+
- **pnpm**: Recomendado (`npm install -g pnpm`)
- **yt-dlp**: Necesario para vídeos.
  ```bash
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  ```
- **ffmpeg**: Necesario para el procesado de vídeo.
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```

---

## Instalación

1. **Clonar e instalar**:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

2. **Configurar Entorno**:
   ```bash
   cp .env.example .env
   # Configura PLATFORM_BASE_URL y otras variables en el .env
   ```

---

## Guía de Uso

Todas las acciones se ejecutan mediante el comando `pnpm cli`.

### 1. Autenticación
Debes realizar el login manualmente en la ventana que se abre (incluyendo 2FA).
```bash
pnpm cli login
```
*Esto genera la sesión en `data/.auth/` que será usada por el resto de comandos.*

### 2. Sincronización (Mapping)
Carga los metadatos de un curso o una ruta completa en la base de datos local.
```bash
# Sincronizar un curso individual
pnpm cli sync-course <URL_O_SLUG>

# Sincronizar un Learning Path completo
pnpm cli sync-path <URL_O_ID>
```

### 3. Descarga
Descarga los recursos reales (PDFs y Vídeos). Soporta reanudación automática.
```bash
# Descargar TODO lo pendiente de un curso
pnpm cli download-course <ID_CURSO>

# Descargar solo vídeos de un curso
pnpm cli download-course <ID_CURSO> video

# Descargar solo guías de un curso
pnpm cli download-course <ID_CURSO> guide

# Descargar una ruta completa (Learning Path)
pnpm cli download-path <ID_PATH> [all|video|guide]
```

---

## Estructura de Directorios (Source)

```
src/
├── application/
│   └── use-cases/      # Implementación de la lógica de negocio (Sync, Download...)
├── config/             # Configuración de variables de entorno (Zod)
├── db/                 # Inicialización y esquema de SQLite
├── domain/             # Modelos, interfaces y lógica pura de dominio
├── infrastructure/     # Implementaciones (Browser, Database, Repositorios, Servicios)
├── presentation/       # CLI Entrypoint (cli.ts)
└── tests/              # Suite de tests (Vitest)
```

---

## Persistencia de Datos

```
data/
├── .auth/              # Cookies y estado de sesión (Playwright / yt-dlp)
├── assets/             # PDFs y Vídeos finales organizados por curso
├── debug/              # Payloads JSON interceptados para depuración
└── db.sqlite           # Base de datos central (Cursos, Assets, Estado)
```

---

## Variables de Entorno (.env)

- `PLATFORM_BASE_URL`: URL principal de la plataforma.
- `DOWNLOAD_CONCURRENCY`: Número de descargas simultáneas.
- `OFFERING_ID`: ID requerido para el visor de guías (eKits).
- `LOGIN_SUCCESS_SELECTOR`: Selector usado para validar el login.
