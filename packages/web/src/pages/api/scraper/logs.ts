import type { APIRoute } from 'astro';
import { LogBroker } from '@core/logging';

export const GET: APIRoute = async ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = LogBroker.subscribe((entry) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(entry)}\n\n`);
        } catch (e) {
          // Stream might be closed
          unsubscribe();
        }
      });

      request.signal.addEventListener('abort', () => {
        unsubscribe();
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
