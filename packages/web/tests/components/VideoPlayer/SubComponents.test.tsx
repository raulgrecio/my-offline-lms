import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import FullscreenButton from "@components/VideoPlayer/FullscreenButton";
import PlayOverlay from "@components/VideoPlayer/PlayOverlay";
import VideoTitle from "@components/VideoPlayer/VideoTitle";
import SubtitleToggleButton from "@components/VideoPlayer/SubtitleToggleButton";
import SettingsButton from "@components/VideoPlayer/SettingsButton";
import ControlOverlay from "@components/VideoPlayer/ControlOverlay";

describe("VideoPlayer Sub-components", () => {
  describe("FullscreenButton", () => {
    it("renders maximize icon when not fullscreen", () => {
      const onToggle = vi.fn();
      render(<FullscreenButton isFullscreen={false} onToggle={onToggle} />);
      const btn = screen.getByLabelText("Pantalla completa");
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalled();
    });

    it("renders minimize icon when fullscreen", () => {
      render(<FullscreenButton isFullscreen={true} onToggle={() => {}} />);
      expect(screen.getByLabelText("Salir de pantalla completa")).toBeInTheDocument();
    });
  });

  describe("PlayOverlay", () => {
    it("returns null if not visible", () => {
      const { container } = render(<PlayOverlay isVisible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders play icon when visible", () => {
      const { container } = render(<PlayOverlay isVisible={true} />);
      expect(container.querySelector(".w-16")).toBeInTheDocument();
    });
  });

  describe("VideoTitle", () => {
    it("renders the title", () => {
      render(<VideoTitle title="Test Video Title" isVisible={true} />);
      expect(screen.getByText("Test Video Title")).toBeInTheDocument();
    });
    
    it("hides correctly", () => {
      const { container } = render(<VideoTitle title="Title" isVisible={false} />);
      const overlay = container.querySelector(".opacity-0");
      expect(overlay).toBeInTheDocument();
    });
  });

  describe("SubtitleToggleButton", () => {
    it("toggles correctly", () => {
        const onToggle = vi.fn();
        render(<SubtitleToggleButton isVisible={true} onToggle={onToggle} />);
        const btn = screen.getByLabelText("Desactivar subtítulos");
        fireEvent.click(btn);
        expect(onToggle).toHaveBeenCalled();
    });

    it("shows activate title when not visible", () => {
      render(<SubtitleToggleButton isVisible={false} onToggle={() => {}} />);
      expect(screen.getByLabelText("Activar subtítulos")).toBeInTheDocument();
    });
  });

  describe("SettingsButton", () => {
    it("toggles correctly", () => {
        const onToggle = vi.fn();
        render(<SettingsButton isOpen={false} onToggle={onToggle} />);
        const btn = screen.getByLabelText("Configuración de subtítulos");
        fireEvent.click(btn);
        expect(onToggle).toHaveBeenCalled();
    });
    
    it("shows open state", () => {
      const { container } = render(<SettingsButton isOpen={true} onToggle={() => {}} />);
      // SettingsButton uses text-brand-400 bg-white/5 when active
      expect(container.querySelector(".text-brand-400")).toBeInTheDocument();
    });
  });

  describe("ControlOverlay", () => {
    it("stops propagation on click", () => {
      const onClick = vi.fn();
      render(
        <div onClick={onClick}>
          <ControlOverlay isVisible={true}>
            <button data-testid="child">Child</button>
          </ControlOverlay>
        </div>
      );
      
      fireEvent.click(screen.getByTestId("child"));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("hides when isVisible is false", () => {
      const { container } = render(
        <ControlOverlay isVisible={false}>
          <div>Child</div>
        </ControlOverlay>
      );
      expect(container.querySelector(".opacity-0")).toBeInTheDocument();
    });
  });
});
