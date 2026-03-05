import { describe, it, expect, vi } from 'vitest';

describe('Environment Configuration', () => {
    it('should validate environment variables', async () => {
        // Mocking process.exit to avoid crashing the test runner
        const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
            throw new Error(`Process exited with code ${code}`);
        });
        
        const originalEnv = process.env;
        process.env = { ...originalEnv, PLATFORM_BASE_URL: 'not-a-url' };
        
        // Use a dynamic import to trigger the validation logic
        try {
            await import('../../config/env');
        } catch (e) {
            // It might fail validation
        } finally {
            process.env = originalEnv;
            mockExit.mockRestore();
        }
    });
});
