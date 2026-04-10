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

- **Clean Architecture & Monorepo**: Solid separation of concerns using `pnpm workspaces`.
- **Task-Based Orchestration**: Modern task lifecycle management (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) with SQLite persistence.
- **Web-Based Scraper Wizard**: A user-friendly GUI to authenticate, select content, and launch sync/download tasks.
- **Resilient & Efficient**: Migration to standard `AbortSignal` for graceful cancellation and isolated Browser Contexts for resource-efficient background tasks.
- **Real-Time Observability**: Internal `LogBroker` and `LogConsole` for live tracking of scraper progress.
- **High-Quality PDFs**: Optimized generation from interactive viewers using `pdfkit` and `sharp`.

---

## Architecture & Monorepo Structure

The project is organized as a monorepo using `pnpm workspaces` to separate responsibilities:

### 1. [`packages/core`](./packages/core) (The Heart)
Contains shared logic and fundamental abstractions.
- **`filesystem/`**: Adapter pattern for storage independence (Local, Http).
- **`database/`**: Centralized SQLite configuration and shared schema.
- **`logging/`**: Unified logging with `LogBroker` for cross-package observability.

### 2. [`packages/scraper`](./packages/scraper) (The Engine)
Handles platform interaction and heavy lifting.
- **`features/`**: Domain-driven Use Cases (`SyncCourse`, `DownloadVideos`). Now uses a decentralized `AbortSignal` pattern for orchestration.
- **`platform/browser/`**: Advanced `BrowserProvider` using isolated contexts for stability.
- **`presentation/`**: CLI entry point and internal scripts.

### 3. [`packages/web`](./packages/web) (The Command Center & Viewer)
An **Astro** application with **React** integration for the management UI and content viewer.
- **`pages/import/`**: The modern **Scraper Wizard** for wizard-based content ingestion.
- **`api/scraper/`**: Endpoints to control and monitor background tasks.
- **`components/`**: Premium, reactive components for the viewer and task console.

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

## Usage Guide (Scraper)

You can interact with the scraper through the modern Web Wizard (recommended) or the classic CLI.

### Option A: Web Scraper Wizard (Recommended)
1. Go to the **Import** section in the web interface.
2. Follow the step-by-step wizard:
   - **Auth**: Ensure you are logged in (status is validated in real-time).
   - **Selection**: Provide the Course or Learning Path URL/Slug.
   - **Execution**: Monitor the task progress and logs in real-time via the built-in console.

### Option B: Classic CLI (Direct Control)
Perform actions via `pnpm cli` in the scraper package.

#### 1. Authentication
```bash
pnpm cli login
```
_**Important**: Keep the browser open until you have authenticated. This saves session state to `data/.auth/`._

#### 2. Synchronization & Download
```bash
# Sync course or path
pnpm cli sync-course <URL_OR_SLUG>
pnpm cli sync-path <URL_OR_ID>

# Download assets
pnpm cli download-course <COURSE_ID>
pnpm cli download-path <PATH_ID> [type]
```

---

## Web Interface (Frontend)

The project includes a web application to consume the downloaded content conveniently.

**To build and start the production viewer (accessible from other devices):**
```bash
pnpm --filter @my-offline-lms/web build
pnpm --filter @my-offline-lms/web run preview:host
```
_Note: `preview:host` allows you to access the viewer from a tablet or phone using your computer's local IP address._

> [!IMPORTANT]
> **External Access**: If you use `preview:host`, make sure to **open the port (default 4321) in your computer's firewall** to allow connections from other devices on your local network.

> [!TIP]
> **Troubleshooting**: If you get an `EADDRINUSE` error, it's likely because you have another instance (like `pnpm dev`) running. Close any previous terminal running the web server or use `pnpm --filter @my-offline-lms/web preview --port 4322` to use a different port.

Features:
- Browse your offline catalog.
- Watch videos with persistence and progress tracking.
- Interactive PDF viewing for study guides.

> [!IMPORTANT]
> **First Step in Web UI**: Once you open the web interface, go to the **Settings** section and provide the absolute path to your `data/assets` directory. This ensures the application can find and serve your downloaded videos and PDFs.

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
