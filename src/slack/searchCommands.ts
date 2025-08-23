import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { BedrockService } from '../aws/bedrockService';

export const handleSearchCommand = async ({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
  await ack();

  try {
    const searchQuery = command.text?.trim();
    
    if (!searchQuery) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ 검색어를 입력해주세요.\n\n사용법: `/search <검색어>`',
      });
      return;
    }

    // 임시 응답으로 검색 중임을 알림
    await respond({
      response_type: 'ephemeral',
      text: `🔍 "${searchQuery}"를 검색하고 있습니다...`,
    });

    const bedrockService = new BedrockService();
    
    // RAG 검색 실행
    const searchResult = await bedrockService.searchPreviousSummaries(searchQuery);

    if (!searchResult) {
      await respond({
        response_type: 'ephemeral',
        text: `❌ 검색 기능을 사용할 수 없습니다.\n\n지식 베이스가 설정되지 않았거나 오류가 발생했습니다.`,
      });
      return;
    }

    if (!searchResult.answer) {
      await respond({
        response_type: 'ephemeral',
        text: `🔍 "${searchQuery}"에 대한 검색 결과가 없습니다.\n\n다른 검색어로 다시 시도해보세요.`,
      });
      return;
    }

    // 검색 결과 포맷팅
    let responseText = `🔍 **검색 결과: "${searchQuery}"**\n\n`;
    responseText += `📝 **답변:**\n${searchResult.answer}\n\n`;

    if (searchResult.sources && searchResult.sources.length > 0) {
      responseText += `📚 **참고 자료 (${searchResult.sources.length}개):**\n`;
      
      searchResult.sources.forEach((source, index) => {
        if (source.content) {
          const snippet = source.content.length > 200 
            ? source.content.substring(0, 200) + '...'
            : source.content;
          
          responseText += `${index + 1}. ${snippet}`;
          
          if (source.location) {
            responseText += `\n   📍 위치: ${source.location}`;
          }
          
          if (source.score !== undefined) {
            responseText += `\n   🎯 관련도: ${Math.round(source.score * 100)}%`;
          }
          
          responseText += '\n\n';
        }
      });
    }

    // 응답이 너무 길면 잘라내기
    if (responseText.length > 3000) {
      responseText = responseText.substring(0, 2900) + '\n\n...(내용이 잘렸습니다)';
    }

    await respond({
      response_type: 'ephemeral',
      text: responseText,
    });

  } catch (error) {
    console.error('검색 명령 처리 실패:', error);
    
    await respond({
      response_type: 'ephemeral',
      text: `❌ 검색 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
};

export const handleChatCommand = async ({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
  await ack();

  try {
    const chatMessage = command.text?.trim();
    
    if (!chatMessage) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ 메시지를 입력해주세요.\n\n사용법: `/chat <메시지>`',
      });
      return;
    }

    // 임시 응답으로 처리 중임을 알림
    await respond({
      response_type: 'ephemeral',
      text: `💭 메시지를 처리하고 있습니다...`,
    });

    const bedrockService = new BedrockService();
    
    // AI 채팅 실행
    const aiResponse = await bedrockService.chat({
      message: chatMessage,
      systemPrompt: '당신은 슬랙 스레드 요약 봇의 AI 어시스턴트입니다. 사용자의 질문에 한국어로 친절하고 정확하게 답변해주세요. 슬랙 사용법, 요약 기능, 검색 기능에 대한 질문이라면 더욱 상세히 설명해주세요.',
      maxTokens: 2048,
      temperature: 0.7,
    });

    let responseText = `💬 **AI 채팅**\n\n`;
    responseText += `**질문:** ${chatMessage}\n\n`;
    responseText += `**답변:** ${aiResponse}`;

    // 응답이 너무 길면 잘라내기
    if (responseText.length > 3000) {
      responseText = responseText.substring(0, 2900) + '\n\n...(답변이 잘렸습니다)';
    }

    await respond({
      response_type: 'ephemeral',
      text: responseText,
    });

  } catch (error) {
    console.error('채팅 명령 처리 실패:', error);
    
    await respond({
      response_type: 'ephemeral',
      text: `❌ 채팅 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
};