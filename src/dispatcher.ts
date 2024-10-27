import * as logging from 'logging';
import { Event, Handler } from './types'; // Предполагается, что Event и Handler объявлены в types.ts

// Исключение StopDispatching
class StopDispatching extends Error {
  constructor(message: string = 'Stopping dispatching.') {
    super(message);
    this.name = 'StopDispatching';
  }
}

class Dispatcher {
  private log: logging.Logger;
  private bot: any;
  private handlers: Handler[];

  constructor(bot: any) {
    this.log = logging.getLogger('Dispatcher');
    this.bot = bot;
    this.handlers = [];
  }

  addHandler(handler: Handler): void {
    this.handlers.push(handler);
  }

  removeHandler(handler: Handler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  async dispatch(event: Event): Promise<void> {
    try {
      this.log.debug(`Dispatching event '${event}'.`);
      for (const handler of this.handlers) {
        if (handler.check(event, this)) {
          await handler.handle(event, this);
        }
      }
    } catch (error) {
      if (error instanceof StopDispatching) {
        this.log.debug(`Caught '${StopDispatching.name}' exception, stopping dispatching.`);
      } else {
        this.log.error('Exception while dispatching event!', error);
      }
    }
  }
}

export { Dispatcher, StopDispatching };
