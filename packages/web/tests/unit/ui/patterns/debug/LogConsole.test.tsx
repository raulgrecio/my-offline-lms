import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogConsole } from "@web/ui/patterns/debug/LogConsole";

// Mock EventSource
const mockEventSourceInstances: any[] = [];
class MockEventSource {
  onmessage: ((event: any) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    mockEventSourceInstances.push(this);
  }

  close = vi.fn();
}

vi.stubGlobal("EventSource", MockEventSource);

describe("LogConsole Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances.length = 0;
  });

  it("should render initial state", () => {
    render(<LogConsole />);
    expect(screen.getByText(/Scraper_Terminal_v1\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Esperando logs de actividad/i)).toBeInTheDocument();
    expect(screen.getAllByText(/DISCONNECTED/i).length).toBeGreaterThan(0);
  });

  it("should show CONNECTED/ON when connection opens", () => {
    render(<LogConsole />);
    const eventSourceInstance = mockEventSourceInstances[0];

    act(() => {
      if (eventSourceInstance.onopen) eventSourceInstance.onopen();
    });

    expect(screen.getAllByText(/CONNECTED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ON/i).length).toBeGreaterThan(0);
  });

  it("should display logs when received", () => {
    render(<LogConsole />);
    const eventSourceInstance = mockEventSourceInstances[0];

    const mockLog = {
      timestamp: new Date().toISOString(),
      level: "info",
      context: "scraper",
      message: "Test log message"
    };

    act(() => {
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({ data: JSON.stringify(mockLog) });
      }
    });

    expect(screen.getByText(/Test log message/i)).toBeInTheDocument();
    expect(screen.getByText(/\[scraper\]/i)).toBeInTheDocument();
  });

  it("should clear logs when clear button is clicked", () => {
    render(<LogConsole />);
    const eventSourceInstance = mockEventSourceInstances[0];

    act(() => {
      if (eventSourceInstance.onmessage) {
        eventSourceInstance.onmessage({
          data: JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "info",
            context: "test",
            message: "Clear me"
          })
        });
      }
    });

    expect(screen.getByText(/Clear me/i)).toBeInTheDocument();

    const clearButton = screen.getByTitle(/Clear console/i);
    fireEvent.click(clearButton);

    expect(screen.queryByText(/Clear me/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Esperando logs de actividad/i)).toBeInTheDocument();
  });
});
