import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

export const handleMentionSummary = async ({ event, say }: SlackEventMiddlewareArgs<'app_mention'>) => {
  // 스레드에서만 동작하도록 제한
  if (!event.thread_ts) {
    return; // 스레드가 아니면 무시
  }

  // "요약" 키워드가 포함된 경우에만 동작
  if (event.text?.replace(/<@[^>]+>\s*/, '').trim() === '요약') {
    await say({
      thread_ts: event.thread_ts,
      text: `📝 <@${event.user}>님이 요청하신 스레드 요약을 준비 중입니다...\n\n✨ 곧 AI가 이 대화를 요약해드릴 예정입니다!`,
    });
  }
};

export const handleSummaryCommand = async ({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs) => {
  await ack();

  const { user_id, thread_ts } = command;

  // 스레드가 아닌 경우 안내 메시지
  if (!thread_ts) {
    await respond({
      response_type: 'ephemeral',
      text: '📝 이 기능은 스레드를 요약합니다.\n\n스레드에서 `@my-chatbot 요약`으로 사용해주세요.',
    });
    return;
  }

  // 기본 응답 (추후 실제 요약 기능으로 교체 예정)
  await respond({
    response_type: 'in_channel',
    text: `📝 <@${user_id}>님이 요청하신 스레드 요약을 준비 중입니다...\n\n✨ 곧 AI가 이 대화를 요약해드릴 예정입니다!`,
  });
};
