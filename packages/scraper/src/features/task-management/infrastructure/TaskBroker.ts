import { getSafeBroadcastChannel } from "@core/broadcast/BroadcastChannelUtils";

const SCRAPER_CHANNEL_NAME = 'my-offline-lms-scraper-commands';

export const CANCEL_TASK_COMMAND = 'CANCEL_TASK';
export type TaskCommandType = typeof CANCEL_TASK_COMMAND;

export interface TaskCommand {
  type: TaskCommandType;
  payload: {
    taskId: string;
    [key: string]: any;
  };
  metadata: {
    timestamp: string;
  };
}

export type CommandSubscriber = (command: TaskCommand) => void;


/**
 * Event bridge for task-specific commands across processes.
 */
class TaskBrokerFacade {
  private readonly subscribers = new Set<CommandSubscriber>();
  private readonly channel = getSafeBroadcastChannel(SCRAPER_CHANNEL_NAME);

  constructor() {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        const command = event.data as TaskCommand;
        this.notify(command);
      };
    }
  }

  /**
   * Emit a command to be executed by the scraper.
   */
  emit(type: TaskCommandType, taskId: string, extra: Record<string, any> = {}) {
    const command: TaskCommand = {
      type,
      payload: {
        taskId,
        ...extra
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    // 1. Notify local subscribers
    this.notify(command);

    // 2. Broadcast to other processes (Web -> Scraper context)
    if (this.channel) {
      this.channel.postMessage(command);
    }
  }

  subscribe(callback: CommandSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(command: TaskCommand) {
    this.subscribers.forEach(cb => {
      try {
        cb(command);
      } catch (e) {
        console.error('Error handling scraper command:', e);
      }
    });
  }

  reset() {
    this.subscribers.clear();
  }
}

export const TaskBroker = new TaskBrokerFacade();
