import { describe, it, expect, vi } from 'vitest';
import { TaskBroker, CANCEL_TASK_COMMAND } from '@scraper/features/task-management';

describe('TaskBroker', () => {
  it('should notify local subscribers when emitting', () => {
    const subscriber = vi.fn();
    TaskBroker.subscribe(subscriber);

    TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-1');

    expect(subscriber).toHaveBeenCalled();
    const command = subscriber.mock.calls[0][0];
    expect(command.type).toBe(CANCEL_TASK_COMMAND);
    expect(command.payload.taskId).toBe('task-1');
  });

  it('should handle subscriber errors without crashing', () => {
    const crashingSubscriber = vi.fn().mockImplementation(() => {
      throw new Error('Boom');
    });
    const healthySubscriber = vi.fn();

    TaskBroker.subscribe(crashingSubscriber);
    TaskBroker.subscribe(healthySubscriber);

    expect(() => TaskBroker.emit(CANCEL_TASK_COMMAND, 'task-2')).not.toThrow();
    expect(healthySubscriber).toHaveBeenCalled();
  });

  it('should handle remote messages from BroadcastChannel', () => {
    const subscriber = vi.fn();
    TaskBroker.subscribe(subscriber);

    // Access private channel to simulate message
    const channel = (TaskBroker as any).channel;
    if (channel && channel.onmessage) {
      const remoteCommand = {
        type: CANCEL_TASK_COMMAND,
        payload: { taskId: 'remote-task' },
        metadata: { timestamp: new Date().toISOString() }
      };

      channel.onmessage({ data: remoteCommand } as MessageEvent);
      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
        payload: { taskId: 'remote-task' }
      }));
    }
  });
});
