# 슬랙 스레드 요약 봇

TypeScript와 Node.js로 만든 슬랙 스레드 요약 봇입니다. Message Shortcut을 통해 스레드의 대화를 수집하고 요약하는 기능을 제공합니다.

## 🚀 주요 기능

- **Message Shortcut 방식**: 메시지 점 3개 메뉴(⋯)에서 "스레드 요약하기" 선택
- **스마트 메시지 필터링**: 봇 메시지 자동 제외, 실제 사용자 대화만 수집
- **사용자 친화적**: 한국어 인터페이스, ephemeral 응답으로 채널 방해 없음

## 📋 현재 구현 상태

- ✅ **기본 Slack Bolt 앱 설정** (Socket/HTTP Mode 자동 감지)
- ✅ **Message Shortcut 등록** (`thread_summary`)
- ✅ **스레드 메시지 수집** (`conversations.replies` API)
- ✅ **사용자 정보 조회** (`users.info` API)
- ✅ **메시지 필터링 및 포맷팅**
- ✅ **TypeScript 타입 안전성**
- ⏳ **AI 요약 기능 연동** (다음 단계)
- ⏳ **결과 저장 기능** (Notion, 파일 등)

## 🛠️ 설정 방법

### 1. 환경 변수

```bash
SLACK_BOT_TOKEN=xoxb-...     # 봇 토큰
SLACK_SIGNING_SECRET=...     # 서명 검증 키
SLACK_SOCKET_TOKEN=xapp-...  # Socket Mode 토큰 (선택사항)
```

### 2. Slack 앱 설정

**Interactivity & Shortcuts** → **Message Shortcuts** 추가:
- Name: `스레드 요약하기`
- Callback ID: `thread_summary`

### 3. 필요한 권한

- `chat:write`: 메시지 전송
- `channels:history`: 채널 메시지 읽기
- `groups:history`: 비공개 채널 메시지 읽기
- `users:read`: 사용자 정보 조회

## 🔧 코드 구조

### 1. App 초기화 (`src/index.ts`)

```typescript
import dotenv from 'dotenv';
import { App } from '@slack/bolt';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: !!process.env.SLACK_SOCKET_TOKEN,
  ...(process.env.SLACK_SOCKET_TOKEN && { 
    appToken: process.env.SLACK_SOCKET_TOKEN 
  }),
});
```

**모드별 실행**:
- **Socket Mode**: `SLACK_SOCKET_TOKEN` 있을 때, WebSocket 실시간 연결
- **HTTP Mode**: `SLACK_SOCKET_TOKEN` 없을 때, HTTP 서버로 웹훅 수신

### 2. Message Shortcut 핸들러 (`src/slack/commands.ts`)

#### Shortcut 타입

| 타입 | UI | API 타입 | 용도 |
|------|----|---------|----|
| **Message Shortcut** | 메시지 점 3개 메뉴(⋯) | `message_action` | 특정 메시지 대상 액션 |
| **Global Shortcut** | 번개 버튼(⚡) 또는 슬래시 명령어 | `shortcut` | 전역 액션 |
| **Interactive Components** | 버튼, 드롭다운 등 | `button`, `select_menu` | 메시지 내 상호작용 |

#### 핸들러 구조

```typescript
export const handleThreadSummaryAction = async ({
  ack,
  respond,
  client,
  context,
  shortcut,
}: SlackShortcutMiddlewareArgs & AllMiddlewareArgs) => {
  await ack(); // 3초 내 응답 필수
  
  // 타입 가드
  if (shortcut.type !== 'message_action') return;
  
  // 메시지 정보 추출
  const { message, channel } = shortcut as MessageShortcut;
  
  // 스레드 메시지 수집
  const messageService = new SlackMessageService(client);
  const threadMessages = await messageService.getThreadMessages(
    channel.id,
    message.ts,
    context.botUserId
  );
  
  // 응답
  await respond({
    response_type: 'ephemeral',
    text: '📋 **스레드 요약 결과**...',
  });
};
```

#### 핸들러 매개변수

```typescript
{
  ack: () => Promise<void>,                    // 즉시 응답 (3초 내 필수)
  respond: (response) => Promise<void>,        // 메시지 응답
  client: WebClient,                           // Slack API 클라이언트
  context: { botUserId: string },              // 봇 정보
  shortcut: {
    type: 'message_action',                    // Shortcut 타입
    callback_id: 'thread_summary',             // 등록된 콜백 ID
    message: {
      ts: string,                              // 메시지 타임스탬프 (스레드 ID)
      user: string,                            // 작성자 ID
      text: string,                            // 메시지 텍스트
    },
    channel: { id: string },                   // 채널 정보
    user: { id: string },                      // 실행자 정보
  }
}
```

### 3. 메시지 수집 서비스 (`src/slack/messageService.ts`)

#### SlackMessageService 클래스

```typescript
import { SlackMessageService } from './messageService';

const messageService = new SlackMessageService(client);
const threadMessages = await messageService.getThreadMessages(
  'C1234567890',           // 채널 ID
  '1234567890.123456',     // 스레드 타임스탬프
  'U0987654321'           // 봇 사용자 ID (선택)
);
```

#### 반환 타입

```typescript
interface ThreadMessages {
  channelId: string;           // 채널 ID
  threadTs: string;           // 스레드 타임스탬프
  messageCount: number;       // 수집된 메시지 수
  messages: ThreadMessage[]; // 메시지 배열
  participants: string[];    // 참여자 이름 배열
}

interface ThreadMessage {
  user: string;              // 사용자 ID
  username: string;          // 사용자 표시 이름
  text: string;             // 메시지 텍스트
  timestamp: string;        // 원본 타임스탬프
  formattedTime: string;    // 포맷된 시간 (한국어)
}
```

#### 메시지 필터링

**제외되는 메시지**:
1. `message.subtype` 있는 메시지 (봇, 시스템 메시지)
2. `message.user === botUserId` 메시지 (현재 봇)
3. 요약 요청 메시지 (`@봇 요약` 형태)

**사용자 정보 조회**:
- `client.users.info()` API 사용
- 실제 이름 > 표시 이름 > 사용자 ID 순 우선

#### 응답 타입

```typescript
await respond({
  text: string,                              // 메시지 텍스트 (필수)
  response_type: 'ephemeral' | 'in_channel', // 공개/비공개 (기본: ephemeral)
  blocks?: Block[],                          // Block Kit UI
  thread_ts?: string,                        // 스레드 응답
  replace_original?: boolean,                // 원본 메시지 대체
});
```

**response_type**:
- `ephemeral`: 실행자에게만 보임 (기본값)
- `in_channel`: 채널 전체에 공개

## 🔍 포맷팅 예시

```
스레드 요약 요청
참여자: 홍길동, 김철수
메시지 수: 5개

대화 내용:
[2024. 01. 15. 14:30] 홍길동: 프로젝트 진행 어떻게 할까요?
[2024. 01. 15. 14:32] 김철수: 먼저 요구사항 정리하면 좋겠어요
...
```