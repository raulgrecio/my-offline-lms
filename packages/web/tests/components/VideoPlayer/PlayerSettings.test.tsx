import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayerSettings from "@components/VideoPlayer/PlayerSettings";

// Mock Icon component
vi.mock("@components/Icon", () => ({
  Icon: () => <span data-testid="mock-icon" />,
}));

describe("PlayerSettings Component", () => {
  const defaultProps = {
    subtitleMode: 'custom' as const,
    onChangeSubtitleMode: vi.fn(),
    subtitleOpacity: 0.8,
    onChangeSubtitleOpacity: vi.fn(),
    onClose: vi.fn(),
  };

  it("should display the current subtitle mode correctly", () => {
    render(<PlayerSettings {...defaultProps} />);
    
    // Select the first button with name "Personalizados" (for desktop/mobile)
    const customBtn = screen.getAllByRole("button", { name: /Personalizados/i })[0];
    expect(customBtn).toHaveClass("bg-white/10");
  });

  it("should call onChangeSubtitleMode when a mode is clicked", () => {
    const { rerender } = render(<PlayerSettings {...defaultProps} />);
    
    // Test native click
    const nativeBtn = screen.getAllByText("Nativos")[0];
    fireEvent.click(nativeBtn);
    expect(defaultProps.onChangeSubtitleMode).toHaveBeenCalledWith('native');

    // Test custom click when currently native
    rerender(<PlayerSettings {...defaultProps} subtitleMode="native" />);
    const customBtn = screen.getAllByText("Personalizados")[0];
    fireEvent.click(customBtn);
    expect(defaultProps.onChangeSubtitleMode).toHaveBeenCalledWith('custom');
  });

  it("should disable opacity slider when mode is native", () => {
    const { container } = render(<PlayerSettings {...defaultProps} subtitleMode="native" />);
    const sliderContainer = container.querySelector(".opacity-20");
    expect(sliderContainer).toBeInTheDocument();
  });

  it("should call onChangeSubtitleOpacity when range input changes", () => {
    render(<PlayerSettings {...defaultProps} />);
    
    const slider = screen.getAllByRole("slider")[0];
    fireEvent.change(slider, { target: { value: "0.5" } });
    
    expect(defaultProps.onChangeSubtitleOpacity).toHaveBeenCalledWith(0.5);
  });

  it("should call onClose when close button is clicked (mobile)", () => {
    render(<PlayerSettings {...defaultProps} />);
    
    const closeBtn = screen.getByLabelText("Cerrar");
    fireEvent.click(closeBtn);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
