import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { handleSummaryCommand } from './slack/commands';

dotenv.config();

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const PORT = process.env.PORT || 3000;

if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET) {
  console.error('❌ SLACK_BOT_TOKEN과 SLACK_SIGNING_SECRET이 필요합니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

// 슬래시 커맨드 등록
app.command('/요약', handleSummaryCommand);

// 앱 시작
(async () => {
  try {
    await app.start(PORT);
    console.log('⚡️ 슬랙 봇이 실행되었습니다!');
    console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중입니다.`);
  } catch (error) {
    console.error('❌ 앱 시작에 실패했습니다:', error);
    process.exit(1);
  }
})();
