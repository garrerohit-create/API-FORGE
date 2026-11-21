import { EventEmitter } from 'node:events';

/**
 * Central Node.js EventEmitter for application lifecycle and telemetry events.
 * Used for real-time notifications, audit logs, and decoupling secondary tasks.
 */
class AppEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Set appropriate max listeners
    this.setMaxListeners(30);

    // Default error listener to avoid uncaughtException crashes
    this.on('error', (err) => {
      console.error('[AppEventEmitter Error]:', err);
    });
  }
}

export const appEvents = new AppEventEmitter();

// Documented event names
export const EVENT_TYPES = {
  REQUEST_STARTED: 'request.started',
  REQUEST_COMPLETED: 'request.completed',
  REQUEST_FAILED: 'request.failed',
  MOCK_ENDPOINT_UPDATED: 'mock.endpoint.updated',
  MOCK_CALLED: 'mock.called',
  TEST_RUN_STARTED: 'test.run.started',
  TEST_RUN_COMPLETED: 'test.run.completed',
  COLLECTION_RUN_STARTED: 'collection.run.started',
  COLLECTION_RUN_COMPLETED: 'collection.run.completed'
};
