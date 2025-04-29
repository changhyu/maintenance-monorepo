import axios from 'axios';
import { Inquiry } from '../components/inquiry/InquiryManagement';
import { createNewInquiryNotification } from './notificationService';

// API 기본 설정
const API_URL = '/api';

export class InquiryService {
  /**
   * 문의 목록 조회
   * @param filter 필터 옵션
   * @returns 문의 목록
   */
  static async getInquiries(filter?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    try {
      const params = new URLSearchParams();
      
      if (filter?.status) {
        params.append('status', filter.status);
      }
      
      if (filter?.startDate) {
        params.append('startDate', filter.startDate);
      }
      
      if (filter?.endDate) {
        params.append('endDate', filter.endDate);
      }
      
      if (filter?.search) {
        params.append('search', filter.search);
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await axios.get(`${API_URL}/inquiries${queryString}`);
      
      return response.data;
    } catch (error) {
      console.error('문의 목록 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 문의 상세 조회
   * @param id 문의 ID
   * @returns 문의 상세 정보
   */
  static async getInquiryById(id: string) {
    try {
      const response = await axios.get(`${API_URL}/inquiries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${id} 조회 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 새 문의 생성
   * @param inquiry 문의 데이터
   * @returns 생성된 문의
   */
  static async createInquiry(inquiry: Omit<Inquiry, 'id' | 'createdAt'>) {
    try {
      const response = await axios.post(`${API_URL}/inquiries`, inquiry);
      
      // 새 문의 알림 생성
      await createNewInquiryNotification(response.data);
      
      return response.data;
    } catch (error) {
      console.error('문의 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 문의 상태 업데이트
   * @param id 문의 ID
   * @param status 새 상태
   * @returns 업데이트된 문의
   */
  static async updateInquiryStatus(id: string, status: 'pending' | 'inProgress' | 'resolved') {
    try {
      const response = await axios.patch(`${API_URL}/inquiries/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${id} 상태 업데이트 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 문의 정보 업데이트
   * @param id 문의 ID
   * @param data 업데이트할 데이터
   * @returns 업데이트된 문의
   */
  static async updateInquiry(id: string, data: Partial<Inquiry>) {
    try {
      const response = await axios.patch(`${API_URL}/inquiries/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${id} 업데이트 중 오류 발생:`, error);
      throw error;
    }
  }

  /**
   * 문의 삭제
   * @param id 문의 ID
   * @returns 성공 여부
   */
  static async deleteInquiry(id: string) {
    try {
      const response = await axios.delete(`${API_URL}/inquiries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${id} 삭제 중 오류 발생:`, error);
      throw error;
    }
  }
  
  /**
   * 문의 첨부 파일 업로드
   * @param inquiryId 문의 ID
   * @param files 업로드할 파일 목록
   * @returns 업로드된 파일 정보
   */
  static async uploadInquiryAttachments(inquiryId: string, files: File[]) {
    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await axios.post(`${API_URL}/inquiries/${inquiryId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${inquiryId} 첨부 파일 업로드 중 오류 발생:`, error);
      throw error;
    }
  }
  
  /**
   * 문의 첨부 파일 삭제
   * @param inquiryId 문의 ID
   * @param fileName 파일 이름
   * @returns 성공 여부
   */
  static async deleteAttachment(inquiryId: string, fileName: string) {
    try {
      const response = await axios.delete(`${API_URL}/inquiries/${inquiryId}/attachments/${encodeURIComponent(fileName)}`);
      return response.data;
    } catch (error) {
      console.error(`문의 ID ${inquiryId} 첨부 파일 ${fileName} 삭제 중 오류 발생:`, error);
      throw error;
    }
  }
}

export default InquiryService;