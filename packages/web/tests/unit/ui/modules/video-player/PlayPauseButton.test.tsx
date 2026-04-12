import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayPauseButton from "@web/ui/modules/video-player/PlayPauseButton";

// Mock the child component to focus on PlayPauseButton logic
vi.mock("@web/ui/modules/video-player/PlayerButton", () => ({
  default: ({ title, onClick }: any) => (
    <button title={title} onClick={onClick} data-testid="mock-player-button">
      {title}
    </button>
  ),
}));

describe("PlayPauseButton Component", () => {
  it("should show 'Pausar' title when isPlaying is true", () => {
    render(<PlayPauseButton isPlaying={true} onToggle={() => {}} />);
    const button = screen.getByTestId("mock-player-button");
    expect(button).toHaveAttribute("title", "Pausar");
  });

  it("should show 'Reproducir' title when isPlaying is false", () => {
    render(<PlayPauseButton isPlaying={false} onToggle={() => {}} />);
    const button = screen.getByTestId("mock-player-button");
    expect(button).toHaveAttribute("title", "Reproducir");
  });

  it("should call onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<PlayPauseButton isPlaying={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId("mock-player-button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
