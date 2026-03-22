# my-offline-lms

> A personal project to sync and download course materials (PDFs, Videos, Transcripts) for offline study, built with Clean Architecture and a monorepo structure.

---

## 📊 Code Coverage

![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)

The project maintains a solid test suite with over **92% line coverage** across the core logic, ensuring reliability in complex synchronization and download flows.

---

## 🎓 Personal Project & Acknowledgements

This is a personal hobby project created to facilitate offline learning.

I would like to express my sincere gratitude to [**Oracle University**](https://mylearn.oracle.com/ou/home). This tool was developed while I was preparing for several Oracle certifications, and it has been instrumental in helping me successfully earn them. The quality of Oracle's educational materials is exceptional, and this project simply aims to make that content more accessible for offline study environments.

---

## 🗺️ Table of Contents

1. [Description](#description)
2. [Architecture & Monorepo Structure](#architecture--monorepo-structure)
3. [Design Principles](#design-principles)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Usage Guide (CLI)](#usage-guide-cli)
8. [Web Interface (Frontend)](#web-interface-frontend)
9. [Typical Workflow](#typical-workflow)
10. [Data Structure](#data-structure)
11. [Environment Variables](#environment-variables)
12. [License](#license)

---

## Description

`my-offline-lms` is a robust tool designed to synchronize and download educational content from platforms like Oracle University. It leverages Playwright for traffic interception and automation, and SQLite for persistent state management.

**Key Features:**

- **Clean Architecture**: Organized by Use Cases, Domain, and Infrastructure.
- **Monorepo**: Clear separation between core logic, scraper, and web interface.
- **Resilient**: Automatic resuming of downloads and advanced error handling.
- **High-Quality PDFs**: Optimized PDF generation from interactive image-based viewers.

---

## Architecture & Monorepo Structure

The project is organized as a monorepo using `pnpm workspaces` to separate responsibilities:

### 1. [`packages/core`](./packages/core) (The Heart)
Contains shared logic and fundamental abstractions. It does not depend on any other package.
- **`filesystem/`**: Abstractions for file access (Local, S3, Blob). Implements the *Adapter* pattern for storage independence.
- **`database/`**: Base SQLite configuration and common data types.
- **`logging/`**: Logging interface for system-wide consistency.

### 2. [`packages/scraper`](./packages/scraper) (The Data Factory)
Responsible for platform interaction and resource gathering.
- **`application/`**: Use cases (`SyncCourse`, `SyncLearningPath`, `DownloadVideos`).
- **`infrastructure/`**: Browser automation (Playwright) and video download services (`yt-dlp`).
- **`presentation/`**: CLI entry point (`cli.ts`).

### 3. [`packages/web`](./packages/web) (The Consumer)
An **Astro** application providing a modern offline viewer for the downloaded content.
- **`features/`**: Organized by domain (Courses, Learning Paths, Progress).
- **`platform/`**: Web-specific adapters and database access.
- **`components/`**: Modern, reactive UI components.

---

## Design Principles

1. **Framework Independence**: Business logic is isolated from automation libraries or web frameworks.
2. **Testability**: Dependency injection and interface-based design allow for >90% test coverage.
3. **Dependency Rule**: Dependencies always point inwards towards the Domain layer.
   - `Presentation` -> `Application` -> `Domain`
   - `Infrastructure` -> `Domain`

---

## Tech Stack

- **Runtime**: Node.js 18+ | **Language**: TypeScript
- **Automation**: Playwright + playwright-extra (Stealth)
- **Database**: better-sqlite3 | **Video Downloader**: yt-dlp
- **Processing**: sharp (images) & pdfkit (PDFs)
- **Testing**: Vitest | **Frontend**: Astro + Tailwind CSS

---

## Prerequisites

### System
- **Node.js**: v18+ | **pnpm**: Recommended
- **yt-dlp**: Required for videos.
  - **Linux**: `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`
- **ffmpeg**: Required for video processing.
  - **Linux**: `sudo apt update && sudo apt install -y ffmpeg`

---

## Installation

1. **Clone and Install**:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

2. **Setup Environment**:
   ```bash
   cp .env.example .env
   # IMPORTANT: Configure PLATFORM_BASE_URL and other variables in .env
   ```

---

## Usage Guide (CLI)

Perform actions via `pnpm cli` in the scraper package.

### 1. Authentication
```bash
pnpm cli login # Perform login manually in the browser window
```

### 2. Synchronization
```bash
pnpm cli sync-course <URL_OR_SLUG>
pnpm cli sync-path <URL_OR_ID>
```

### 3. Downloading
```bash
pnpm cli download-course <COURSE_ID> [all|video|guide]
```

---

## Web Interface (Frontend)

The project includes a web application to consume the downloaded content conveniently.

**To build and start the production viewer:**
```bash
pnpm --filter @my-offline-lms/web build
pnpm --filter @my-offline-lms/web preview
```

_Note: For development/debugging purposes, you can use `pnpm --filter @my-offline-lms/web run dev` instead._

Features:
- Browse your offline catalog.
- Watch videos with persistence and progress tracking.
- Interactive PDF viewing for study guides.

---

## Typical Workflow

1. **CLI (Scraper)**: Sync a course to save metadata to the local SQLite database.
2. **Download**: Run the download command to fetch PDFs and Videos.
3. **Web UI**: Open the Astro app to consume content offline with a premium experience.

---

## Data Structure

```
data/
├── .auth/              # Session state
├── assets/             # Final PDFs and Videos
├── debug/              # Intercepted network payloads
└── db.sqlite           # Central SQLite Database
```

---

## License

MIT License. Respect the Terms of Service of platforms you access. For educational use only.
