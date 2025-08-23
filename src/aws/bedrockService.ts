import { 
  BedrockRuntimeClient, 
  InvokeModelCommand 
} from '@aws-sdk/client-bedrock-runtime';
import { 
  BedrockAgentRuntimeClient, 
  RetrieveAndGenerateCommand 
} from '@aws-sdk/client-bedrock-agent-runtime';

export interface BedrockChatParams {
  message: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BedrockRAGParams {
  query: string;
  knowledgeBaseId: string;
  modelArn?: string;
}

export interface BedrockRAGResult {
  answer: string;
  sources: Array<{
    content: string;
    location?: string | undefined;
    score?: number | undefined;
  }>;
}

export class BedrockService {
  private bedrockClient: BedrockRuntimeClient;
  private bedrockAgentClient: BedrockAgentRuntimeClient;
  private defaultModelId: string;

  constructor() {
    const region = process.env.AWS_REGION;
    const modelId = process.env.BEDROCK_MODEL_ID;

    if (!region) {
      throw new Error('AWS_REGION 환경변수가 설정되지 않았습니다.');
    }

    if (!modelId) {
      throw new Error('BEDROCK_MODEL_ID 환경변수가 설정되지 않았습니다.');
    }

    this.bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bedrockAgentClient = new BedrockAgentRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.defaultModelId = modelId;
  }

  /**
   * Bedrock Claude를 통한 일반 채팅
   */
  async chat(params: BedrockChatParams): Promise<string> {
    const { 
      message, 
      systemPrompt = '당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 친절하고 정확하게 답변해주세요.',
      maxTokens = 4096,
      temperature = 0.7
    } = params;

    try {
      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: this.defaultModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      });

      const response = await this.bedrockClient.send(command);
      
      if (!response.body) {
        throw new Error('Bedrock 응답에서 본문을 찾을 수 없습니다.');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      if (!responseBody.content || !responseBody.content[0]?.text) {
        throw new Error('Bedrock 응답에서 텍스트를 찾을 수 없습니다.');
      }

      return responseBody.content[0].text;
    } catch (error) {
      console.error('Bedrock 채팅 실패:', error);
      throw new Error(`Bedrock 채팅 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Bedrock Knowledge Base를 통한 RAG 검색
   */
  async searchKnowledgeBase(params: BedrockRAGParams): Promise<BedrockRAGResult> {
    const { query, knowledgeBaseId, modelArn } = params;

    try {
      const command = new RetrieveAndGenerateCommand({
        input: {
          text: query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId,
            modelArn: modelArn || `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${this.defaultModelId}`,
          },
        },
      });

      const response = await this.bedrockAgentClient.send(command);

      if (!response.output?.text) {
        throw new Error('Bedrock RAG 응답에서 텍스트를 찾을 수 없습니다.');
      }

      const sources = response.citations?.map(citation => ({
        content: citation.generatedResponsePart?.textResponsePart?.text || '',
        location: citation.retrievedReferences?.[0]?.location?.s3Location?.uri || undefined,
        score: typeof citation.retrievedReferences?.[0]?.metadata?.score === 'number' ? citation.retrievedReferences[0].metadata.score : undefined,
      })) || [];

      return {
        answer: response.output.text,
        sources,
      };
    } catch (error) {
      console.error('Bedrock RAG 검색 실패:', error);
      throw new Error(`Bedrock RAG 검색 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 슬랙 스레드 요약을 위한 특화된 요약 기능
   */
  async summarizeSlackThread(formattedMessages: string, participants: string[], messageCount: number): Promise<string> {
    const systemPrompt = `당신은 슬랙 스레드 대화를 요약하는 전문가입니다. 
      다음 가이드라인을 따라 요약해주세요:

      1. 한국어로 답변해주세요
      2. 주요 논점과 결론을 명확하게 정리해주세요  
      3. 참여자별 핵심 의견을 구분해서 정리해주세요
      4. 결정사항이나 액션 아이템이 있다면 별도로 정리해주세요
      5. 전체적인 대화의 맥락과 흐름을 파악할 수 있도록 요약해주세요`;

    const message = `참여자: ${participants.join(', ')}
메시지 수: ${messageCount}개

대화 내용:
${formattedMessages}`;

    return this.chat({
      message,
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.3, // 요약은 더 일관성 있게
    });
  }

  /**
   * 이전 요약들을 검색하여 관련 내용 찾기
   */
  async searchPreviousSummaries(query: string): Promise<BedrockRAGResult | null> {
    const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
    
    if (!knowledgeBaseId) {
      console.warn('BEDROCK_KNOWLEDGE_BASE_ID가 설정되지 않아 RAG 검색을 건너뜁니다.');
      return null;
    }

    try {
      return await this.searchKnowledgeBase({
        query: `슬랙 스레드 요약과 관련하여: ${query}`,
        knowledgeBaseId,
      });
    } catch (error) {
      console.error('이전 요약 검색 실패:', error);
      return null;
    }
  }
}