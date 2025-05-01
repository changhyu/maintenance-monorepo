/**
 * GitCacheDeltaCompressor - Git 데이터를 위한 델타 압축 알고리즘
 * 
 * Git 데이터 특성에 맞게 델타 압축 및 효율적인 저장을 위한 유틸리티
 */

export class GitCacheDeltaCompressor {
  // 기본 델타 사이즈 (바이트)
  private static readonly DEFAULT_DELTA_SIZE = 16;
  
  /**
   * 소스 버퍼를 압축합니다
   * @param source 원본 데이터
   * @param previousVersions 이전 버전 데이터 배열 (델타 압축에 사용, 선택 사항)
   * @returns 압축된 데이터
   */
  public static compress(source: string | Uint8Array, previousVersions?: Array<string | Uint8Array>): {
    data: Uint8Array;
    isDelta: boolean;
    baseVersion?: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } {
    // 문자열을 Uint8Array로 변환
    const sourceBuffer = typeof source === 'string' 
      ? this.stringToBuffer(source)
      : source;
    
    const originalSize = sourceBuffer.length;
    
    // 이전 버전이 있으면 델타 압축 시도
    if (previousVersions && previousVersions.length > 0) {
      const bestDelta = this.findBestDelta(sourceBuffer, previousVersions);
      
      // 압축률이 50% 초과인 경우만 델타 압축 사용
      if (bestDelta && bestDelta.compressionRatio > 0.5) {
        return {
          data: bestDelta.delta,
          isDelta: true,
          baseVersion: bestDelta.baseVersion,
          originalSize,
          compressedSize: bestDelta.delta.length,
          compressionRatio: bestDelta.compressionRatio
        };
      }
    }
    
    // 델타 압축이 효과적이지 않은 경우 기본 압축
    const compressedData = this.basicCompress(sourceBuffer);
    
    return {
      data: compressedData,
      isDelta: false,
      originalSize,
      compressedSize: compressedData.length,
      compressionRatio: 1 - (compressedData.length / originalSize)
    };
  }
  
  /**
   * 압축된 데이터를 원래 상태로 복원합니다
   * @param compressed 압축된 데이터
   * @param isDelta 델타 압축 여부
   * @param baseData 기본 버전 데이터 (델타 압축인 경우 필수)
   * @returns 원본 데이터
   */
  public static decompress(
    compressed: Uint8Array, 
    isDelta: boolean = false, 
    baseData?: string | Uint8Array
  ): string {
    if (isDelta && baseData) {
      // 델타 압축 해제
      const baseBuffer = typeof baseData === 'string' 
        ? this.stringToBuffer(baseData)
        : baseData;
        
      const reconstructed = this.applyDelta(compressed, baseBuffer);
      return this.bufferToString(reconstructed);
    } else {
      // 기본 압축 해제
      const decompressed = this.basicDecompress(compressed);
      return this.bufferToString(decompressed);
    }
  }
  
  /**
   * 문자열을 Uint8Array로 변환
   */
  private static stringToBuffer(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
  
  /**
   * Uint8Array를 문자열로 변환
   */
  private static bufferToString(buffer: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }
  
  /**
   * 가장 효과적인 델타 압축 기준 버전을 찾습니다
   */
  private static findBestDelta(
    sourceBuffer: Uint8Array, 
    previousVersions: Array<string | Uint8Array>
  ): {
    delta: Uint8Array;
    baseVersion: number;
    compressionRatio: number;
  } | null {
    let bestDelta: Uint8Array | null = null;
    let bestBaseVersion = -1;
    let bestCompressionRatio = 0;
    
    // 모든 이전 버전에 대해 델타 압축 시도
    for (let i = 0; i < previousVersions.length; i++) {
      const baseBuffer = typeof previousVersions[i] === 'string'
        ? this.stringToBuffer(previousVersions[i] as string)
        : previousVersions[i] as Uint8Array;
      
      const delta = this.createDelta(sourceBuffer, baseBuffer);
      const compressionRatio = 1 - (delta.length / sourceBuffer.length);
      
      // 더 좋은 압축률을 가진 버전 찾기
      if (compressionRatio > bestCompressionRatio) {
        bestDelta = delta;
        bestBaseVersion = i;
        bestCompressionRatio = compressionRatio;
      }
    }
    
    if (bestDelta && bestBaseVersion >= 0) {
      return {
        delta: bestDelta,
        baseVersion: bestBaseVersion,
        compressionRatio: bestCompressionRatio
      };
    }
    
    return null;
  }
  
  /**
   * 두 버퍼 간의 델타를 생성합니다
   */
  private static createDelta(newBuffer: Uint8Array, baseBuffer: Uint8Array): Uint8Array {
    // 구현: LCS(Longest Common Subsequence) 기반 델타 압축 알고리즘
    // 여기서는 간소화된 구현을 보여줍니다
    
    const deltaChunks: number[] = [];
    
    // 델타 헤더 (매직 넘버: 0x01, 0xDE, 0x17, 0xA0)
    deltaChunks.push(0x01, 0xDE, 0x17, 0xA0);
    
    // 기본 버퍼와 새 버퍼의 크기 저장
    this.storeVarint(deltaChunks, baseBuffer.length);
    this.storeVarint(deltaChunks, newBuffer.length);
    
    // 공통 부분 찾기 (간소화된 알고리즘)
    let pos = 0;
    while (pos < newBuffer.length) {
      let matchPos = -1;
      let matchLen = 0;
      
      // 기본 버퍼에서 가장 긴 일치 부분 찾기
      for (let i = 0; i < baseBuffer.length; i++) {
        let j = 0;
        while (i + j < baseBuffer.length && 
               pos + j < newBuffer.length && 
               baseBuffer[i + j] === newBuffer[pos + j]) {
          j++;
        }
        
        if (j > matchLen && j >= this.DEFAULT_DELTA_SIZE) {
          matchLen = j;
          matchPos = i;
        }
      }
      
      if (matchLen >= this.DEFAULT_DELTA_SIZE) {
        // 일치 부분 (복사 명령)
        deltaChunks.push(0x80 | Math.min(matchLen - this.DEFAULT_DELTA_SIZE, 0x7F));
        this.storeVarint(deltaChunks, matchPos);
        pos += matchLen;
      } else {
        // 불일치 부분 (직접 데이터 저장)
        let dataLen = 0;
        const dataStart = pos;
        
        while (pos < newBuffer.length) {
          let foundMatch = false;
          
          for (let i = 0; i < baseBuffer.length - this.DEFAULT_DELTA_SIZE + 1; i++) {
            let j = 0;
            while (i + j < baseBuffer.length && 
                   pos + j < newBuffer.length && 
                   baseBuffer[i + j] === newBuffer[pos + j]) {
              j++;
            }
            
            if (j >= this.DEFAULT_DELTA_SIZE) {
              foundMatch = true;
              break;
            }
          }
          
          if (foundMatch) {
            break;
          }
          
          pos++;
          dataLen++;
          
          // 최대 데이터 길이 제한 (0x7F)
          if (dataLen >= 0x7F) {
            break;
          }
        }
        
        // 직접 데이터 삽입
        deltaChunks.push(dataLen);
        for (let i = 0; i < dataLen; i++) {
          deltaChunks.push(newBuffer[dataStart + i]);
        }
      }
    }
    
    // 델타 종료 마커
    deltaChunks.push(0);
    
    return new Uint8Array(deltaChunks);
  }
  
  /**
   * 델타를 적용하여 원본 데이터 복원
   */
  private static applyDelta(delta: Uint8Array, baseBuffer: Uint8Array): Uint8Array {
    // 델타 헤더 확인 (매직 넘버)
    if (delta[0] !== 0x01 || delta[1] !== 0xDE || delta[2] !== 0x17 || delta[3] !== 0xA0) {
      throw new Error('Invalid delta format');
    }
    
    // 크기 정보 읽기
    let pos = 4;
    const baseSize = this.readVarint(delta, pos);
    pos += this.varintSize(baseSize);
    
    const newSize = this.readVarint(delta, pos);
    pos += this.varintSize(newSize);
    
    // 기본 버퍼 크기 검증
    if (baseBuffer.length !== baseSize) {
      throw new Error('Base buffer size mismatch');
    }
    
    // 결과 버퍼 초기화
    const result = new Uint8Array(newSize);
    let resultPos = 0;
    
    // 델타 명령 해석
    while (pos < delta.length) {
      const cmd = delta[pos++];
      
      if (cmd === 0) {
        // 종료 마커
        break;
      } else if (cmd & 0x80) {
        // 복사 명령
        const copyLen = (cmd & 0x7F) + this.DEFAULT_DELTA_SIZE;
        const copyPos = this.readVarint(delta, pos);
        pos += this.varintSize(copyPos);
        
        // 복사 범위 검증
        if (copyPos + copyLen > baseBuffer.length) {
          throw new Error('Copy operation out of bounds');
        }
        
        // 데이터 복사
        for (let i = 0; i < copyLen; i++) {
          result[resultPos++] = baseBuffer[copyPos + i];
        }
      } else {
        // 직접 데이터
        const dataLen = cmd;
        
        // 데이터 길이 검증
        if (pos + dataLen > delta.length) {
          throw new Error('Data operation out of bounds');
        }
        
        // 직접 데이터 복사
        for (let i = 0; i < dataLen; i++) {
          result[resultPos++] = delta[pos++];
        }
      }
    }
    
    // 결과 크기 검증
    if (resultPos !== newSize) {
      throw new Error('Result size mismatch');
    }
    
    return result;
  }
  
  /**
   * 가변 정수 저장
   */
  private static storeVarint(output: number[], value: number): void {
    if (value < 0x80) {
      output.push(value);
    } else if (value < 0x4000) {
      output.push((value >> 7) | 0x80);
      output.push(value & 0x7F);
    } else if (value < 0x200000) {
      output.push((value >> 14) | 0x80);
      output.push(((value >> 7) & 0x7F) | 0x80);
      output.push(value & 0x7F);
    } else if (value < 0x10000000) {
      output.push((value >> 21) | 0x80);
      output.push(((value >> 14) & 0x7F) | 0x80);
      output.push(((value >> 7) & 0x7F) | 0x80);
      output.push(value & 0x7F);
    } else {
      output.push((value >> 28) | 0x80);
      output.push(((value >> 21) & 0x7F) | 0x80);
      output.push(((value >> 14) & 0x7F) | 0x80);
      output.push(((value >> 7) & 0x7F) | 0x80);
      output.push(value & 0x7F);
    }
  }
  
  /**
   * 가변 정수 읽기
   */
  private static readVarint(buffer: Uint8Array, start: number): number {
    let value = 0;
    let shift = 0;
    let pos = start;
    
    while (true) {
      const byte = buffer[pos++];
      value |= (byte & 0x7F) << shift;
      
      if (!(byte & 0x80)) {
        break;
      }
      
      shift += 7;
      
      if (shift > 28) {
        throw new Error('Varint too large');
      }
    }
    
    return value;
  }
  
  /**
   * 가변 정수 크기 계산
   */
  private static varintSize(value: number): number {
    if (value < 0x80) return 1;
    if (value < 0x4000) return 2;
    if (value < 0x200000) return 3;
    if (value < 0x10000000) return 4;
    return 5;
  }
  
  /**
   * 기본 압축 알고리즘 (간단한 RLE 압축)
   */
  private static basicCompress(buffer: Uint8Array): Uint8Array {
    const output: number[] = [];
    
    // 압축 타입 표시 (0x00: 비델타 압축)
    output.push(0x00);
    
    // 원본 버퍼 길이 저장
    this.storeVarint(output, buffer.length);
    
    let pos = 0;
    
    while (pos < buffer.length) {
      // 반복 시퀀스 찾기
      let runLength = 1;
      const currentByte = buffer[pos];
      
      while (pos + runLength < buffer.length && 
             buffer[pos + runLength] === currentByte &&
             runLength < 130) {
        runLength++;
      }
      
      if (runLength >= 4) {
        // 반복 시퀀스 (0x80 | length, byte)
        output.push(0x80 | (runLength - 4));
        output.push(currentByte);
        pos += runLength;
      } else {
        // 비반복 시퀀스
        let literalLength = 1;
        
        while (pos + literalLength < buffer.length) {
          // 앞으로 4바이트 이상 반복되는지 확인
          let nextRunLength = 1;
          const nextByte = buffer[pos + literalLength];
          
          while (pos + literalLength + nextRunLength < buffer.length && 
                 buffer[pos + literalLength + nextRunLength] === nextByte &&
                 nextRunLength < 130) {
            nextRunLength++;
          }
          
          if (nextRunLength >= 4) {
            break;
          }
          
          literalLength++;
          
          // 최대 리터럴 길이 제한 (127)
          if (literalLength >= 127) {
            break;
          }
        }
        
        // 리터럴 시퀀스 (length, bytes...)
        output.push(literalLength);
        for (let i = 0; i < literalLength; i++) {
          output.push(buffer[pos + i]);
        }
        
        pos += literalLength;
      }
    }
    
    return new Uint8Array(output);
  }
  
  /**
   * 기본 압축 해제
   */
  private static basicDecompress(compressed: Uint8Array): Uint8Array {
    // 압축 타입 확인
    if (compressed[0] !== 0x00) {
      throw new Error('Invalid compression type');
    }
    
    // 원본 버퍼 길이 읽기
    let pos = 1;
    const originalSize = this.readVarint(compressed, pos);
    pos += this.varintSize(originalSize);
    
    // 결과 버퍼 초기화
    const result = new Uint8Array(originalSize);
    let resultPos = 0;
    
    // 압축 명령 해석
    while (pos < compressed.length && resultPos < originalSize) {
      const cmd = compressed[pos++];
      
      if (cmd & 0x80) {
        // 반복 시퀀스
        const runLength = (cmd & 0x7F) + 4;
        const value = compressed[pos++];
        
        for (let i = 0; i < runLength; i++) {
          result[resultPos++] = value;
        }
      } else {
        // 비반복 시퀀스
        const literalLength = cmd;
        
        for (let i = 0; i < literalLength; i++) {
          result[resultPos++] = compressed[pos++];
        }
      }
    }
    
    return result;
  }
  
  /**
   * Git 객체를 분석하여 최적의 압축 방식 선택
   */
  public static selectCompressionMethod(data: string, type: string): 'delta' | 'basic' | 'none' {
    // 타입별 최적 압축 방식 선택
    switch (type) {
      case 'blob': 
        // 텍스트 파일은 델타 압축이 효과적
        if (this.isTextContent(data) && data.length > 1024) {
          return 'delta';
        }
        // 작은 파일은 압축하지 않음
        if (data.length < 512) {
          return 'none';
        }
        return 'basic';
        
      case 'commit':
        // 커밋은 작아서 압축 이득이 적음
        return data.length > 2048 ? 'basic' : 'none';
        
      case 'tree':
        // 트리는 구조가 유사하여 델타 압축이 효과적
        return 'delta';
        
      default:
        // 기본적으로 기본 압축 사용
        return 'basic';
    }
  }
  
  /**
   * 데이터가 텍스트 콘텐츠인지 확인
   */
  private static isTextContent(data: string): boolean {
    // 간단한 텍스트 감지 (0x00~0x08, 0x0E~0x1F 범위의 문자 없음)
    for (let i = 0; i < Math.min(1024, data.length); i++) {
      const code = data.charCodeAt(i);
      if ((code >= 0x00 && code <= 0x08) || (code >= 0x0E && code <= 0x1F && code !== 0x0A && code !== 0x0D)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Git의 commit, tree, blob 객체를 식별하고 최적화된 압축 수행
   */
  public static compressGitObject(data: string, type: string, previousVersions?: Array<string>): {
    data: Uint8Array;
    compressionMethod: 'delta' | 'basic' | 'none';
    baseVersion?: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } {
    // 최적의 압축 방식 선택
    const compressionMethod = this.selectCompressionMethod(data, type);
    
    switch (compressionMethod) {
      case 'delta':
        if (previousVersions && previousVersions.length > 0) {
          const result = this.compress(data, previousVersions);
          return {
            ...result,
            compressionMethod
          };
        }
        // 이전 버전이 없으면 기본 압축으로 대체
        const basicResult = this.compress(data);
        return {
          ...basicResult,
          compressionMethod: 'basic'
        };
        
      case 'basic':
        const result = this.compress(data);
        return {
          ...result,
          compressionMethod
        };
        
      case 'none':
        const buffer = this.stringToBuffer(data);
        return {
          data: buffer,
          compressionMethod,
          originalSize: buffer.length,
          compressedSize: buffer.length,
          compressionRatio: 0
        };
    }
  }
  
  /**
   * Git 객체 압축 해제
   */
  public static decompressGitObject(
    compressed: Uint8Array, 
    compressionMethod: 'delta' | 'basic' | 'none',
    baseData?: string
  ): string {
    switch (compressionMethod) {
      case 'delta':
        if (!baseData) {
          throw new Error('Base data required for delta decompression');
        }
        return this.decompress(compressed, true, baseData);
        
      case 'basic':
        return this.decompress(compressed);
        
      case 'none':
        return this.bufferToString(compressed);
    }
  }
} 