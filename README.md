# my-offline-lms

> A personal project to sync and download course materials (PDFs, Videos, Transcripts) for offline study, built with Clean Architecture and a unified CLI.

---

## Code Coverage

![Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)

The project maintains a solid test suite with over **92% line coverage** across the core logic, ensuring reliability in complex synchronization and download flows.

---

## 🎓 Personal Project & Acknowledgements

This is a personal hobby project created to facilitate offline learning. 

I would like to express my sincere gratitude to [**Oracle University**](https://mylearn.oracle.com/ou/home). This tool was developed while I was preparing for several Oracle certifications, and it has been instrumental in helping me successfully earn them. The quality of Oracle's educational materials is exceptional, and this project simply aims to make that content more accessible for offline study environments.

---

## Table of Contents

1. [Description](#description)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Usage Guide (CLI)](#usage-guide)
7. [Directory Structure](#directory-structure)
8. [Environment Variables](#environment-variables)
9. [License](#license)

---

## Description

`my-offline-lms` is a robust tool designed to synchronize and download educational content from platforms like Oracle University. It leverages Playwright for traffic interception and automation, and SQLite for persistent state management.

**Key Features:**
- **Clean Architecture**: Organized by Use Cases, Domain, and Infrastructure.
- **Unified CLI**: Single entry point for all operations.
- **Resilient**: Automatic resuming of downloads and error handling.
- **High-Quality PDFs**: Optimized PDF generation from interactive image-based viewers.

---

## Architecture

The project follows **Clean Architecture** principles:

- **src/domain**: Core business logic. Entities, Value Objects, and Repository/Service interfaces. No external dependencies.
- **src/application**: Use Cases (Login, Sync, Download). Orchestrates the flow of data.
- **src/infrastructure**: Technical implementations. Database (SQLite), Browser (Playwright), Services (yt-dlp, Filesystem).
- **src/presentation**: Entry point. Currently a unified CLI in `cli.ts`.

---

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Automation**: Playwright + playwright-extra (Stealth)
- **Database**: better-sqlite3
- **Video Downloader**: yt-dlp
- **Processing**: sharp (images) & pdfkit (PDFs)
- **Testing**: Vitest

---

## Prerequisites

### System
- **Node.js**: v18+
- **pnpm**: Recommended (`npm install -g pnpm`)
- **yt-dlp**: Required for videos.
  ```bash
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  ```
- **ffmpeg**: Required for video processing.
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```

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
   # IMPORTANT: *Configure PLATFORM_BASE_URL (famous name database url) and other variables in .env *
   ```

---

## Usage Guide

All actions are performed through the `pnpm cli` command.

### 1. Authentication
Perform the login manually in the browser window that appears (including 2FA).
```bash
pnpm cli login
```
*This saves the session in `data/.auth/` for future use.*

### 2. Synchronization (Mapping)
Loads course or Learning Path metadata into the local database without downloading files.
```bash
# Sync an individual course
pnpm cli sync-course <URL_OR_SLUG>

# Sync a complete Learning Path
pnpm cli sync-path <URL_OR_ID>
```

### 3. Downloading
Download the actual assets (PDFs and Videos) after syncing.
```bash
# Download everything pending for a course
pnpm cli download-course <COURSE_ID>

# Download only videos for a course
pnpm cli download-course <COURSE_ID> video

# Download only guides for a course
pnpm cli download-course <COURSE_ID> guide

# Download a full Learning Path
pnpm cli download-path <PATH_ID> [all|video|guide]
```

---

## Directory Structure (Source)

```
src/
├── application/
│   └── use-cases/      # Business logic implementation (Sync, Download...)
├── config/             # Environment variables configuration (Zod)
├── db/                 # SQLite initialization and schema
├── domain/             # Entities, interfaces, and pure domain logic
├── infrastructure/     # Technical implementations (Browser, DB, Repos, Services)
├── presentation/       # CLI Entrypoint (cli.ts)
└── tests/              # Test suite (Vitest)
```

---

## Data Persistence

```
data/
├── .auth/              # Cookies and session state
├── assets/             # Final PDFs and Videos organized by course
├── debug/              # Intercepted JSON payloads for debugging
└── db.sqlite           # Central Database
```

---

## License

This project is licensed under the [MIT License](LICENSE).
In addition to the license terms, please respect the Terms of Service of the platforms you access. 
This tool is for personal and educational use only.
