# @my-offline-lms/scraper

Paquete responsable de la sincronización y descarga de contenido de la plataforma Oracle MyLearn.

---

## Cadena de ejecución

```
ScraperService
 ├── syncCourse() → orchestrator.run()
 │     └── SyncCourse.execute()
 ├── syncPath() → orchestrator.run()
 │     └── SyncLearningPath.execute()
 │           └── processInterceptedData()
 │                 └── syncCourse.execute()  ← recursivo
 └── download() → orchestrator.run()
       ├── DownloadCourse.execute()
       │     ├── DownloadGuides.execute()
       │     │     └── downloadSingleGuide()
       │     └── DownloadVideos.execute()
       │           └── downloadSingleVideo()
       └── DownloadPath.execute()
             └── (por cada curso)
                   ├── DownloadGuides.execute()
                   └── DownloadVideos.execute()
```

---

## Mecanismo de cancelación de tareas

La cancelación es **cooperativa y transparente**: ningún Use Case recibe un `AbortSignal` como parámetro. En su lugar, el signal viaja implícitamente a través de `AsyncLocalStorage` vía `AbortContext`.

```
Usuario pulsa "Cancelar"
        │
        ▼
[Web API Route]  POST /api/tasks/{id}/cancel
        │
        ▼
[CancelTask.execute()]
  ├─ taskRepo.update(id, { status: 'CANCELLED' })   ← marca en BD
  └─ TaskBroker.emit('CANCEL_TASK', id)             ← broadcast
        │
        ├──► BroadcastChannel.postMessage()          ← inter-proceso (Web → Scraper)
        │
        ▼
[Proceso scraper: TaskBroker recibe el mensaje]
  └─ TaskOrchestrator (suscrito al broker)
       └─ AbortController.abort()                    ← dispara el signal
              │
              ▼
        AbortContext (AsyncLocalStorage)
              │
              ├─ AbortContext.throwIfAborted()        ← en cada iteración de loop
              └─ BrowserProvider._getContext()        ← cierra el contexto Playwright
```

### Puntos de cancelación (`AbortContext.throwIfAborted()`)

| Use Case | Dónde |
|---|---|
| `SyncCourse` | Inicio del loop de payloads interceptados |
| `SyncLearningPath` | Inicio del loop de payloads + inicio del loop de cursos hijo |
| `DownloadCourse` | Al inicio de `execute()` + entre guides y videos |
| `DownloadPath` | Inicio del loop de cursos del path |
| `DownloadGuides` | Inicio del loop de guías + inicio del loop de páginas imagen + loop de reintentos |
| `DownloadVideos` | Al inicio de `downloadSingleVideo()` |

### Cierre reactivo del navegador

`BrowserProvider._getContext()` suscribe internamente el `AbortSignal` para **cerrar el contexto de Playwright inmediatamente** cuando se recibe la señal de cancelación, sin depender de que el código llegue al próximo `throwIfAborted()`.

---

## Comandos

```bash
# Tests unitarios
pnpm test

# Tests en modo watch
pnpm test:watch

# Build
pnpm build
```
