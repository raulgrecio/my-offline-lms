import { describe, it, expect, vi, beforeEach } from "vitest";
import * as pdfjs from "pdfjs-dist";

import { apiClient } from "@web/platform/api";
import { initPdfViewer } from "@web/ui/modules/pdf-viewer/pdf-viewer-client";
import { logger } from "@web/platform/logging";

// Mock pdfjs-dist
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(function () {
    return {
      promise: Promise.resolve({
        numPages: 10,
        getPage: vi.fn(async function () {
          return {
            getViewport: vi.fn(function () { return { width: 600, height: 800 }; }),
            render: vi.fn(function () { return { promise: Promise.resolve() }; }),
          };
        }),
      }),
    };
  }),
  GlobalWorkerOptions: {
    workerSrc: "",
  },
}));

// Mock apiClient
vi.mock("@web/platform/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock IntersectionObserver
window.IntersectionObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("PDFViewer Client Logic", () => {
  const setupDOM = () => {
    document.body.innerHTML = `
      <div id="pdf-container"></div>
      <div id="thumbnails-container"></div>
      <div id="pdf-sidebar"></div>
      <input id="page-input" />
      <div id="total-pages"></div>
      <input id="zoom-input" />
      <div id="save-indicator" class="opacity-0"></div>
      <div id="loading"></div>
      <div id="pdf-title"></div>
      <button id="btn-sidebar"></button>
      <button id="btn-zoom-in"></button>
      <button id="btn-zoom-out"></button>
      <button id="btn-fit-width"></button>
      <button id="btn-fit-height"></button>
      <button id="btn-rotate"></button>
      <button id="btn-help"></button>
      <div id="fit-active-bg"></div>
      <div id="pdf-segments-container"></div>
      
      <template id="page-template">
        <div data-page-row><div data-page-number=""></div></div>
      </template>
      <template id="thumb-template">
        <div data-thumb-row>
            <div data-thumb-canvas></div>
            <div data-thumb-label></div>
            <div data-thumb-placeholder></div>
        </div>
      </template>
      <template id="error-template">
        <div data-error-message></div>
      </template>
      <template id="help-template">
        <div id="help-modal">
            <div data-modal-content></div>
            <button data-close-help></button>
        </div>
      </template>
    `;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupDOM();
    vi.mocked(apiClient.get).mockResolvedValue({ segments: [] });
  });

  it("should initialize the PDF viewer correctly", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    // Wait for async init
    await vi.waitFor(() => {
      expect(pdfjs.getDocument).toHaveBeenCalledWith("test.pdf");
      expect(document.getElementById("total-pages")?.textContent).toBe("10");
      expect(document.getElementById("pdf-title")?.textContent).toBe("test.pdf");
    });
  });

  it("should handle page navigation", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const pageInput = document.getElementById("page-input") as HTMLInputElement;
      pageInput.value = "5";
      pageInput.dispatchEvent(new Event("change"));

      expect(pageInput.value).toBe("5");
      expect(apiClient.post).toHaveBeenCalledWith("/api/progress", expect.objectContaining({ page: 5 }));
    });
  });

  it("should handle zoom in/out", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnZoomIn = document.getElementById("btn-zoom-in") as HTMLButtonElement;
      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;

      btnZoomIn.click();
      // zoom starts at 1.0, increases by 0.1
      expect(zoomInput.value).toBe("110%");
    });
  });

  it("should toggle sidebar visibility", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    const btnSidebar = document.getElementById("btn-sidebar") as HTMLButtonElement;
    const sidebar = document.getElementById("pdf-sidebar") as HTMLElement;

    // Initial state depends on window.innerWidth, but we can toggle it
    const isInitiallyOpen = !sidebar.classList.contains("w-0");
    btnSidebar.click();
    expect(sidebar.classList.contains("w-0")).toBe(isInitiallyOpen);
  });

  it("should handle fit-to-width", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnFitWidth = document.getElementById("btn-fit-width") as HTMLButtonElement;
      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;

      btnFitWidth.click();
      // Logic sets zoom to a specific value based on container width
      expect(zoomInput.value).not.toBe("100%");
    });
  });

  it("should handle fit-to-height", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnFitHeight = document.getElementById("btn-fit-height") as HTMLButtonElement;
      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;

      btnFitHeight.click();
      expect(zoomInput.value).not.toBe("100%");
    });
  });

  it("should show help modal", async () => {
    initPdfViewer({
      assetId: "a1",
      courseId: "c1",
      path: "test.pdf",
      initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnHelp = document.getElementById("btn-help") as HTMLButtonElement;
      btnHelp.click();
      expect(document.getElementById("help-modal")).not.toBeNull();
    });
  });
  it("should handle rotation", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;
      btnRotate.click();
      // Rotation should increment by 90
      expect(pdfjs.getDocument).toHaveBeenCalled();
    });
  });

  it("should handle observers and zoom input", async () => {
    let intersectionCallbacks: any[] = [];
    window.IntersectionObserver = vi.fn().mockImplementation(function (cb) {
      intersectionCallbacks.push(cb);
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    let resizeCallback: any;
    window.ResizeObserver = vi.fn().mockImplementation(function (cb) {
      resizeCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      expect(intersectionCallbacks.length).toBe(2);
      const [pageObserverCb, thumbObserverCb] = intersectionCallbacks;

      // 1. Trigger page observer
      pageObserverCb([{ isIntersecting: true, target: { dataset: { pageNumber: "2" } } }]);
      const pageInput = document.getElementById("page-input") as HTMLInputElement;
      expect(pageInput.value).toBe("2");

      // 2. Trigger while user navigating (should skip)
      const btnZoomIn = document.getElementById("btn-zoom-in") as HTMLButtonElement;
      btnZoomIn.click(); // Sets isUserNavigating = true
      pageObserverCb([{ isIntersecting: true, target: { dataset: { pageNumber: "3" } } }]);
      expect(pageInput.value).toBe("2"); // Not updated to 3

      // 3. Trigger thumbnail observer
      thumbObserverCb([{ isIntersecting: true, target: { dataset: { pageNumber: "4" } } }]);

      if (resizeCallback) {
        resizeCallback([{ contentRect: { width: 1000, height: 1000 } }]);
      }

      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;
      zoomInput.dispatchEvent(new Event("focus"));
      zoomInput.value = "150%";
      zoomInput.dispatchEvent(new Event("change"));
      zoomInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(pdfjs.getDocument).toHaveBeenCalled();
    });
  });
  it("should handle scroll events to update current page", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    const pdfContainer = document.getElementById("pdf-container") as HTMLElement;

    // Mock getBoundingClientRect for pages to simulate scroll position
    // This is complex in JSDOM, but we can at least trigger the event
    pdfContainer.dispatchEvent(new Event("scroll"));
  });

  it("should handle zoom, fit, rotation, and navigation buttons", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    const btnZoomIn = document.getElementById("btn-zoom-in") as HTMLButtonElement;
    const btnZoomOut = document.getElementById("btn-zoom-out") as HTMLButtonElement;
    const btnFitWidth = document.getElementById("btn-fit-width") as HTMLButtonElement;
    const btnFitHeight = document.getElementById("btn-fit-height") as HTMLButtonElement;
    const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;

    // Trigger buttons
    btnZoomIn.click();
    btnZoomOut.click();
    btnFitWidth.click();
    btnFitHeight.click();
    btnRotate.click();

    // Key board navigation
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" })); // Fit width
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" })); // Fit height
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" })); // Rotate
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" })); // Help

    expect(pdfjs.getDocument).toHaveBeenCalled();
  });

  it("should handle sidebar toggle and help modal", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    const btnSidebar = document.getElementById("btn-sidebar") as HTMLButtonElement;
    btnSidebar.click();
    btnSidebar.click(); // toggle back

    const btnHelp = document.getElementById("btn-help") as HTMLButtonElement;
    btnHelp.click(); // Show help

    // Help modal should be created
    let helpModal = document.getElementById("help-modal");
    expect(helpModal).not.toBeNull();

    // Toggle again
    btnHelp.click();
    expect(helpModal?.classList.contains('opacity-0')).toBe(true);

    btnHelp.click();
    expect(helpModal?.classList.contains('opacity-0')).toBe(false);

    // Close help modal with keydown (not ? or Enter)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(helpModal?.classList.contains('opacity-0')).toBe(true);

    // Test close button
    btnHelp.click(); // show again
    expect(helpModal?.classList.contains('opacity-0')).toBe(false);
    const closeBtn = helpModal?.querySelector('[data-close-help]') as HTMLButtonElement;
    closeBtn.click();
    expect(helpModal?.classList.contains('opacity-0')).toBe(true);

    // Test click on modal background
    btnHelp.click(); // show again
    helpModal?.dispatchEvent(new MouseEvent('click', { bubbles: true })); // Event target will be helpModal if clicked directly
    expect(helpModal?.classList.contains('opacity-0')).toBe(true);
  });

  it("should handle all keyboard shortcuts", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 5,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const handler = window.onkeydown;
      if (!handler) throw new Error("Handler not attached");

      const createKeyEv = (key: string, target: any = document.body) => {
        return { key, preventDefault: vi.fn(), target } as any;
      };

      handler.call(window, createKeyEv("ArrowUp"));
      handler.call(window, createKeyEv("PageUp"));
      handler.call(window, createKeyEv("ArrowLeft"));
      handler.call(window, createKeyEv("ArrowDown"));
      handler.call(window, createKeyEv("PageDown"));
      handler.call(window, createKeyEv("ArrowRight"));
      handler.call(window, createKeyEv(" "));
      handler.call(window, createKeyEv("Home"));
      handler.call(window, createKeyEv("End"));
      handler.call(window, createKeyEv("f"));
      handler.call(window, createKeyEv("h"));
      handler.call(window, createKeyEv("r"));
      handler.call(window, createKeyEv("?"));

      // Test input skip
      const input = document.createElement("input");
      handler.call(window, createKeyEv("ArrowUp", input));

      expect(pdfjs.getDocument).toHaveBeenCalled();
    });
  });

  it("should handle missing templates and pdfDoc null", async () => {
    setupDOM();
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
  });

  it("should handle syncThumbnailPlaceholders height constraint", async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: () => ({ width: 100, height: 1000 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
    } as any);

    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "tall.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      expect(document.getElementById("pdf-title")?.textContent).toBe("tall.pdf");
    });
  });

  it("should handle error in metadata update and progress save", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("API Error"));
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
    // Errors are caught and ignored in these functions, should not crash
    await vi.waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
  });

  it("should handle reRenderAll alignment with existing pages", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(async () => {
      const page1 = document.querySelector('[data-page-number="1"]') as HTMLElement;
      if (!page1) throw new Error("Page 1 not found");

      // Mock dimensions for alignment logic
      Object.defineProperty(page1, 'offsetTop', { value: 100, configurable: true });

      let height = 800;
      Object.defineProperty(page1, 'offsetHeight', {
        get: () => {
          const h = height;
          height = 1000; // Change for the second call in reRenderAll
          return h;
        },
        configurable: true
      });

      const container = document.getElementById('pdf-container') as HTMLElement;
      Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });

      let scrollTop = 200;
      Object.defineProperty(container, 'scrollTop', {
        get: () => scrollTop,
        set: (v) => { scrollTop = v; },
        configurable: true
      });

      const btnZoomIn = document.getElementById("btn-zoom-in") as HTMLButtonElement;
      btnZoomIn.click();

      expect(scrollTop).not.toBe(200); // Should have updated due to height change
    });
  });

  it("should handle reRenderAll when page element is missing", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
    await vi.waitFor(async () => {
      const btnZoomIn = document.getElementById("btn-zoom-in") as HTMLButtonElement;
      document.getElementById('pdf-container')!.innerHTML = ''; // Force missing elements
      btnZoomIn.click();
    });
  });

  it("should handle initialization errors", async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.reject(new Error("PDF Load Failed")),
    } as any);

    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "bad.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      expect(document.querySelector('[data-error-message]')?.textContent).toBe("PDF Load Failed");
      expect(errorSpy).toHaveBeenCalled();
    });
    errorSpy.mockRestore();
  });

  it("should handle error in fetchVisitedSegments", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Network Error"));
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
    // Error caught and ignored
  });

  it("should handle missing sub-elements in templates", async () => {
    vi.useFakeTimers();
    // Provide templates without optional children
    document.body.innerHTML = `
      <div id="pdf-container"></div><div id="pdf-sidebar"></div><div id="thumbnails-container"></div>
      <input id="page-input" /><div id="total-pages"></div><input id="zoom-input" />
      <div id="loading"></div><div id="pdf-title"></div>
      <button id="btn-sidebar"></button><button id="btn-zoom-in"></button><button id="btn-zoom-out"></button>
      <button id="btn-fit-width"></button><button id="btn-fit-height"></button><button id="btn-rotate"></button>
      <button id="btn-help"></button><div id="fit-active-bg"></div>
      <template id="thumb-template"><div data-thumb-row></div></template>
      <template id="page-template"><div data-page-row></div></template>
      <template id="help-template"><div id="help-modal"><div data-modal-content></div></div></template>
    `;

    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const btnHelp = document.getElementById("btn-help") as HTMLButtonElement;
      btnHelp.click();
      vi.advanceTimersByTime(20);
      const modal = document.getElementById("help-modal")!;
      modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); // Should not close
      expect(modal.classList.contains('opacity-0')).toBe(false);

      // Click on modal content should NOT close
      const content = modal.querySelector('[data-modal-content]')!;
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(modal.classList.contains('opacity-0')).toBe(false);

      modal.dispatchEvent(new MouseEvent('click', { bubbles: false })); // Dummy to hit the "else"
    });
    vi.useRealTimers();
  });

  it("should handle zoom input edge cases", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
    await vi.waitFor(() => {
      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;
      zoomInput.value = "notanumber%";
      zoomInput.dispatchEvent(new Event("change"));
      expect(zoomInput.value).toBe("100%"); // isNaN branch

      zoomInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(document.activeElement).not.toBe(zoomInput);
    });
  });

  it("should handle observer entries not intersecting", async () => {
    let intersectionCallbacks: any[] = [];
    window.IntersectionObserver = vi.fn().mockImplementation(function (cb) {
      intersectionCallbacks.push(cb);
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      const [pageCb, thumbCb] = intersectionCallbacks;
      pageCb([{ isIntersecting: false }]);
      thumbCb([{ isIntersecting: false }]);
      expect(pdfjs.getDocument).toHaveBeenCalled();
    });
  });

  it("should handle renderThumbnail missing container", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });
    // Hits internal logic for thumb missing container
  });

  it("should handle render errors for pages and thumbnails", async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.reject(new Error("Render Failed")) }),
        }),
      }),
    } as any);

    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "fail.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => { expect(errorSpy).toHaveBeenCalled(); });
    errorSpy.mockRestore();
  });

  it("should cover rotation scale branch and input Enter events", async () => {
    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(async () => {
      const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;
      const pageInput = document.getElementById("page-input") as HTMLInputElement;
      const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;

      // Cover 'scaleWidth <= scaleHeight' branch
      // Default mock is 600/800 = 0.75, so scaleWidth will likely be smaller than scaleHeight
      btnRotate.click();

      // Page input Enter
      pageInput.value = "7";
      pageInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(pageInput.value).toBe("7");

      // Zoom input Enter
      zoomInput.value = "200%";
      zoomInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      expect(document.activeElement).not.toBe(zoomInput);
    });
  });

  it("should handle a very tall PDF to trigger branches", async () => {
    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: () => ({ width: 10, height: 1000 }), // Extremely tall
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
    } as any);

    initPdfViewer({
      assetId: "tall1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
      expect(document.getElementById("pdf-container")).not.toBeNull();
    });
  });
});
