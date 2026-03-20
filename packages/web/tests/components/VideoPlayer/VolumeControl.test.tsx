import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import VolumeControl from "@components/VideoPlayer/VolumeControl";

// Mock Icon component
vi.mock("@components/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="mock-icon">{name}</span>,
}));

describe("VolumeControl Component", () => {
  it("should show volume-x icon when volume is 0", () => {
    render(<VolumeControl volume={0} onVolumeChange={() => {}} />);
    expect(screen.getByTestId("mock-icon")).toHaveTextContent("volume-x");
  });

  it("should show volume-2 icon when volume is > 0", () => {
    render(<VolumeControl volume={0.5} onVolumeChange={() => {}} />);
    expect(screen.getByTestId("mock-icon")).toHaveTextContent("volume-2");
  });

  it("should call onVolumeChange when input changes", () => {
    const onVolumeChange = vi.fn();
    render(<VolumeControl volume={0.5} onVolumeChange={onVolumeChange} />);
    
    const slider = screen.getByLabelText("Volumen");
    fireEvent.change(slider, { target: { value: "0.8" } });
    
    expect(onVolumeChange).toHaveBeenCalled();
  });
});
