import axios, { AxiosInstance } from 'axios';

class ChatClient {
  private httpClient: AxiosInstance;
  private apiBaseUrl: string;
  private token: string;

  constructor(apiBaseUrl: string, token: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.token = token;
    this.httpClient = axios.create({
      baseURL: apiBaseUrl,
    });
  }

  public async addChatMembers(chatId: string, members: string[]): Promise<any> {
    const memberData = members.map(m => ({ sn: m }));
    const response = await this.httpClient.get('/chats/members/add', {
      params: {
        token: this.token,
        chatId: chatId,
        members: JSON.stringify(memberData),
      }
    });
    return response.data;
  }

  public async createChat(
    name: string,
    about: string = "",
    rules: string = "",
    members: string[] = [],
    isPublic: boolean = false,
    joinModeration: boolean = false,
    defaultRole: string = "member"
  ): Promise<any> {
    const memberData = members.map(m => ({ sn: m }));
    const response = await this.httpClient.get('/chats/createChat', {
      params: {
        token: this.token,
        name: name,
        about: about,
        rules: rules,
        members: JSON.stringify(memberData),
        public: isPublic ? "true" : "false",
        defaultRole: defaultRole,
        joinModeration: joinModeration ? "true" : "false",
      }
    });
    return response.data;
  }
}

// Usage example:
// const chatClient = new ChatClient('https://api.example.com', 'your-api-token');
// chatClient.addChatMembers('chat123', ['member1', 'member2']);
// chatClient.createChat('New Chat', 'About this chat', 'Chat rules', ['member1'], true);
