# 슬랙 봇 프로젝트

TypeScript와 Node.js로 만든 슬랙 봇입니다.

## 🔧 기술 상세

### dotenv

```typescript
import dotenv from 'dotenv';
dotenv.config();
```

- **역할**: `.env` 파일의 환경변수를 `process.env`로 로드
- **실행 결과**: `.env`의 `KEY=VALUE` 형태를 `process.env.KEY`로 접근 가능하게 함
- **예시**: `.env`에 `SLACK_BOT_TOKEN=xoxb-123`이 있으면 → `process.env.SLACK_BOT_TOKEN`으로 사용

### Slack 토큰 종류

```typescript
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN; // xoxb-로 시작
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET; // 해시 문자열
```

- **SLACK_BOT_TOKEN**: 봇이 Slack API를 호출할 때 사용하는 인증 토큰
- **SLACK_SIGNING_SECRET**: 슬랙에서 온 요청이 진짜인지 검증하는 비밀키

### Slack Bolt App 인스턴스

```typescript
const app = new App({
  token: SLACK_BOT_TOKEN, // 봇 토큰
  signingSecret: SLACK_SIGNING_SECRET, // 서명 검증 키
  // 추가 옵션들:
  // socketMode: true,              // WebSocket 모드
  // appToken: SLACK_APP_TOKEN,     // 앱 레벨 토큰 (Socket Mode용)
  // port: 3000                     // 서버 포트
});
```

**반환되는 인스턴스의 주요 메서드**:

- `app.command(pattern, handler)`: 슬래시 커맨드 등록
- `app.message(pattern, handler)`: 메시지 이벤트 리스너
- `app.action(actionId, handler)`: 버튼/선택 액션 리스너
- `app.start(port)`: 서버 시작 (Promise 반환)

### 슬래시 커맨드 핸들러

```typescript
app.command('/요약', async ({ command, ack, respond }) => {
  // 핸들러 로직
});
```

**핸들러에 전달되는 객체 구조**:

```typescript
{
  command: {
    token: string,           // 검증 토큰
    team_id: string,         // 워크스페이스 ID
    team_domain: string,     // 워크스페이스 도메인
    channel_id: string,      // 채널 ID
    channel_name: string,    // 채널 이름
    user_id: string,         // 사용자 ID
    user_name: string,       // 사용자명
    command: string,         // 실행된 커맨드 ('/요약')
    text: string,           // 커맨드 뒤의 추가 텍스트
    response_url: string,   // 지연 응답용 URL
    trigger_id: string,     // 모달 열기용 ID
    thread_ts?: string      // 스레드 타임스탬프 (스레드에서만 존재)
  },
  ack: AckFn,           // 즉시 응답 함수
  respond: RespondFn,       // 메시지 응답 함수
  client: WebClient,       // Slack Web API 클라이언트
  context: Context     // 추가 컨텍스트 정보
}
```

### ack() 함수

```typescript
await ack(); // 기본 응답 (빈 응답)
await ack('간단한 텍스트 응답');
await ack({
  text: '응답 메시지',
  response_type: 'ephemeral', // 또는 'in_channel'
});
```

- **역할**: 슬랙에게 "커맨드 받았어요" 신호를 3초 내에 보내야 함
- **없으면**: 사용자에게 "커맨드 실행 실패" 에러 표시

### respond() 함수

```typescript
await respond({
  text: string,                    // 메시지 텍스트 (필수)
  response_type?: 'in_channel' | 'ephemeral', // 공개/비공개 (기본: ephemeral)
  blocks?: Block[],                // Block Kit UI 요소들
  attachments?: Attachment[],      // 레거시 첨부파일
  thread_ts?: string,             // 스레드 응답시 사용
  replace_original?: boolean,      // 원본 메시지 대체 여부
  delete_original?: boolean        // 원본 메시지 삭제 여부
});
```

**response_type 옵션**:

- `ephemeral`: 커맨드 실행한 사용자에게만 보임 (기본값)
- `in_channel`: 해당 채널의 모든 사람이 볼 수 있음

**Block Kit 예시**:

```typescript
await respond({
  text: '대체 텍스트',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*굵은 글씨* 와 _기울임_ 지원',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '버튼' },
          action_id: 'button_click',
        },
      ],
    },
  ],
});
```

## 📋 현재 구현 상태

- ✅ 기본 Slack Bolt 앱 설정
- ✅ `/요약` 슬래시 커맨드 등록
- ✅ 스레드 감지 로직 (`thread_ts` 존재 여부 확인)
- ✅ 한국어 에러 메시지
- ⏳ 슬랙 앱 생성 및 토큰 설정 (다음 단계)
- ⏳ 실제 요약 기능 구현
