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
- ✅ **Gemini AI 요약 기능 연동**
- ✅ **DM 전송으로 개인화된 요약 결과 제공**
- ⏳ **결과 저장 기능** (Notion, 파일 등)

## 🛠️ 설정 방법

### 1. 환경 변수

```bash
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-...     # 봇 토큰
SLACK_SIGNING_SECRET=...     # 서명 검증 키
SLACK_SOCKET_TOKEN=xapp-...  # Socket Mode 토큰 (선택사항)

# Gemini AI Configuration
GEMINI_API_KEY=...           # Google Gemini API 키 (필수)
GEMINI_MODEL=gemini-2.5-flash # 사용할 Gemini 모델 (필수)
```

### 2. Gemini API 설정

1. **Google AI Studio** 접속: https://aistudio.google.com
2. 구글 계정으로 로그인
3. **API keys** → **Create API key** 클릭
4. 생성된 API 키를 `.env`의 `GEMINI_API_KEY`에 설정

### 3. Slack 앱 설정

**Interactivity & Shortcuts** → **Message Shortcuts** 추가:
- Name: `스레드 요약하기`
- Callback ID: `thread_summary`

### 4. 필요한 권한

- `chat:write`: 메시지 전송 (DM 포함)
- `channels:history`: 채널 메시지 읽기
- `groups:history`: 비공개 채널 메시지 읽기
- `users:read`: 사용자 정보 조회
- `im:write`: DM 전송

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

#### 처리 흐름

1. **메시지 정보 추출**: Message Shortcut에서 채널, 스레드 정보 수집
2. **스레드 메시지 수집**: `SlackMessageService`로 스레드 대화 수집
3. **AI 요약 생성**: `GeminiService`로 대화 내용 요약
4. **DM 전송**: 개인 DM으로 요약 결과 전송

#### 핵심 기능

```typescript
// 스레드 메시지 수집
const messageService = new SlackMessageService(client);
const threadMessages = await messageService.getThreadMessages({
  channelId: channel.id,
  threadTs: message.ts,
  botUserId
});

// AI 요약 생성
const geminiService = new GeminiService();
const aiSummary = await geminiService.summarizeMessages({
  formattedMessages,
  participants: threadMessages.participants,
  messageCount: threadMessages.messageCount,
});

// DM으로 결과 전송
const dmResponse = await client.conversations.open({
  users: shortcut.user.id,
});
await client.chat.postMessage({
  channel: dmResponse.channel.id,
  text: `📋 **스레드 요약 완료**\n\n${aiSummary}`,
});
```

### 3. AI 요약 서비스 (`src/ai/geminiService.ts`)

#### GeminiService 클래스

```typescript
import { GeminiService } from '../ai/geminiService';

const geminiService = new GeminiService();
const summary = await geminiService.summarizeMessages({
  formattedMessages: "대화 내용...",
  participants: ["홍길동", "김철수"],
  messageCount: 5
});
```

#### 환경변수 검증

- `GEMINI_API_KEY`: Google Gemini API 키 (필수)
- `GEMINI_MODEL`: 사용할 모델명 (필수, 예: `gemini-2.5-flash`)

#### 요약 프롬프트 구조

- 한국어 요약 생성
- 주요 논점과 결론 정리
- 참여자별 핵심 의견 구분
- 결정사항 및 액션 아이템 식별

### 4. 메시지 수집 서비스 (`src/slack/messageService.ts`)

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

## 💡 사용법

1. **스레드가 있는 메시지**에서 점 3개 메뉴(⋯) 클릭
2. **"스레드 요약하기"** 선택
3. **개인 DM**으로 AI 요약 결과 수신

## 🔄 개선사항

- **AI 모델**: Gemini 2.5 Flash
- **개인화된 결과**: 채널 방해 없이 DM으로 전송
- **구조화된 요약**: 핵심 내용, 논의사항, 결정사항 구분

## 🔍 요약 결과 예시

```
📋 스레드 요약 완료

📊 수집 정보:
• 참여자: 홍길동, 김철수
• 메시지 수: 5개

🤖 AI 요약:
**핵심 내용**: 프로젝트 진행 방향에 대한 논의로, 요구사항 정리 우선 실행 합의

**주요 논의**:
- 홍길동: 프로젝트 전반적인 진행 방식 문의
- 김철수: 요구사항 정리 우선 제안

**결정사항**:
- 요구사항 정리를 우선적으로 진행하기로 결정
```