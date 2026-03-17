import * as pdfjs from 'pdfjs-dist';

export function initPdfViewer(assetId: string, path: string, initialPage: number) {
  // Configure worker
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

  const container = document.getElementById('pdf-container') as HTMLElement;
  const thumbnailsContainer = document.getElementById('thumbnails-container') as HTMLElement;
  const sidebar = document.getElementById('pdf-sidebar') as HTMLElement;
  const pageInput = document.getElementById('page-input') as HTMLInputElement;
  const totalPagesEl = document.getElementById('total-pages') as HTMLElement;
  const zoomInput = document.getElementById('zoom-input') as HTMLInputElement;
  const saveIndicator = document.getElementById('save-indicator') as HTMLElement;
  const loading = document.getElementById('loading') as HTMLElement;
  const titleEl = document.getElementById('pdf-title') as HTMLElement;

  const btnSidebar = document.getElementById('btn-sidebar') as HTMLButtonElement;
  const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
  const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
  const btnFitWidth = document.getElementById('btn-fit-width') as HTMLButtonElement;
  const btnFitHeight = document.getElementById('btn-fit-height') as HTMLButtonElement;
  const btnRotate = document.getElementById('btn-rotate') as HTMLButtonElement;
  const fitActiveBg = document.getElementById('fit-active-bg') as HTMLElement;

  let pdfDoc: any = null;
  let currentPage = initialPage;
  let currentZoom = 1.0;
  let currentRotation = 0;
  let isSaving = false;
  let isUserNavigating = false;
  let isSidebarOpen = window.innerWidth > 640;
  const renderedPages = new Set<number>();
  const renderedThumbs = new Set<number>();
  let thumbQueue: number[] = [];
  let isProcessingQueue = false;
  let assumedAspectRatio = 1.41; // A4 default
  let baseWidth = 595; // A4 default
  let baseHeight = 842; // A4 default

  async function init() {
    try {
      const loadingTask = pdfjs.getDocument(path);
      pdfDoc = await loadingTask.promise;
      
      totalPagesEl.textContent = pdfDoc.numPages.toString();
      pageInput.max = pdfDoc.numPages.toString();
      loading.remove();

      const filename = path.split('/').pop()?.replace('.pdf', '') || 'Documento';
      titleEl.textContent = decodeURIComponent(filename);

      // Auto-zoom to fit: detect orientation
      const firstPage = await pdfDoc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1, rotation: 0 });
      baseWidth = viewport.width;
      baseHeight = viewport.height;
      assumedAspectRatio = baseHeight / baseWidth;
      const isLandscape = baseWidth > baseHeight;
      const fitMode = isLandscape ? 'height' : 'width';
      
      syncPlaceholders();
      syncThumbnailPlaceholders();
      setupIntersectionObserver();
      
      currentZoom = await getFitScale(fitMode);
      updateZoomDisplay();
      updateFitUI(fitMode);
      
      // Initial background render from current page outwards
      prioritizeThumbnailsAround(currentPage);

      if (initialPage > 1) {
        goToPage(initialPage, 'instant');
      } else {
        renderPage(1);
        pageInput.value = '1';
      }

    } catch (error) {
      console.error('Error loading PDF:', error);
      if (container) {
        container.innerHTML = `<div class="p-10 text-center"><p class="text-red-500 font-medium">Error al cargar el documento</p><p class="text-xs opacity-50 mt-2">${error}</p></div>`;
      }
    }
  }

  function syncPlaceholders() {
    const isRotated = currentRotation === 90 || currentRotation === 270;
    const pageWidth = (isRotated ? baseHeight : baseWidth) * currentZoom;
    const pageHeight = (isRotated ? baseWidth : baseHeight) * currentZoom;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
       let wrapper = document.getElementById(`page-${i}`);
       
       if (!wrapper) {
         wrapper = document.createElement('div');
         wrapper.id = `page-${i}`;
         wrapper.dataset.pageNumber = i.toString();
         wrapper.className = 'page-wrapper relative bg-surface-900 shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-30';
         
         const loader = document.createElement('div');
         loader.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin';
         wrapper.appendChild(loader);
         container.appendChild(wrapper);
       }

       wrapper.style.width = `${Math.floor(pageWidth)}px`;
       wrapper.style.height = `${Math.floor(pageHeight)}px`;
       wrapper.style.marginBottom = '48px';

       // Immediate visual sync for already rendered canvases
       const canvas = wrapper.querySelector('canvas');
       if (canvas) {
         canvas.style.width = `${Math.floor(pageWidth)}px`;
         canvas.style.height = `${Math.floor(pageHeight)}px`;
       }
    }
  }

  function syncThumbnailPlaceholders() {
    const isRotated = currentRotation === 90 || currentRotation === 270;
    const pageWidth = isRotated ? baseHeight : baseWidth;
    const pageHeight = isRotated ? baseWidth : baseHeight;
    const ratio = pageHeight / pageWidth;

    // Bounding box: Max 120px width, Max 160px height
    const MAX_W = 120;
    const MAX_H = 160;
    let thumbW = MAX_W;
    let thumbH = MAX_W * ratio;

    if (thumbH > MAX_H) {
      thumbH = MAX_H;
      thumbW = MAX_H / ratio;
    }

    const finalThumbWidth = Math.floor(thumbW);
    const finalThumbHeight = Math.floor(thumbH);

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      let thumb = document.getElementById(`thumb-${i}`);
      
      if (!thumb) {
        thumb = document.createElement('div');
        thumb.className = 'thumb-wrapper group relative cursor-pointer transition-all duration-200 p-1 rounded-lg bg-surface-600 hover:bg-surface-800 flex flex-col items-center';
        thumb.dataset.pageNumber = i.toString();
        thumb.id = `thumb-${i}`;
        
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'w-32 bg-surface-950 rounded border border-border-subtle overflow-hidden flex items-center justify-center';
        thumb.appendChild(canvasContainer);
        
        const label = document.createElement('div');
        label.className = 'text-center text-2xs mt-1 font-medium text-text-muted group-hover:text-text-primary transition-colors';
        label.textContent = i.toString();
        thumb.appendChild(label);
        
        thumb.onclick = () => goToPage(i);
        thumbnailsContainer.appendChild(thumb);
      }

      const canvasContainer = thumb.querySelector('div') as HTMLElement;
      canvasContainer.style.width = `${finalThumbWidth}px`;
      canvasContainer.style.height = `${finalThumbHeight}px`;
      
      if (!renderedThumbs.has(i)) {
        canvasContainer.innerHTML = `<span class="text-2xs text-text-muted opacity-30">${i}</span>`;
      }
    }
    updateActiveThumb(currentPage);
  }

  async function renderPage(num: number) {
    if (renderedPages.has(num)) return;
    renderedPages.add(num);

    const wrapper = document.getElementById(`page-${num}`);
    if (!wrapper) return;

    try {
      const page = await pdfDoc.getPage(num);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: currentZoom, rotation: currentRotation });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false })!;
      
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.className = 'block';

      wrapper.innerHTML = '';
      wrapper.style.width = `${Math.floor(viewport.width)}px`;
      wrapper.style.height = `${Math.floor(viewport.height)}px`;
      wrapper.classList.remove('opacity-30');
      wrapper.appendChild(canvas);

      await page.render({ canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] }).promise;
      renderThumbnail(num); // Render thumb as well if needed
    } catch (e) {
      console.error(`Page ${num} render error:`, e);
      renderedPages.delete(num);
    }
  }

  async function renderThumbnail(num: number) {
    if (renderedThumbs.has(num)) return;
    renderedThumbs.add(num);

    const thumb = document.getElementById(`thumb-${num}`);
    if (!thumb) return;

    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: 0.25, rotation: currentRotation });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = 'w-full h-full object-contain';
      
      const canvasContainer = thumb.querySelector('div') as HTMLElement;
      if (canvasContainer) {
        // Precise fit for the current page
        const actualRatio = viewport.height / viewport.width;
        
        const MAX_W = 120;
        const MAX_H = 160;
        let finalW = MAX_W;
        let finalH = MAX_W * actualRatio;

        if (finalH > MAX_H) {
          finalH = MAX_H;
          finalW = MAX_H / actualRatio;
        }

        canvasContainer.style.width = `${Math.floor(finalW)}px`;
        canvasContainer.style.height = `${Math.floor(finalH)}px`;
        canvasContainer.innerHTML = '';
        canvasContainer.appendChild(canvas);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      renderedThumbs.delete(num);
    }
  }

  function prioritizeThumbnailsAround(center: number) {
    const range = 15;
    const start = Math.max(1, center - range);
    const end = Math.min(pdfDoc.numPages, center + range);
    
    // Add neighborhood to front of queue
    const neighborhood: number[] = [];
    for (let i = start; i <= end; i++) {
      if (!renderedThumbs.has(i)) neighborhood.push(i);
    }
    
    // Sort by proximity to center
    neighborhood.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
    
    // Remaining pages
    const others: number[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
       if (!renderedThumbs.has(i) && !neighborhood.includes(i)) others.push(i);
    }

    thumbQueue = [...neighborhood, ...others];
    processQueue();
  }

  async function processQueue() {
    if (isProcessingQueue || thumbQueue.length === 0) return;
    isProcessingQueue = true;

    while (thumbQueue.length > 0) {
      const num = thumbQueue.shift()!;
      if (!renderedThumbs.has(num)) {
        await renderThumbnail(num);
        // Small break to allow other interactions
        await new Promise(r => setTimeout(r, 20));
      }
    }
    isProcessingQueue = false;
  }

  function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      if (isUserNavigating) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const num = parseInt((entry.target as HTMLElement).dataset.pageNumber!);
          renderPage(num);
          if (num !== currentPage) {
            currentPage = num;
            pageInput.value = num.toString();
            updateActiveThumb(num);
            saveProgress(num);
          }
        }
      });
    }, { root: container, threshold: 0.1 });

    document.querySelectorAll('.page-wrapper').forEach(el => observer.observe(el));
    
    // Thumbnail observer
    const thumbObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const num = parseInt((entry.target as HTMLElement).dataset.pageNumber!);
          if (!renderedThumbs.has(num)) {
             // Move this page to the front of the queue
             thumbQueue = [num, ...thumbQueue.filter(n => n !== num)];
             processQueue();
          }
        }
      });
    }, { root: sidebar, threshold: 0.01 });

    document.querySelectorAll('.thumb-wrapper').forEach(el => thumbObserver.observe(el));
  }

  function updateActiveThumb(num: number) {
    document.querySelectorAll('.thumb-wrapper').forEach(el => {
      const isActive = parseInt((el as HTMLElement).dataset.pageNumber!) === num;
      el.classList.toggle('ring-2', isActive);
      el.classList.toggle('ring-brand-500', isActive);
      el.classList.toggle('bg-surface-800', isActive);
      if (isActive) {
         el.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      }
    });
  }

  function goToPage(num: number, behavior: ScrollBehavior = 'instant') {
    if (num < 1 || num > pdfDoc.numPages) return;
    
    isUserNavigating = true;
    currentPage = num;
    pageInput.value = num.toString();
    updateActiveThumb(num);

    const el = document.getElementById(`page-${num}`);
    if (el) {
      container.scrollTo({ top: el.offsetTop, behavior });
      renderPage(num);
      prioritizeThumbnailsAround(num);
    }
    saveProgress(num);

    // Shortest possible lock to allow state to settle
    setTimeout(() => { isUserNavigating = false; }, 50);
  }

  async function saveProgress(page: number) {
    if (isSaving) return;
    isSaving = true;
    
    try {
      await fetch('/api/progress/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, page, completed: page === pdfDoc.numPages })
      });
      showSaveConfirmation();
    } catch (e) {} finally {
      isSaving = false;
    }
  }

  function showSaveConfirmation() {
    saveIndicator.classList.remove('opacity-0');
    setTimeout(() => saveIndicator.classList.add('opacity-0'), 2000);
  }

  function updateZoomDisplay() {
    zoomInput.value = `${Math.round(currentZoom * 100)}%`;
    btnZoomOut.disabled = currentZoom <= 0.5;
    btnZoomIn.disabled = currentZoom >= 3.0;
  }
  
  function updateFitUI(mode: 'width' | 'height') {
    if (!fitActiveBg) return;
    const isWidth = mode === 'width';
    
    // Move background
    fitActiveBg.style.left = isWidth ? '0.125rem' : 'calc(50%)';
    
    // Update colors
    btnFitWidth.classList.toggle('text-text-primary', isWidth);
    btnFitWidth.classList.toggle('text-text-muted', !isWidth);
    btnFitHeight.classList.toggle('text-text-primary', !isWidth);
    btnFitHeight.classList.toggle('text-text-muted', isWidth);
  }

  async function getFitScale(mode: 'width' | 'height') {
    if (!pdfDoc) return 1;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1, rotation: currentRotation });
    
    // Adjusted clearances: 64px padding (sm:p-8) + minimal shadow/scroll buffer
    const HORIZONTAL_CLEARANCE = 96; 
    const VERTICAL_CLEARANCE = 32;

    return mode === 'width' 
      ? (container.clientWidth - HORIZONTAL_CLEARANCE) / viewport.width
      : (container.clientHeight - VERTICAL_CLEARANCE) / viewport.height;
  }

  async function reRenderAll(mode: 'center' | 'top' = 'center') {
    isUserNavigating = true;
    const anchorPage = currentPage;
    const viewportHeight = container.clientHeight;
    const currentTop = container.scrollTop;
    const currentPageEl = document.getElementById(`page-${anchorPage}`);
    
    // Relative position within the current page
    let relativeY = 0; 
    if (mode === 'center') {
      if (currentPageEl) {
        const pageTop = currentPageEl.offsetTop;
        const pageHeight = currentPageEl.offsetHeight;
        if (pageHeight > 0) {
          relativeY = (currentTop + viewportHeight / 2 - pageTop) / pageHeight;
        }
      } else {
        relativeY = 0.5;
      }
    }

    renderedPages.clear();
    renderedThumbs.clear();
    thumbQueue = [];
    
    syncPlaceholders();
    syncThumbnailPlaceholders();
    
    // Restore alignment
    const newPageEl = document.getElementById(`page-${anchorPage}`);
    if (newPageEl) {
       if (mode === 'center') {
         const newPageTop = newPageEl.offsetTop;
         const newPageHeight = newPageEl.offsetHeight;
         container.scrollTop = (newPageTop + relativeY * newPageHeight) - viewportHeight / 2;
       } else {
         container.scrollTop = newPageEl.offsetTop;
       }
    }
    
    // Force reflow and wait a frame to ensure getBoundingClientRect is accurate
    await new Promise(r => requestAnimationFrame(r));

    // Render any page that is now visible in the viewport
    const containerRect = container.getBoundingClientRect();
    const wrappers = document.querySelectorAll('.page-wrapper');
    
    wrappers.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Use a small buffer (10px) to be sure we catch pages on the edge
      if (rect.bottom > containerRect.top - 10 && rect.top < containerRect.bottom + 10) {
        const num = parseInt((el as HTMLElement).dataset.pageNumber!);
        renderPage(num);
      }
    });

    prioritizeThumbnailsAround(anchorPage);
    
    // Release navigation lock after layout has settled
    setTimeout(() => { isUserNavigating = false; }, 200);
  }

  // Handlers
  btnSidebar.onclick = () => {
    isSidebarOpen = !isSidebarOpen;
    sidebar.classList.toggle('w-0', !isSidebarOpen);
    sidebar.classList.toggle('sm:w-64', isSidebarOpen);
    sidebar.classList.toggle('opacity-0', !isSidebarOpen);
  };

  btnZoomIn.onclick = async () => {
    currentZoom = Math.min(3.0, currentZoom + 0.1);
    updateZoomDisplay();
    await reRenderAll();
  };

  btnZoomOut.onclick = async () => {
    currentZoom = Math.max(0.5, currentZoom - 0.1);
    updateZoomDisplay();
    await reRenderAll();
  };

  btnFitWidth.onclick = async () => {
    currentZoom = await getFitScale('width'); 
    updateZoomDisplay();
    updateFitUI('width');
    await reRenderAll('top');
  };

  btnFitHeight.onclick = async () => {
    currentZoom = await getFitScale('height'); 
    updateZoomDisplay();
    updateFitUI('height');
    await reRenderAll('top');
  };

  btnRotate.onclick = async () => {
    currentRotation = (currentRotation + 90) % 360;
    
    // Calculate both scales to ensure the WHOLE page fits
    const scaleWidth = await getFitScale('width');
    const scaleHeight = await getFitScale('height');
    
    // Use the minimum scale to guarantee visibility of the whole page
    currentZoom = Math.min(scaleWidth, scaleHeight);
    
    // Update UI fit mode indicator based on which one we matched (or both)
    const mode = scaleWidth <= scaleHeight ? 'width' : 'height';
    updateZoomDisplay();
    updateFitUI(mode);
    
    await reRenderAll('top');
  };

  pageInput.onchange = () => goToPage(parseInt(pageInput.value));
  pageInput.onkeydown = (e) => { if (e.key === 'Enter') { goToPage(parseInt(pageInput.value)); pageInput.blur(); } };

  zoomInput.onchange = async () => {
    let val = parseInt(zoomInput.value.replace('%', ''));
    if (isNaN(val)) val = 100;
    currentZoom = Math.max(0.5, Math.min(3.0, val / 100));
    updateZoomDisplay();
    await reRenderAll();
  };
  zoomInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
       zoomInput.blur();
    }
  };
  zoomInput.onfocus = () => zoomInput.select();

  init();
}
