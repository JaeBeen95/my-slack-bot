export interface ThreadMessage {
  user: string;
  username: string;
  text: string;
  timestamp: string;
  formattedTime: string;
}

export interface ThreadMessages {
  channelId: string;
  threadTs: string;
  messageCount: number;
  messages: ThreadMessage[];
  participants: string[];
}

export interface GetThreadMessagesParams {
  channelId: string;
  threadTs: string;
  botUserId?: string;
}

interface SlackUser {
  real_name?: string;
  profile?: {
    display_name?: string;
  };
}

// 필요한 클라이언트 메서드만 정의
interface SlackClient {
  conversations: {
    replies: (params: { channel: string; ts: string; inclusive?: boolean }) => Promise<{
      messages?: Array<{
        user?: string;
        text?: string;
        ts?: string;
        subtype?: string;
      }>;
    }>;
  };
  users: {
    info: (params: { user: string }) => Promise<{
      user?: SlackUser;
    }>;
  };
}

export class SlackMessageService {
  private client: SlackClient;
  private userCache = new Map<string, SlackUser | null>();

  constructor(client: SlackClient) {
    this.client = client;
  }

  /**
   * 스레드의 모든 메시지를 가져와서 요약 가능한 형태로 변환
   */
  async getThreadMessages(params: GetThreadMessagesParams): Promise<ThreadMessages> {
    const { channelId, threadTs, botUserId } = params;
    try {
      // 스레드의 모든 메시지 가져오기
      const threadResponse = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        inclusive: true, // 스레드 시작 메시지도 포함
      });

      if (!threadResponse.messages) {
        throw new Error('스레드 메시지를 가져올 수 없습니다.');
      }

      const messages: ThreadMessage[] = [];
      const participants = new Set<string>();

      for (const message of threadResponse.messages) {
        if (!message.user || !message.text || message.subtype) {
          continue; // 봇 메시지나 시스템 메시지 제외
        }

        // 봇이 보낸 메시지 제외
        if (botUserId && message.user === botUserId) {
          continue;
        }

        // 사용자 정보 가져오기
        const userInfo = await this.getUserInfo(message.user);
        const username = userInfo?.real_name || userInfo?.profile?.display_name || message.user;

        // 타임스탬프를 읽기 쉬운 형태로 변환
        const timestamp = message.ts || '';
        const formattedTime = this.formatTimestamp(timestamp);

        messages.push({
          user: message.user,
          username,
          text: message.text,
          timestamp,
          formattedTime,
        });

        participants.add(username);
      }

      return {
        channelId,
        threadTs,
        messageCount: messages.length,
        messages,
        participants: Array.from(participants),
      };
    } catch (error) {
      console.error('스레드 메시지 수집 실패:', error);
      throw new Error('스레드 메시지를 수집하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 사용자 정보 가져오기
   */
  private async getUserInfo(userId: string) {
    // 캐시에서 먼저 확인
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const userResponse = await this.client.users.info({ user: userId });
      const userData = userResponse.user || null;

      // 캐시에 저장
      this.userCache.set(userId, userData);
      return userData;
    } catch (error) {
      console.warn(`사용자 정보 조회 실패 (${userId}):`, error);
      return null;
    }
  }

  /**
   * 타임스탬프를 읽기 쉬운 형태로 변환
   */
  private formatTimestamp(timestamp: string): string {
    const date = new Date(parseFloat(timestamp) * 1000);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 메시지들을 요약을 위한 텍스트 형태로 변환
   */
  formatMessagesForSummary(threadMessages: ThreadMessages): string {
    const { messages, participants } = threadMessages;

    let formattedText = `스레드 요약 요청\n`;
    formattedText += `참여자: ${participants.join(', ')}\n`;
    formattedText += `메시지 수: ${messages.length}개\n\n`;
    formattedText += `대화 내용:\n`;

    for (const message of messages) {
      formattedText += `[${message.formattedTime}] ${message.username}: ${message.text}\n`;
    }

    return formattedText;
  }
}
