import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { handleSummaryCommand, handleMentionSummary } from './slack/commands';

dotenv.config();

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_SOCKET_TOKEN = process.env.SLACK_SOCKET_TOKEN;
const PORT = process.env.PORT || 3000;

if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET) {
  console.error('❌ SLACK_BOT_TOKEN과 SLACK_SIGNING_SECRET이 필요합니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

// Socket Mode 사용 여부 확인
const isSocketModeEnabled = !!SLACK_SOCKET_TOKEN;

if (isSocketModeEnabled) {
  console.log('🔌 Socket Mode로 실행합니다.');
  if (!SLACK_SOCKET_TOKEN) {
    console.error('❌ Socket Mode를 사용하려면 SLACK_SOCKET_TOKEN이 필요합니다.');
    process.exit(1);
  }
} else {
  console.log('🌐 HTTP Mode로 실행합니다.');
}

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode: isSocketModeEnabled,
  ...(isSocketModeEnabled && { appToken: SLACK_SOCKET_TOKEN }),
});


// 슬래시 커맨드 등록
app.command('/요약', handleSummaryCommand);

// 멘션 이벤트 리스너 (스레드에서 봇 멘션 + "요약" 키워드 감지)
app.event('app_mention', handleMentionSummary);

// 앱 시작
(async () => {
  try {
    if (isSocketModeEnabled) {
      // Socket Mode: 포트 없이 WebSocket 연결
      await app.start();
      console.log('⚡️ 슬랙 봇이 실행되었습니다!');
      console.log('🔌 슬랙과 WebSocket으로 연결되었습니다.');
    } else {
      // HTTP Mode: 지정된 포트에서 HTTP 서버 실행
      await app.start(PORT);
      console.log('⚡️ 슬랙 봇이 실행되었습니다!');
      console.log(`🚀 HTTP 서버가 ${PORT}번 포트에서 실행 중입니다.`);
    }
  } catch (error) {
    console.error('❌ 앱 시작에 실패했습니다:', error);
    process.exit(1);
  }
})();
