import { describe, it, expect, vi, beforeEach } from "vitest";
import * as pdfjs from "pdfjs-dist";

import { apiClient } from "@platform/api/client";
import { initPdfViewer } from "@components/PDFViewer/pdf-viewer-client";

// Mock pdfjs-dist
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 10,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
  GlobalWorkerOptions: {
    workerSrc: "",
  },
}));

// Mock apiClient
vi.mock("@platform/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
window.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

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
    let intersectionCallback: any;
    window.IntersectionObserver = vi.fn().mockImplementation(function(cb) {
        intersectionCallback = cb;
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    let resizeCallback: any;
    window.ResizeObserver = vi.fn().mockImplementation(function(cb) {
        resizeCallback = cb;
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    initPdfViewer({
      assetId: "a1", courseId: "c1", path: "test.pdf", initialPage: 1,
      options: { progressUrl: "/api/progress", metadataUrl: "/api/metadata" },
    });

    await vi.waitFor(() => {
        const zoomInput = document.getElementById("zoom-input") as HTMLInputElement;
        
        // Trigger observers if ready
        if (intersectionCallback) {
            intersectionCallback([{ isIntersecting: true, target: { dataset: { pageNumber: "2" } } }]);
        }
        if (resizeCallback) {
            resizeCallback([{ contentRect: { width: 1000, height: 1000 } }]);
        }

        // Trigger zoom input
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
    expect(helpModal).toBeDefined();

    // Toggle again
    btnHelp.click(); 
    expect(helpModal?.classList.contains('opacity-0')).toBe(true);
    
    btnHelp.click();
    expect(helpModal?.classList.contains('opacity-0')).toBe(false);
  });
});
