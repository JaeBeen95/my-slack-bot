import { ThreadMessages } from '../slack/messageService';

export interface MarkdownGeneratorParams {
  threadMessages: ThreadMessages;
  aiSummary: string;
  channelName?: string | undefined;
  requestedBy: string;
  requestedAt: Date;
}

export class MarkdownGenerator {
  /**
   * 스레드 요약을 마크다운 형식으로 생성
   */
  generateSummaryMarkdown(params: MarkdownGeneratorParams): string {
    const { threadMessages, aiSummary, channelName, requestedBy, requestedAt } = params;
    const { channelId, threadTs, messageCount, messages, participants } = threadMessages;

    const channelDisplay = channelName ? `#${channelName}` : channelId;
    const formattedDate = requestedAt.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul'
    });

    let markdown = '';

    // 헤더
    markdown += `# 스레드 요약\n\n`;

    // 메타데이터
    markdown += `## 📋 요약 정보\n\n`;
    markdown += `- **채널**: ${channelDisplay}\n`;
    markdown += `- **스레드 타임스탬프**: ${threadTs}\n`;
    markdown += `- **참여자**: ${participants.join(', ')}\n`;
    markdown += `- **메시지 수**: ${messageCount}개\n`;
    markdown += `- **요약 요청자**: ${requestedBy}\n`;
    markdown += `- **요약 생성 시각**: ${formattedDate}\n\n`;

    // AI 요약
    markdown += `## 🤖 AI 요약\n\n`;
    markdown += `${aiSummary}\n\n`;

    // 원본 대화
    markdown += `## 💬 원본 대화\n\n`;
    
    messages.forEach((message, index) => {
      markdown += `### ${index + 1}. ${message.username} (${message.formattedTime})\n\n`;
      markdown += `${this.formatMessageText(message.text)}\n\n`;
    });

    // 푸터
    markdown += `---\n\n`;
    markdown += `*이 요약은 AI에 의해 자동 생성되었으며, 실제 대화 내용과 다를 수 있습니다.*\n`;
    markdown += `*생성 시각: ${formattedDate}*\n`;

    return markdown;
  }

  /**
   * 메시지 텍스트를 마크다운에 적합하게 포맷팅
   */
  private formatMessageText(text: string): string {
    // 슬랙 멘션을 일반 텍스트로 변환
    let formatted = text.replace(/<@([A-Z0-9]+)>/g, '@사용자');
    
    // 슬랙 채널 링크를 일반 텍스트로 변환
    formatted = formatted.replace(/<#([A-Z0-9]+)\|([^>]+)>/g, '#$2');
    
    // 슬랙 URL을 마크다운 링크로 변환
    formatted = formatted.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '[$2]($1)');
    formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, '$1');
    
    // 코드 블록 보존
    formatted = formatted.replace(/```([^`]*)```/g, '```\n$1\n```');
    
    // 인라인 코드 보존
    formatted = formatted.replace(/`([^`]+)`/g, '`$1`');
    
    // 줄바꿈 보존
    formatted = formatted.replace(/\n/g, '\n');
    
    return formatted;
  }

  /**
   * 파일명용 제목 생성
   */
  generateFileName(channelId: string, threadTs: string, participants: string[]): string {
    const timestamp = threadTs.replace('.', '_');
    const participantStr = participants.length > 3 
      ? `${participants.slice(0, 3).join('_')}_외${participants.length - 3}명`
      : participants.join('_');
    
    return `${channelId}_${timestamp}_${participantStr}`;
  }

  /**
   * S3 메타데이터 생성
   */
  generateS3Metadata(params: MarkdownGeneratorParams): Record<string, string> {
    const { threadMessages, requestedBy, requestedAt } = params;
    const { channelId, threadTs, messageCount, participants } = threadMessages;

    return {
      channelId,
      threadTimestamp: threadTs,
      participantCount: participants.length.toString(),
      messageCount: messageCount.toString(),
      participants: participants.join(','),
      requestedBy,
      requestedAt: requestedAt.toISOString(),
    };
  }
}