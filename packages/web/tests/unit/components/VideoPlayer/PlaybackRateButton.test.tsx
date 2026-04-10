import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlaybackRateButton from "@web/components/VideoPlayer/PlaybackRateButton";

describe("PlaybackRateButton Component", () => {
    it("should render current rate", () => {
        render(<PlaybackRateButton playbackRate={1} onRateChange={() => {}} />);
        expect(screen.getByText("1x")).toBeInTheDocument();
    });

    it("should call onRateChange with next rate on click", () => {
        const onRateChange = vi.fn();
        render(<PlaybackRateButton playbackRate={1} onRateChange={onRateChange} />);
        
        fireEvent.click(screen.getByRole("button"));
        expect(onRateChange).toHaveBeenCalledWith(1.25);
    });

    it("should cycle correctly according to the defined rates", () => {
      const onRateChange = vi.fn();
      
      // If current is 0.5, next should be 0.75
      const { rerender } = render(<PlaybackRateButton playbackRate={0.5} onRateChange={onRateChange} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onRateChange).toHaveBeenCalledWith(0.75);
      
      // If current is 0.75, next should be 1
      rerender(<PlaybackRateButton playbackRate={0.75} onRateChange={onRateChange} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onRateChange).toHaveBeenCalledWith(1);
      
      // If current is 2, next should be 0.5
      rerender(<PlaybackRateButton playbackRate={2} onRateChange={onRateChange} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onRateChange).toHaveBeenCalledWith(0.5);
    });
});
