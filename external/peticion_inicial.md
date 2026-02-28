Actúa como un **Software Architect Senior especializado en scraping avanzado, automatización web y sistemas de descarga masiva**.

Quiero que diseñes una **solución completa y realista**, lista para implementación profesional.

## Contexto del proyecto

Soy desarrollador y quiero crear una herramienta personal para descargar materiales educativos desde una plataforma online que:

- Requiere **login + password**
- Tiene **verificación en dos pasos (2FA)**
- Contiene cursos formados por:
  - Guides (visores de imágenes paginadas)
  - Videos
  - Transcripciones

El objetivo FINAL es construir una **plataforma local de estudio offline**.

---

## Restricciones tecnológicas

1. Preferir **Node.js siempre que sea viable**.
2. Usar **Python solo si ofrece ventajas claras**, especialmente en:
   - scraping complejo
   - automatización del navegador
   - procesamiento multimedia
   - paralelización

3. El sistema debe permitir:
   - descargas paralelas
   - reanudación de descargas
   - tolerancia a fallos
   - ejecución incremental

---

## Objetivo general

El proyecto debe desarrollarse **por fases independientes y entregables funcionales**.

---

# FASE 1 — Descarga de Guides

Cada curso contiene varias "guides".

Cada guide:

- está formada por múltiples páginas
- cada página es una imagen dentro de un visor web
- algunas imágenes son verticales
- otras horizontales

Objetivos:

1. Autenticarse automáticamente (incluyendo 2FA).
2. Navegar por todas las guides del curso.
3. Detectar y descargar TODAS las imágenes.
4. Descargar imágenes en paralelo.
5. Detectar orientación automáticamente.
6. Generar un PDF final por guide:
   - orden correcto
   - manteniendo orientación
   - calidad original

7. Permitir reanudar descargas incompletas.

---

# FASE 2 — Descarga de Videos y Transcripciones

Objetivos:

1. Detectar todos los videos del curso.
2. Descargar:
   - video original
   - subtítulos/transcripciones

3. Sincronizar nombre de video y transcript.
4. Permitir descargas concurrentes.
5. Evitar redescargas innecesarias.

---

# FASE 3 — Web local de estudio

Crear una pequeña web local que permita:

- navegar cursos
- abrir PDFs
- ver videos
- leer transcripciones
- búsqueda simple
- progreso de estudio (opcional)

Debe ser ligera y ejecutable localmente.

---

## Lo que debes entregar

Quiero una respuesta estructurada que incluya:

### 1. Arquitectura propuesta

- componentes
- flujo de datos
- servicios

### 2. Stack tecnológico recomendado

Justificando:

- Node.js vs Python
- librerías concretas

### 3. Estrategia de autenticación

Especialmente manejo de:

- sesiones
- cookies
- 2FA

### 4. Estrategia de scraping

Explica:

- navegación
- interceptación de requests
- detección de imágenes reales
- anti-bot considerations

### 5. Paralelización

Cómo implementar:

- colas
- workers
- rate limiting
- retry strategy

### 6. Generación de PDFs

Cómo manejar:

- imágenes horizontales
- memoria
- grandes volúmenes

### 7. Descarga de vídeo eficiente

### 8. Diseño del almacenamiento local

### 9. Plan de implementación por entregables

Divide en milestones reales.

### 10. Riesgos técnicos y mitigaciones

---

## IMPORTANTE

NO des explicaciones genéricas.

Quiero:

- decisiones técnicas claras
- alternativas comparadas
- trade-offs
- enfoque production-ready

Asume que el desarrollador tiene experiencia backend.
