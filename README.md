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
const SLACK_SOCKET_TOKEN = process.env.SLACK_SOCKET_TOKEN; // xapp-로 시작 (Socket Mode용)
```

- **SLACK_BOT_TOKEN**: 봇이 Slack API를 호출할 때 사용하는 인증 토큰
- **SLACK_SIGNING_SECRET**: 슬랙에서 온 요청이 진짜인지 검증하는 비밀키
- **SLACK_SOCKET_TOKEN**: Socket Mode를 위한 앱 레벨 토큰 (WebSocket 연결용)

### Slack Bolt App 인스턴스

```typescript
const app = new App({
  token: SLACK_BOT_TOKEN, // 봇 토큰
  signingSecret: SLACK_SIGNING_SECRET, // 서명 검증 키
  socketMode: isSocketModeEnabled, // Socket Mode 활성화 여부
  ...(isSocketModeEnabled && { appToken: SLACK_SOCKET_TOKEN }), // Socket Mode시 앱 토큰 추가
});
```

**모드별 실행 방식**:

- **Socket Mode** (`SLACK_SOCKET_TOKEN` 존재시): WebSocket으로 실시간 연결
- **HTTP Mode** (`SLACK_SOCKET_TOKEN` 없을시): HTTP 서버로 웹훅 수신

**반환되는 인스턴스의 주요 메서드**:

- `app.command(pattern, handler)`: 슬래시 커맨드 등록
- `app.event(eventType, handler)`: 이벤트 리스너 등록 (멘션, 메시지 등)
- `app.message(pattern, handler)`: 메시지 이벤트 리스너
- `app.action(actionId, handler)`: 버튼/선택 액션 리스너
- `app.start()`: Socket Mode 시작 (포트 없음)
- `app.start(port)`: HTTP Mode 서버 시작 (Promise 반환)

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

### 멘션 이벤트 핸들러

```typescript
app.event('app_mention', async ({ event, say }) => {
  // 핸들러 로직
});
```

**핸들러에 전달되는 객체 구조**:

```typescript
{
  event: {
    type: 'app_mention',         // 이벤트 타입
    user: string,                // 멘션한 사용자 ID
    text: string,                // 메시지 텍스트 (봇 멘션 포함)
    ts: string,                  // 메시지 타임스탬프
    channel: string,             // 채널 ID
    thread_ts?: string,          // 스레드 타임스탬프 (스레드에서만 존재)
    team: string,                // 워크스페이스 ID
  },
  say: SayFn,                    // 메시지 응답 함수
  client: WebClient,             // Slack Web API 클라이언트
  context: Context               // 추가 컨텍스트 정보
}
```

### say() 함수

```typescript
await say('간단한 텍스트');
await say({
  text: string,                    // 메시지 텍스트 (필수)
  thread_ts?: string,             // 스레드 응답시 사용
  blocks?: Block[],               // Block Kit UI 요소들
  channel?: string,               // 특정 채널로 전송 (기본: 이벤트 채널)
});
```

**텍스트 처리 예시**:

```typescript
// 멘션 텍스트에서 봇 ID 제거 후 정확한 단어 매칭
if (event.text?.replace(/<@[^>]+>\s*/, '').trim() === '요약') {
  // "요약" 명령 처리
}
```

## 📋 현재 구현 상태

- ✅ 기본 Slack Bolt 앱 설정
- ✅ Socket Mode와 HTTP Mode 자동 감지 및 설정
- ✅ `/요약` 슬래시 커맨드 등록
- ✅ 멘션 이벤트 핸들러 구현 (`@봇 요약` 감지)
- ✅ 스레드 감지 로직 (`thread_ts` 존재 여부 확인)
- ✅ 정확한 "요약" 단어 매칭 (멘션 ID 제거 후 비교)
- ✅ 한국어 에러 메시지
- ⏳ 슬랙 앱 생성 및 토큰 설정 (다음 단계)
- ⏳ 실제 요약 기능 구현
