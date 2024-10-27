import { EventType } from './event';
import { Filter } from './filter';
import { StopDispatching } from './dispatcher';

abstract class HandlerBase {
  protected filters: any;
  protected callback: Function | null;

  constructor(filters: any = null, callback: Function | null = null) {
    this.filters = filters;
    this.callback = callback;
  }

  public check(event: any, dispatcher: any): boolean {
    return !this.filters || this.filters(event);
  }

  public handle(event: any, dispatcher: any): void {
    if (this.callback) {
      this.callback(dispatcher.bot, event);
    }
  }
}

class DefaultHandler extends HandlerBase {
  constructor(callback: Function | null = null) {
    super(null, callback);
  }

  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && !dispatcher.handlers.some((h: any) => h !== this && h.check(event, dispatcher));
  }

  public handle(event: any, dispatcher: any): void {
    super.handle(event, dispatcher);
    throw new StopDispatching();
  }
}

class NewChatMembersHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.NEW_CHAT_MEMBERS;
  }
}

class LeftChatMembersHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.LEFT_CHAT_MEMBERS;
  }
}

class PinnedMessageHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.PINNED_MESSAGE;
  }
}

class UnPinnedMessageHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.UNPINNED_MESSAGE;
  }
}

class MessageHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.NEW_MESSAGE;
  }
}

class EditedMessageHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.EDITED_MESSAGE;
  }
}

class DeletedMessageHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.DELETED_MESSAGE;
  }
}

class CommandHandler extends MessageHandler {
  private command: string | string[] | null;

  constructor(command: string | string[] | null = null, filters: any = null, callback: Function | null = null) {
    super(filters ? Filter.command.and(filters) : Filter.command, callback);
    this.command = command;
  }

  public check(event: any, dispatcher: any): boolean {
    if (super.check(event, dispatcher)) {
      const commandText = event.data['text'].split(' ')[0].substring(1).toLowerCase();
      if (this.command) {
        return Array.isArray(this.command)
          ? this.command.includes(commandText)
          : this.command === commandText;
      }
      return true;
    }
    return false;
  }
}

class HelpCommandHandler extends CommandHandler {
  constructor(filters: any = null, callback: Function | null = null) {
    super('help', filters, callback);
  }
}

class StartCommandHandler extends CommandHandler {
  constructor(filters: any = null, callback: Function | null = null) {
    super('start', filters, callback);
  }
}

class FeedbackCommandHandler extends CommandHandler {
  private target: string;
  private messageTemplate: string;
  private replyMessage: string;
  private errorMessage: string | null;

  constructor(
    target: string,
    messageTemplate: string = 'Feedback from {source}: {message}',
    replyMessage: string = 'Got it!',
    errorMessage: string | null = null,
    command: string = 'feedback',
    filters: any = null
  ) {
    super(command, filters, (bot, event) => this.messageCallback(bot, event));
    this.target = target;
    this.messageTemplate = messageTemplate;
    this.replyMessage = replyMessage;
    this.errorMessage = errorMessage;
  }

  private messageCallback(bot: any, event: any): void {
    const source = event.data['chat']['chatId'];
    const feedbackText = event.data['text'].split(' ').slice(1).join(' ').trim();

    if (feedbackText) {
      bot.sendText(this.target, this.messageTemplate.replace('{source}', source).replace('{message}', feedbackText));
      if (this.replyMessage) bot.sendText(source, this.replyMessage);
    } else if (this.errorMessage) {
      bot.sendText(source, this.errorMessage);
    }
  }
}

class UnknownCommandHandler extends CommandHandler {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && !dispatcher.handlers.some(
      (h: any) => h instanceof CommandHandler && h !== this && h.check(event, dispatcher)
    );
  }

  public handle(event: any, dispatcher: any): void {
    super.handle(event, dispatcher);
    throw new StopDispatching();
  }
}

class BotButtonCommandHandler extends HandlerBase {
  public check(event: any, dispatcher: any): boolean {
    return super.check(event, dispatcher) && event.type === EventType.CALLBACK_QUERY;
  }
}

export {
  HandlerBase,
  DefaultHandler,
  NewChatMembersHandler,
  LeftChatMembersHandler,
  PinnedMessageHandler,
  UnPinnedMessageHandler,
  MessageHandler,
  EditedMessageHandler,
  DeletedMessageHandler,
  CommandHandler,
  HelpCommandHandler,
  StartCommandHandler,
  FeedbackCommandHandler,
  UnknownCommandHandler,
  BotButtonCommandHandler
};
