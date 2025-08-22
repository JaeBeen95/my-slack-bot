# 슬랙 스레드 요약 봇

TypeScript와 Node.js로 만든 슬랙 스레드 요약 봇입니다. 
Message Shortcut을 통해 스레드의 대화를 수집하고 요약하는 기능을 제공합니다.

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

- `app.shortcut(callbackId, handler)`: Message Shortcut 등록 (우클릭 메뉴)
- `app.command(pattern, handler)`: 슬래시 커맨드 등록
- `app.event(eventType, handler)`: 이벤트 리스너 등록 (멘션, 메시지 등)
- `app.message(pattern, handler)`: 메시지 이벤트 리스너
- `app.action(actionId, handler)`: 버튼/선택 액션 리스너
- `app.start()`: Socket Mode 시작 (포트 없음)
- `app.start(port)`: HTTP Mode 서버 시작 (Promise 반환)

### Message Shortcut 핸들러

```typescript
app.shortcut('thread_summary', async ({ shortcut, ack, respond, client, context }) => {
  // 핸들러 로직
});
```

**핸들러에 전달되는 객체 구조**:

```typescript
{
  shortcut: MessageShortcut {
    type: 'message_action',      // Shortcut 타입
    callback_id: string,         // 등록된 콜백 ID ('thread_summary')
    trigger_id: string,          // 모달 열기용 ID
    user: { id: string },        // 실행한 사용자 정보
    channel: { id: string },     // 채널 정보
    message: {                   // 우클릭한 메시지 정보
      ts: string,                // 메시지 타임스탬프 (스레드 ID로 사용)
      user: string,              // 메시지 작성자 ID
      text: string,              // 메시지 텍스트
      thread_ts?: string         // 스레드 타임스탬프 (스레드 답글인 경우)
    },
    team: { id: string }         // 워크스페이스 정보
  },
  ack: AckFn,                    // 즉시 응답 함수
  respond: RespondFn,            // 메시지 응답 함수
  client: WebClient,             // Slack Web API 클라이언트
  context: Context               // 봇 정보 등 컨텍스트
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

### SlackMessageService 클래스

스레드 메시지 수집 및 처리를 담당하는 서비스 클래스입니다.

```typescript
import { SlackMessageService } from './messageService';

const messageService = new SlackMessageService(client);
```

**주요 메서드**:

#### `getThreadMessages(channelId, threadTs, botUserId?)`

```typescript
const threadMessages = await messageService.getThreadMessages(
  'C1234567890',           // 채널 ID
  '1234567890.123456',     // 스레드 타임스탬프 (메시지 ID)
  'U0987654321'           // 봇 사용자 ID (선택사항)
);
```

**반환 타입 (`ThreadMessages`)**:

```typescript
{
  channelId: string,           // 채널 ID
  threadTs: string,           // 스레드 타임스탬프
  messageCount: number,       // 수집된 메시지 수
  messages: ThreadMessage[],  // 메시지 배열
  participants: string[]      // 참여자 이름 배열
}
```

**`ThreadMessage` 인터페이스**:

```typescript
{
  user: string,              // 사용자 ID
  username: string,          // 사용자 표시 이름
  text: string,             // 메시지 텍스트
  timestamp: string,        // 원본 타임스탬프
  formattedTime: string     // 포맷된 시간 (한국어)
}
```

#### `formatMessagesForSummary(threadMessages)`

수집된 메시지를 요약용 텍스트로 변환합니다.

```typescript
const formattedText = messageService.formatMessagesForSummary(threadMessages);
```

**출력 예시**:
```
스레드 요약 요청
참여자: 홍길동, 김철수
메시지 수: 5개

대화 내용:
[2024. 01. 15. 14:30] 홍길동: 프로젝트 진행 어떻게 할까요?
[2024. 01. 15. 14:32] 김철수: 먼저 요구사항 정리하면 좋겠어요
...
```

### 메시지 필터링 로직

**봇 메시지 제외**:
1. `message.subtype`이 있는 메시지 (다른 봇, 시스템 메시지)
2. `message.user === botUserId`인 메시지 (현재 봇)
3. 요약 요청 메시지 (`@봇 요약` 형태)

**사용자 정보 조회**:
- `client.users.info()` API 사용
- 실제 이름 또는 표시 이름 우선 사용
- 조회 실패시 사용자 ID 사용

## 🚀 주요 기능

### Message Shortcut 방식 스레드 요약
1. **사용법**: 채널 메시지 우클릭 → "스레드 요약하기" 선택
2. **동작**: 해당 메시지에 달린 모든 스레드 답글 수집 및 분석
3. **응답**: ephemeral 메시지로 요청자에게만 결과 표시

### 스마트 메시지 필터링
- 봇 메시지 자동 제외 (시스템 메시지, 다른 봇, 현재 봇)
- 요약 요청 메시지 제외
- 실제 사용자 대화만 수집

### 사용자 친화적 인터페이스
- 한국어 인터페이스
- 직관적인 우클릭 메뉴
- 개인적인 결과 표시 (채널 방해 없음)

## 📋 현재 구현 상태

- ✅ **기본 Slack Bolt 앱 설정**
- ✅ **Socket Mode와 HTTP Mode 자동 감지 및 설정**
- ✅ **Message Shortcut 등록** (`thread_summary`)
- ✅ **SlackMessageService 클래스 구현**
  - ✅ 스레드 메시지 수집 (`conversations.replies` API)
  - ✅ 사용자 정보 조회 (`users.info` API)
  - ✅ 메시지 필터링 및 포맷팅
  - ✅ 타임스탬프 한국어 변환
- ✅ **TypeScript 타입 안전성**
  - ✅ `MessageShortcut` 타입 적용
  - ✅ 커스텀 인터페이스 정의 (`ThreadMessage`, `ThreadMessages`)
- ✅ **에러 핸들링 및 사용자 피드백**
- ✅ **한국어 메시지 및 에러 처리**
- ⏳ **AI 요약 기능 연동** (다음 단계)
- ⏳ **결과 저장 기능** (Notion, 파일 등)

## 🛠️ 설정 방법

### 1. Slack 앱 설정
1. **Interactivity & Shortcuts** → **Message Shortcuts** 추가:
   - Name: `스레드 요약하기`
   - Callback ID: `thread_summary`

### 2. 필요한 권한
- `chat:write`: 메시지 전송
- `channels:history`: 채널 메시지 읽기
- `groups:history`: 비공개 채널 메시지 읽기
- `users:read`: 사용자 정보 조회

### 3. 환경 변수
```bash
SLACK_BOT_TOKEN=xoxb-...     # 봇 토큰
SLACK_SIGNING_SECRET=...     # 서명 검증 키
SLACK_SOCKET_TOKEN=xapp-...  # Socket Mode 토큰 (선택사항)
```
