import React, { useState } from 'react';
import { Stepper } from '../components/common/Stepper';

export const StepperExample: React.FC = () => {
  // 기본 예제 상태
  const [activeStep, setActiveStep] = useState(1);
  
  // 커스텀 아이콘 예제 상태
  const [customIconStep, setCustomIconStep] = useState(0);
  
  // 인터랙티브 예제 상태
  const [interactiveStep, setInteractiveStep] = useState(0);
  
  // 프로세스 예제 상태
  const [processStep, setProcessStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 기본 예제 단계
  const basicSteps = [
    { label: '계정 정보', description: '사용자 정보 입력' },
    { label: '개인 정보', description: '상세 정보 입력' },
    { label: '연락처 정보', description: '연락처 입력' },
    { label: '완료', description: '정보 확인' },
  ];
  
  // 커스텀 아이콘 예제 단계
  const customIconSteps = [
    { 
      label: '카트', 
      description: '상품 담기', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      label: '배송지', 
      description: '배송 정보', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      label: '결제', 
      description: '결제 수단', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      label: '확인', 
      description: '주문 완료', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
  ];
  
  // 인터랙티브 예제 단계
  const interactiveSteps = [
    { label: '1단계', description: '첫 번째 과정' },
    { label: '2단계', description: '두 번째 과정' },
    { label: '3단계', description: '세 번째 과정' },
    { label: '4단계', description: '마지막 과정' },
  ];
  
  // 단계적으로 진행되는 프로세스 예제 단계
  const processSteps = [
    { label: '파일 업로드', description: '데이터 준비' },
    { label: '파일 검증', description: '형식 및 내용 검증' },
    { label: '데이터 처리', description: '데이터 변환 및 정리' },
    { label: '완료', description: '처리 완료' },
  ];
  
  // 다음 단계로 이동
  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, basicSteps.length - 1));
  };
  
  // 이전 단계로 이동
  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };
  
  // 커스텀 아이콘 예제 다음 단계
  const handleCustomNext = () => {
    setCustomIconStep((prev) => Math.min(prev + 1, customIconSteps.length - 1));
  };
  
  // 커스텀 아이콘 예제 이전 단계
  const handleCustomPrev = () => {
    setCustomIconStep((prev) => Math.max(prev - 1, 0));
  };
  
  // 인터랙티브 단계 클릭 핸들러
  const handleStepClick = (index: number) => {
    setInteractiveStep(index);
  };
  
  // 프로세스 시작 핸들러
  const startProcess = () => {
    setIsProcessing(true);
    setProcessStep(0);
    
    // 1단계: 파일 업로드 (1초)
    setTimeout(() => {
      setProcessStep(1);
      
      // 2단계: 파일 검증 (1.5초)
      setTimeout(() => {
        setProcessStep(2);
        
        // 3단계: 데이터 처리 (2초)
        setTimeout(() => {
          setProcessStep(3);
          setIsProcessing(false);
        }, 2000);
      }, 1500);
    }, 1000);
  };
  
  // 프로세스 초기화 핸들러
  const resetProcess = () => {
    setProcessStep(0);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">스테퍼 컴포넌트 예제</h1>
      
      {/* 기본 수평 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">기본 수평 스테퍼</h2>
        <div className="mb-6">
          <Stepper
            steps={basicSteps}
            activeStep={activeStep}
            orientation="horizontal"
          />
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePrev}
            disabled={activeStep === 0}
            className={`px-4 py-2 rounded ${
              activeStep === 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={activeStep === basicSteps.length - 1}
            className={`px-4 py-2 rounded ${
              activeStep === basicSteps.length - 1 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            다음
          </button>
        </div>
      </section>
      
      {/* 수직 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">수직 스테퍼</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Stepper
              steps={basicSteps}
              activeStep={activeStep}
              orientation="vertical"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-2">{basicSteps[activeStep].label}</h3>
              <p className="text-gray-600">{basicSteps[activeStep].description}</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 크기별 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">크기별 스테퍼</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-medium mb-2">작은 크기 (sm)</h3>
            <Stepper
              steps={basicSteps}
              activeStep={activeStep}
              size="sm"
            />
          </div>
          <div>
            <h3 className="font-medium mb-2">중간 크기 (md)</h3>
            <Stepper
              steps={basicSteps}
              activeStep={activeStep}
              size="md"
            />
          </div>
          <div>
            <h3 className="font-medium mb-2">큰 크기 (lg)</h3>
            <Stepper
              steps={basicSteps}
              activeStep={activeStep}
              size="lg"
            />
          </div>
        </div>
      </section>
      
      {/* 커스텀 아이콘 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">커스텀 아이콘 스테퍼</h2>
        <div className="mb-6">
          <Stepper
            steps={customIconSteps}
            activeStep={customIconStep}
          />
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={handleCustomPrev}
            disabled={customIconStep === 0}
            className={`px-4 py-2 rounded ${
              customIconStep === 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            이전
          </button>
          <button
            onClick={handleCustomNext}
            disabled={customIconStep === customIconSteps.length - 1}
            className={`px-4 py-2 rounded ${
              customIconStep === customIconSteps.length - 1 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            다음
          </button>
        </div>
      </section>
      
      {/* 클릭 가능한 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">클릭 가능한 스테퍼</h2>
        <div className="mb-6">
          <Stepper
            steps={interactiveSteps}
            activeStep={interactiveStep}
            onClick={handleStepClick}
          />
        </div>
        <div className="bg-gray-100 p-4 rounded-lg mt-4">
          <p className="text-gray-600">현재 선택된 단계: {interactiveSteps[interactiveStep].label}</p>
          <p className="text-gray-500 text-sm mt-1">각 단계를 클릭하여 이동할 수 있습니다.</p>
        </div>
      </section>
      
      {/* 프로세스 진행 표시 스테퍼 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">프로세스 진행 표시 스테퍼</h2>
        <div className="mb-6">
          <Stepper
            steps={processSteps}
            activeStep={processStep}
          />
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={startProcess}
            disabled={isProcessing}
            className={`px-4 py-2 rounded ${
              isProcessing
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isProcessing ? '처리 중...' : '프로세스 시작'}
          </button>
          <button
            onClick={resetProcess}
            disabled={isProcessing || processStep === 0}
            className={`px-4 py-2 rounded ${
              isProcessing || processStep === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            초기화
          </button>
        </div>
        {processStep === processSteps.length - 1 && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
            프로세스가 성공적으로 완료되었습니다!
          </div>
        )}
      </section>
    </div>
  );
}; 