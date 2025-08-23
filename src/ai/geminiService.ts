import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SummarizeParams {
  formattedMessages: string;
  participants: string[];
  messageCount: number;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    if (!model) {
      throw new Error('GEMINI_MODEL 환경변수가 설정되지 않았습니다.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  /**
   * 슬랙 스레드 메시지를 요약합니다
   */
  async summarizeMessages(params: SummarizeParams): Promise<string> {
    const { formattedMessages, participants, messageCount } = params;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `당신은 슬랙 스레드 대화를 요약하는 전문가입니다. 
        다음 가이드라인을 따라 요약해주세요:

        1. 한국어로 답변해주세요
        2. 주요 논점과 결론을 명확하게 정리해주세요  
        3. 참여자별 핵심 의견을 구분해서 정리해주세요
        4. 결정사항이나 액션 아이템이 있다면 별도로 정리해주세요
        5. 전체적인 대화의 맥락과 흐름을 파악할 수 있도록 요약해주세요

        참여자: ${participants.join(', ')}
        메시지 수: ${messageCount}개

        대화 내용:
        ${formattedMessages}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const summary = response.text();

      if (!summary) {
        throw new Error('Gemini 응답에서 요약 내용을 찾을 수 없습니다.');
      }

      return summary;
    } catch (error) {
      console.error('Gemini 요약 생성 실패:', error);

      if (error instanceof Error) {
        throw new Error(`AI 요약 생성 중 오류 발생: ${error.message}`);
      }

      throw new Error('AI 요약 생성 중 알 수 없는 오류가 발생했습니다.');
    }
  }
}
