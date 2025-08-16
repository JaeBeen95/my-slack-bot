import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';

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
      text: '📝 스레드 내에서 이 명령어를 사용해주세요! 스레드 안에서 `/요약`을 입력하시면 해당 스레드의 대화를 요약해드립니다.',
    });
    return;
  }

  // 기본 응답 (추후 실제 요약 기능으로 교체 예정)
  await respond({
    response_type: 'in_channel',
    text: `📝 <@${user_id}>님이 요청하신 스레드 요약을 준비 중입니다...\n\n✨ 곧 AI가 이 대화를 요약해드릴 예정입니다!`,
  });
};
