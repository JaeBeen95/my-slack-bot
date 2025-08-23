import type { AllMiddlewareArgs, SlackShortcutMiddlewareArgs, MessageShortcut } from '@slack/bolt';
import { SlackMessageService } from './messageService';

export const handleThreadSummaryAction = async ({
  ack,
  respond,
  client,
  context,
  shortcut,
}: SlackShortcutMiddlewareArgs & AllMiddlewareArgs) => {
  await ack();

  try {
    // Message Shortcut 타입 가드
    if (shortcut.type !== 'message_action') {
      console.error(`예상과 다른 shortcut 타입: ${shortcut.type}, 예상: message_action`);
      return;
    }

    // Message Shortcut에서 메시지 정보 추출
    const { message, channel } = shortcut as MessageShortcut;

    if (!message?.ts || !channel?.id) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ 메시지 정보를 가져올 수 없습니다.',
      });
      return;
    }

    // 메시지 수집 서비스 생성
    const messageService = new SlackMessageService(client);

    // 봇 사용자 ID 확인
    const botUserId = context.botUserId || context.botUser?.id;

    // 해당 메시지에 달린 스레드 메시지 수집 (메시지 자체도 포함)
    const threadMessages = await messageService.getThreadMessages({
      channelId: channel.id,
      threadTs: message.ts,
      botUserId
    });

    // 스레드가 없는 경우 (답글이 0개)
    if (threadMessages.messageCount <= 0) {
      await respond({
        response_type: 'ephemeral',
        text: '📝 이 메시지에는 스레드 답글이 없습니다.\n\n스레드가 있는 메시지에서 시도해주세요.',
      });
      return;
    }

    // 수집된 메시지 정보 (임시 - 추후 AI 요약으로 교체)
    const formattedMessages = messageService.formatMessagesForSummary(threadMessages);

    // TODO: 여기에 AI 요약 로직 추가

    // DM 채널 열기
    const dmResponse = await client.conversations.open({
      users: shortcut.user.id,
    });

    if (!dmResponse.channel?.id) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ DM 채널을 열 수 없습니다.',
      });
      return;
    }

    // DM으로 요약 결과 전송 (현재는 임시 데이터)
    try {
      await client.chat.postMessage({
        channel: dmResponse.channel.id,
        text: `📋 **스레드 요약 완료**\n\n📊 **수집 정보:**\n• 참여자: ${threadMessages.participants.join(', ')}\n• 메시지 수: ${threadMessages.messageCount}개\n\n💭 곧 AI가 실제 요약을 제공할 예정입니다!`,
      });
    } catch (error) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ DM 전송에 실패했습니다. 다시 시도해주세요.',
      });
      return;
    }

    // 개발용: 콘솔에 수집된 메시지 출력
    console.log('📝 수집된 스레드 메시지:');
    console.log(formattedMessages);
  } catch (error) {
    console.error('스레드 요약 실패:', error);
    await respond({
      response_type: 'ephemeral',
      text: `❌ 스레드 요약 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    });
  }
};
