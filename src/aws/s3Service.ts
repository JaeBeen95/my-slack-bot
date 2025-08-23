import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface S3UploadParams {
  key: string;
  content: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface S3DownloadParams {
  key: string;
}

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private keyPrefix: string;

  constructor() {
    const region = process.env.AWS_REGION;
    const bucketName = process.env.S3_BUCKET_NAME;
    const keyPrefix = process.env.S3_PREFIX || '';

    if (!region) {
      throw new Error('AWS_REGION 환경변수가 설정되지 않았습니다.');
    }

    if (!bucketName) {
      throw new Error('S3_BUCKET_NAME 환경변수가 설정되지 않았습니다.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    this.bucketName = bucketName;
    this.keyPrefix = keyPrefix;
  }

  /**
   * S3에 파일 업로드
   */
  async uploadFile(params: S3UploadParams): Promise<string> {
    const { key, content, contentType = 'text/markdown', metadata = {} } = params;
    const fullKey = this.keyPrefix + key;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
        Body: content,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      
      return `s3://${this.bucketName}/${fullKey}`;
    } catch (error) {
      console.error('S3 업로드 실패:', error);
      throw new Error(`S3 파일 업로드 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * S3에서 파일 다운로드
   */
  async downloadFile(params: S3DownloadParams): Promise<string> {
    const { key } = params;
    const fullKey = this.keyPrefix + key;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('S3 객체에서 내용을 찾을 수 없습니다.');
      }

      const content = await response.Body.transformToString();
      return content;
    } catch (error) {
      console.error('S3 다운로드 실패:', error);
      throw new Error(`S3 파일 다운로드 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 스레드 요약을 위한 S3 키 생성
   */
  generateSummaryKey(channelId: string, threadTs: string): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = threadTs.replace('.', '_');
    
    return `summaries/${dateStr}/${channelId}_${timestamp}.md`;
  }

  /**
   * S3 URL 생성
   */
  getS3Url(key: string): string {
    const fullKey = this.keyPrefix + key;
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fullKey}`;
  }
}