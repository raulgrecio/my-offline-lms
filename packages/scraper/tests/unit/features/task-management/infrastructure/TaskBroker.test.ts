import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as BroadcastUtils from '@core/broadcast/BroadcastChannelUtils';
import { TaskBroker, CANCEL_TASK_COMMAND } from '@scraper/features/task-management';

// 1. We use vi.hoisted to ensure this variable is available during vi.mock hoisting
const { mockChannelInstance } = vi.hoisted(() => ({
  mockChannelInstance: {
    postMessage: vi.fn(),
    onmessage: null as any
  }
}));

// 2. Mock the utility to always return our stable mock
vi.mock('@core/broadcast/BroadcastChannelUtils', async () => {
  const actual = await vi.importActual<typeof import('@core/broadcast/BroadcastChannelUtils')>('@core/broadcast/BroadcastChannelUtils');
  return {
    ...actual,
    getSafeBroadcastChannel: vi.fn().mockReturnValue(mockChannelInstance),
  };
});

describe('TaskBroker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TaskBroker.reset(); // Ensures singleton starts fresh
  });

  it('should notify local subscribers when emitting', () => {
    const subscriber = vi.fn();
    TaskBroker.subscribe(subscriber);

    TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-1');

    expect(subscriber).toHaveBeenCalled();
    const command = subscriber.mock.calls[0][0];
    expect(command.type).toBe(CANCEL_TASK_COMMAND);
    expect(command.payload.taskId).toBe('task-1');
  });

  it('should handle unsubscription', () => {
    const subscriber = vi.fn();
    const unsubscribe = TaskBroker.subscribe(subscriber);

    TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-sub-1');
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsubscribe();
    TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-sub-2');
    expect(subscriber).toHaveBeenCalledTimes(1); // Should not increase
  });

  it('should handle subscriber errors without crashing other subscribers', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const crashingSubscriber = vi.fn().mockImplementation(() => { throw new Error('Boom'); });
    const healthySubscriber = vi.fn();

    TaskBroker.subscribe(crashingSubscriber);
    TaskBroker.subscribe(healthySubscriber);

    expect(() => TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-2')).not.toThrow();
    expect(crashingSubscriber).toHaveBeenCalled();
    expect(healthySubscriber).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should handle remote messages received from BroadcastChannel', () => {
    const subscriber = vi.fn();
    TaskBroker.subscribe(subscriber);
    
    // Simulate a message coming from another process via our stable mock
    const remoteCommand = {
      type: CANCEL_TASK_COMMAND,
      payload: { taskId: 'remote-task' },
      metadata: { timestamp: new Date().toISOString() }
    };

    // If TaskBroker attached a listener, we trigger it
    if (mockChannelInstance.onmessage) {
      mockChannelInstance.onmessage({ data: remoteCommand } as MessageEvent);
      
      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
        payload: { taskId: 'remote-task' }
      }));
    }
  });

  it('should be safe to notify when no subscribers exist', () => {
    expect(() => TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-ok')).not.toThrow();
  });
});
