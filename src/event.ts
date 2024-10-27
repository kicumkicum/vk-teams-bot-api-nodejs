enum EventType {
  NEW_MESSAGE = 'newMessage',
  EDITED_MESSAGE = 'editedMessage',
  DELETED_MESSAGE = 'deletedMessage',
  PINNED_MESSAGE = 'pinnedMessage',
  UNPINNED_MESSAGE = 'unpinnedMessage',
  NEW_CHAT_MEMBERS = 'newChatMembers',
  LEFT_CHAT_MEMBERS = 'leftChatMembers',
  CHANGED_CHAT_INFO = 'changedChatInfo',
  CALLBACK_QUERY = 'callbackQuery',
}

interface ChatData {
  chatId: string;
  type: string;
}

interface MessageData {
  msgId?: string;
  text?: string;
  format?: string;
  chat: ChatData;
  from?: Record<string, any>;
}

interface CallbackQueryData {
  message: MessageData;
  callbackData: string;
  queryId: string;
}

type EventData = MessageData | CallbackQueryData;

class Event {
  public type: EventType;
  public data: EventData;
  public msgId?: string;
  public text?: string;
  public format?: string;
  public from_chat?: string;
  public chat_type?: string;
  public message_author?: string;
  public callback_query?: string;
  public queryId?: string;

  constructor(type: EventType, data: EventData) {
    this.type = type;
    this.data = data;

    if (type === EventType.NEW_MESSAGE && 'chat' in data) {
      this.msgId = data.msgId;
      this.text = data.text;
      this.format = data.format;
      this.from_chat = data.chat.chatId;
      this.chat_type = data.chat.type;
      this.message_author = data.from?.id || '';

    } else if (type === EventType.CALLBACK_QUERY && 'message' in data) {
      this.msgId = data.message.msgId;
      this.callback_query = data.callbackData;
      this.from_chat = data.message.chat.chatId;
      this.chat_type = data.message.chat.type;
      this.queryId = data.queryId;
      const queryIdParts = data.queryId.split(':');
      this.message_author = queryIdParts.length > 1 ? queryIdParts[1] : '';
    }
  }

  toString(): string {
    return `Event(type='${this.type}', data=${JSON.stringify(this.data)})`;
  }
}

export { EventType, Event, EventData };
