// jspdf에 autoTable 메서드를 추가하기 위한 타입 정의
import { jsPDF } from 'jspdf';

// autoTable 옵션 타입 정의
interface AutoTableOptions {
  head?: any[][];
  body: any[][];
  foot?: any[][];
  startY?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  pageBreak?: 'auto' | 'avoid' | 'always';
  rowPageBreak?: 'auto' | 'avoid' | 'always';
  tableWidth?: 'auto' | 'wrap' | number;
  showHead?: 'everyPage' | 'firstPage' | 'never';
  showFoot?: 'everyPage' | 'lastPage' | 'never';
  tableLineWidth?: number;
  tableLineColor?: string;
  theme?: 'striped' | 'grid' | 'plain';
  styles?: any;
  headStyles?: any;
  bodyStyles?: any;
  footStyles?: any;
  alternateRowStyles?: any;
  columnStyles?: { [key: number]: any };
  didParseCell?: (data: any) => void;
  willDrawCell?: (data: any) => void;
  didDrawCell?: (data: any) => void;
  didDrawPage?: (data: any) => void;
  didParseTable?: (data: any) => void;
  willDrawTable?: (data: any) => void;
  didDrawTable?: (data: any) => void;
  addPageContent?: (data: any) => void;
}

// jsPDF 인터페이스 확장
declare module 'jspdf' {
  interface jsPDF {
    /**
     * jsPDF autoTable 플러그인
     * @param options autoTable 설정 옵션
     * @returns jsPDF 인스턴스 (메서드 체이닝 지원)
     */
    autoTable(options: AutoTableOptions): jsPDF;
  }
}
