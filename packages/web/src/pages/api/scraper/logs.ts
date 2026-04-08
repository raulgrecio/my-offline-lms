import type { APIRoute } from 'astro';
import { LogBroker } from '@core/logging';

export const GET: APIRoute = async ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      // 1. Subscribe to LogBroker events
      const unsubscribe = LogBroker.subscribe((entry) => {
        try {
          // Normalize the data for the frontend LogEntry interface
          const normalizedLog = {
            timestamp: entry.metadata.timestamp,
            level: entry.payload.level,
            context: entry.metadata.context || 'system',
            message: entry.payload.message
          };

          controller.enqueue(`data: ${JSON.stringify(normalizedLog)}\n\n`);
        } catch (e) {
          // Stream might be closed
          unsubscribe();
          clearInterval(heartbeat);
        }
      });

      // 2. Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(': heartbeat\n\n');
        } catch (e) {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000); // 15 seconds

      // 3. Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
