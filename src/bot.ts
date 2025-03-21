import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Format, InlineKeyboardMarkup} from './types';
import * as cgi from 'querystring';
import * as logging from 'logging'; // Подключение библиотеки логирования
import {EventType} from "./event";
import {EventEmitter} from 'node:events';
import Lock from 'async-lock';
import {setTimeout} from 'timers/promises';
import {MessageHandler} from "./handler";
import {Dispatcher} from "./dispatcher";
import {Filter} from './filter';

interface BotOptions {
    token: string;
    apiUrlBase?: string;
    name?: string;
    version?: string;
    timeoutS?: number;
    pollTimeS?: number;
    isMyTeam?: boolean;
}

interface IBot {
    token: string;
    apiBaseUrl: string;
    name?: string;
    version?: string;
    timeoutS: number;
    pollTimeS: number;
    isMyTeam: boolean;
    dispatcher: Dispatcher;
    running: boolean;
    lastEventId: number;
    httpSession: AxiosInstance;

    _start_polling(): Promise<void>;
    start_polling(): void;
    stop(): void;
    _signal_handler(signal: any): void;
    idle(): void;
    events_get(): Promise<any>;
    self_get(): Promise<any>;
    default_handler(event: Event): void;
    new_member_handler(event: Event): void;
    member_left_chat_handler(event: Event): void;
    pin_handler(event: Event): void;
    unpin_handler(event: Event): void;
    message_handler(event: Event): void;
    edit_msg_handler(event: Event): void;
    delete_msg_handler(event: Event): void;
    command_handler(event: Event): void;
    help_handler(event: Event): void;
    start_handler(event: Event): void;
    unknown_cmd_handler(event: Event): void;
    button_handler(event: Event): void;
    sendRequest(endpoint: string, params: any): Promise<any>;
    send_text(chatId: string, text: string, options: any): Promise<any>;
    send_file(chatId: string, file: File, options: any): Promise<any>;
    send_voice(chatId: string, voice: File, options: any): Promise<any>;
    edit_text(chatId: string, msgId: string, text: string): Promise<any>;
    delete_messages(chatId: string, msgId: string): Promise<any>;
    answer_callback_query(queryId: string, options: any): Promise<any>;
    send_actions(chatId: string, actions: string[]): Promise<any>;
    get_chat_info(chatId: string): Promise<any>;
    get_chat_admins(chatId: string): Promise<any>;
    get_chat_members(chatId: string, cursor: string): Promise<any>;
    get_chat_blocked_users(chatId: string): Promise<any>;
    get_chat_pending_users(chatId: string): Promise<any>;
    chat_block_user(chatId: string, userId: string): Promise<any>;
    chat_unblock_user(chatId: string, userId: string): Promise<any>;
    chat_resolve_pending(chatId: string, approve: boolean, userId: string): Promise<any>;
    set_chat_title(chatId: string, title: string): Promise<any>;
    set_chat_about(chatId: string, about: string): Promise<any>;
    set_chat_rules(chatId: string, rules: string): Promise<any>;
    get_file_info(fileId: string): Promise<any>;
    pin_message(chatId: string, msgId: string): Promise<any>;
    unpin_message(chatId: string, msgId: string): Promise<any>;
    delete_chat_members(chatId: string, userId: string): Promise<any>;
    addEventHandler(eventType: EventType, handler: Function, filters?: typeof Filter): void;
}

function keyboard_to_json(keyboardMarkup: InlineKeyboardMarkup | any[]): string {
    if (keyboardMarkup instanceof InlineKeyboardMarkup) {
        return keyboardMarkup.toJson(); // Assuming the method is named toJson
    } else if (Array.isArray(keyboardMarkup)) {
        return JSON.stringify(keyboardMarkup);
    } else {
        return keyboardMarkup;
    }
}

function format_to_json(format: Format | any[]): string {
    if (format instanceof Format) {
        return format.toJson(); // Assuming the method is named toJson
    } else if (Array.isArray(format)) {
        return JSON.stringify(format);
    } else {
        return format;
    }
}

interface BotOptions {
    token: string;
    apiUrlBase?: string;
    name?: string;
    version?: string;
    timeoutS?: number;
    pollTimeS?: number;
    isMyTeam?: boolean;
}

class Bot {
    private token: string;
    private apiBaseUrl: string;
    private name?: string;
    private version?: string;
    private timeoutS: number;
    private pollTimeS: number;
    private lastEventId: number;
    private isMyTeam: boolean;
    private running: boolean;
    private lock: Lock;
    private pollingThread: Promise<void> | null;
    private httpSession: AxiosInstance;
    public dispatcher: EventEmitter; // Placeholder for your dispatcher implementation

    constructor(options: BotOptions) {
        this.token = options.token;
        this.apiBaseUrl = options.apiUrlBase || 'https://api.icq.net/bot/v1';
        this.name = options.name;
        this.version = options.version;
        this.timeoutS = options.timeoutS || 20;
        this.pollTimeS = options.pollTimeS || 60;
        this.lastEventId = 0;
        this.isMyTeam = options.isMyTeam || false;
        this.running = false;
        this.lock = new Lock();
        this.pollingThread = null;
        this.httpSession = axios.create();
        this.dispatcher = new EventEmitter(); // Initialize your dispatcher here
    }

    private async _start_polling(): Promise<void> {
        while (this.running) {
            try {
                const response = await this.events_get();
                console.log('[Polling] Received server response')

                if (response.data?.description === 'Invalid token') {
                    throw new InvalidToken(response.data);
                }

                if (response.data?.events) {
                    console.log(`[Polling] Processing ${response.data.events.length} events`)
                    for (const event of response.data.events) {
                        console.log(`[Event] Type: ${event.type}, Payload: ${event.payload}`)
                        this.dispatcher.emit(event.type, event.payload); // Modify according to your event system
                    }
                }
            } catch (e) {
                if (e instanceof InvalidToken) {
                    console.error("InvalidToken:", e);
                    await setTimeout(5000);
                } else {
                    console.error("Exception while polling:", e);
                }
            }
        }
    }

    public async start_polling(): Promise<void> {
        await this.lock.acquire('start_polling', async () => {
            if (!this.running) {
                console.info("Starting polling.");
                this.running = true;
                this.pollingThread = this._start_polling();
            }
        });
    }

    public async stop(): Promise<void> {
        await this.lock.acquire('stop', async () => {
            if (this.running) {
                console.info("Stopping bot.");
                this.running = false;
                if (this.pollingThread) {
                    await this.pollingThread;
                }
            }
        });
    }

    private async _signal_handler(sig: number): Promise<void> {
        if (this.running) {
            console.debug(`Stopping bot by signal '${sig}'. Repeat for force exit.`);
            await this.stop();
        } else {
            console.warn("Force exiting.");
            process.exit(1);
        }
    }

    public async idle(): Promise<void> {
        process.on('SIGINT', () => this._signal_handler(2));
        process.on('SIGTERM', () => this._signal_handler(15));
        process.on('SIGABRT', () => this._signal_handler(6));

        while (this.running) {
            await setTimeout(1000);
        }
    }

    public async events_get(pollTimeS?: number, lastEventId?: number) {
        console.log('[Polling] Requesting new events')
        pollTimeS = pollTimeS || this.pollTimeS;
        lastEventId = lastEventId || this.lastEventId;

        const response = await this.httpSession.get(`${this.apiBaseUrl}/events/get`, {
            params: {
                token: this.token,
                pollTime: pollTimeS,
                lastEventId: lastEventId,
            },
            timeout: (pollTimeS + this.timeoutS) * 1000,
        });

        if (response.data?.events) {
            const {events} = response.data;
            if (events.length > 0) {
                this.lastEventId = Math.max(...events.map((e: {eventId: number}) => e.eventId));
            }
        }

        return response;
    }

    public async self_get() {
        return await this.httpSession.get(`${this.apiBaseUrl}/self/get`, {
            params: {
                token: this.token,
            },
            timeout: this.timeoutS * 1000,
        });
    }

    // Decorators for event handlers
    public default_handler(handler: Function) {
        this.dispatcher.on('default', handler);
    }

    public new_member_handler(handler: Function) {
        this.dispatcher.on('new_member', handler);
    }

    public member_left_chat_handler(handler: Function) {
        this.dispatcher.on('member_left', handler);
    }

    public pin_handler(handler: Function) {
        this.dispatcher.on('pin', handler);
    }

    public unpin_handler(handler: Function) {
        this.dispatcher.on('unpin', handler);
    }

    public message_handler(handler: Function) {
        console.log('[Handler] Registering new message handler')
        this.dispatcher.on('newMessage', (...args) => console.log('[Message] Received new message') || handler(...args));
    }

    public edit_msg_handler(handler: Function) {
        this.dispatcher.on('edit_message', handler);
    }

    public delete_msg_handler(handler: Function) {
        this.dispatcher.on('delete_message', handler);
    }

    public command_handler(command: string, handler: Function) {
        this.dispatcher.on(command, handler);
    }

    public help_handler(handler: Function) {
        this.dispatcher.on('help', handler);
    }

    public start_handler(handler: Function) {
        this.dispatcher.on('start', handler);
    }

    public unknown_cmd_handler(handler: Function) {
        this.dispatcher.on('unknown_command', handler);
    }

    public button_handler(handler: Function) {
        this.dispatcher.on('button', handler);
    }

    public async send_text(chatId: string, text: string, replyMsgId?: string, forwardChatId?: string, forwardMsgId?: string, inlineKeyboardMarkup?: any, parseMode?: string, format?: any) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/messages/sendText`, {
            params: {
                token: this.token,
                chatId,
                text,
                replyMsgId,
                forwardChatId,
                forwardMsgId,
                inlineKeyboardMarkup: keyboard_to_json(inlineKeyboardMarkup),
                parseMode,
                format: format_to_json(format),
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async send_file(chatId: string, fileId?: string, file?: any, caption?: string, replyMsgId?: string, forwardChatId?: string, forwardMsgId?: string, inlineKeyboardMarkup?: any, parseMode?: string, format?: any) {
        const formData = new FormData();
        formData.append('token', this.token);
        formData.append('chatId', chatId);
        if (fileId) formData.append('fileId', fileId);
        if (file) formData.append('file', file);
        if (caption) formData.append('caption', caption);
        if (replyMsgId) formData.append('replyMsgId', replyMsgId);
        if (forwardChatId) formData.append('forwardChatId', forwardChatId);
        if (forwardMsgId) formData.append('forwardMsgId', forwardMsgId);
        formData.append('inlineKeyboardMarkup', keyboard_to_json(inlineKeyboardMarkup));
        if (parseMode) formData.append('parseMode', parseMode);
        if (format) formData.append('format', format_to_json(format));

        const response = await this.httpSession.post(`${this.apiBaseUrl}/messages/sendFile`, formData, {
            timeout: this.timeoutS * 1000,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    }

    public async send_voice(chatId: string, fileId?: string, file?: any, replyMsgId?: string, forwardChatId?: string, forwardMsgId?: string) {
        const formData = new FormData();
        formData.append('token', this.token);
        formData.append('chatId', chatId);
        if (fileId) formData.append('fileId', fileId);
        if (file) formData.append('file', file);
        if (replyMsgId) formData.append('replyMsgId', replyMsgId);
        if (forwardChatId) formData.append('forwardChatId', forwardChatId);
        if (forwardMsgId) formData.append('forwardMsgId', forwardMsgId);

        const response = await this.httpSession.post(`${this.apiBaseUrl}/messages/sendVoice`, formData, {
            timeout: this.timeoutS * 1000,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response;
    }

    public async edit_text(chatId: string, msgId: string, text: string, inlineKeyboardMarkup?: any, parseMode?: string, format?: any) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/messages/editText`, {
            params: {
                token: this.token,
                chatId,
                msgId,
                text,
                inlineKeyboardMarkup: keyboard_to_json(inlineKeyboardMarkup),
                parseMode,
                format: format_to_json(format),
            },
            timeout: this.timeoutS            * 1000,
        });
        return response;
    }

    public async delete_messages(chatId: string, msgIds: string[]) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/messages/delete`, {
            token: this.token,
            chatId,
            msgIds,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async answer_callback_query(callbackQueryId: string, text?: string, showAlert?: boolean) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/callback/answer`, {
            token: this.token,
            callbackQueryId,
            text,
            showAlert,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async send_actions(chatId: string, action: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/actions/send`, {
            token: this.token,
            chatId,
            action,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_chat_info(chatId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/chats/getInfo`, {
            params: {
                token: this.token,
                chatId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_chat_admins(chatId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/chats/getAdmins`, {
            params: {
                token: this.token,
                chatId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_chat_members(chatId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/chats/getMembers`, {
            params: {
                token: this.token,
                chatId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_chat_blocked_users(chatId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/chats/getBlockedUsers`, {
            params: {
                token: this.token,
                chatId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_chat_pending_users(chatId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/chats/getPendingUsers`, {
            params: {
                token: this.token,
                chatId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async chat_block_user(chatId: string, userId: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/blockUser`, {
            token: this.token,
            chatId,
            userId,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async chat_unblock_user(chatId: string, userId: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/unblockUser`, {
            token: this.token,
            chatId,
            userId,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async chat_resolve_pending(chatId: string, userId: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/resolvePending`, {
            token: this.token,
            chatId,
            userId,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async set_chat_title(chatId: string, title: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/setTitle`, {
            token: this.token,
            chatId,
            title,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async set_chat_about(chatId: string, about: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/setAbout`, {
            token: this.token,
            chatId,
            about,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async set_chat_rules(chatId: string, rules: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/setRules`, {
            token: this.token,
            chatId,
            rules,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async get_file_info(fileId: string) {
        const response = await this.httpSession.get(`${this.apiBaseUrl}/files/getInfo`, {
            params: {
                token: this.token,
                fileId,
            },
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async pin_message(chatId: string, msgId: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/messages/pin`, {
            token: this.token,
            chatId,
            msgId,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async unpin_message(chatId: string, msgId: string) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/messages/unpin`, {
            token: this.token,
            chatId,
            msgId,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }

    public async delete_chat_members(chatId: string, userIds: string[]) {
        const response = await this.httpSession.post(`${this.apiBaseUrl}/chats/deleteMembers`, {
            token: this.token,
            chatId,
            userIds,
        }, {
            timeout: this.timeoutS * 1000,
        });
        return response;
    }
}

// Регулярное выражение для определения MIME-типа
const LOG_MIME_TYPE_REGEXP = /^(?:text(?:\/.+)?|application\/(?:json|javascript|xml|x-www-form-urlencoded))$/i;

class LoggingHTTPAdapter {
    private log: logging.Logger;

    constructor() {
        this.log = logging.getLogger('LoggingHTTPAdapter');
    }

    private static isLoggable(headers: any): boolean {
        const contentType = headers['Content-Type'] || '';
        return LOG_MIME_TYPE_REGEXP.test(cgi.parse(contentType)[0]);
    }

    private static headersToString(headers: Record<string, string>): string {
        return Object.entries(headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
    }

    private static bodyToString(body: any): string {
        return typeof body === 'string' ? body : body instanceof Buffer ? body.toString('utf-8') : '[binary data]';
    }

    async send(config: AxiosRequestConfig): Promise<AxiosResponse> {
        if (this.log.level === 'debug') {
            const { method, url, headers, data } = config;
            this.log.debug(`${method?.toUpperCase()} ${url}\n${LoggingHTTPAdapter.headersToString(headers || {})}`);
            const bodyLog = data && LoggingHTTPAdapter.isLoggable(headers) ? `\n\n${LoggingHTTPAdapter.bodyToString(data)}` : '[binary data]';
            this.log.debug(bodyLog);
        }

        const response = await axios(config);

        if (this.log.level === 'debug') {
            const { status, statusText, headers, data } = response;
            this.log.debug(`${status} ${statusText}\n${LoggingHTTPAdapter.headersToString(headers)}`);
            const responseBodyLog = data && LoggingHTTPAdapter.isLoggable(headers) ? `\n\n${data}` : '[binary data]';
            this.log.debug(responseBodyLog);
        }

        return response;
    }
}

class BotLoggingHTTPAdapter extends LoggingHTTPAdapter {
    private bot: any;

    constructor(bot: any) {
        super();
        this.bot = bot;
    }

    override async send(config: AxiosRequestConfig): Promise<AxiosResponse> {
        config.headers = {
            ...config.headers,
            'User-Agent': this.bot.userAgent
        };
        return await super.send(config);
    }
}

// Исключение для случая, если файл не найден
class FileNotFoundException extends Error {
    constructor(message: string = 'File not found') {
        super(message);
        this.name = 'FileNotFoundException';
    }
}

// Обработчик для предотвращения дублирования сообщений
class SkipDuplicateMessageHandler extends MessageHandler {
    private cache: Map<string, string>;

    constructor(cache: Map<string, string>) {
        super({ filters: Filter.message });
        this.cache = cache;
    }

    override check(event: Event, dispatcher: Dispatcher): boolean {
        if (super.check(event, dispatcher)) {
            const { msgId, text } = event.data;
            if (this.cache.get(msgId) === text) {
                throw new Error('StopDispatching');
            }
            return true;
        }
        return false;
    }
}

// Исключение для случая, если токен недействителен
class InvalidToken extends Error {
    constructor(message: string = 'Invalid token') {
        super(message);
        this.name = 'InvalidToken';
    }
}

export { LoggingHTTPAdapter, BotLoggingHTTPAdapter, FileNotFoundException, SkipDuplicateMessageHandler, InvalidToken };

export default Bot;

