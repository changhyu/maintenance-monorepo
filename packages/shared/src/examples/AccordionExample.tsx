import React, { useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionHeader,
} from '../components/common/Accordion';

export const AccordionExample: React.FC = () => {
  // 제어 컴포넌트용 상태
  const [expandedItems, setExpandedItems] = useState<string[]>(['faq-1']);
  
  // 제어 컴포넌트 변경 핸들러
  const handleExpandedChange = (items: string[]) => {
    setExpandedItems(items);
    console.log('현재 열린 항목:', items);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">아코디언 컴포넌트 예제</h1>
      
      {/* 기본 아코디언 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">기본 아코디언</h2>
        <Accordion defaultExpandedItems={['basic-1']}>
          <AccordionItem id="basic-1">
            <AccordionHeader>
              <h3 className="text-lg font-medium">아코디언이란 무엇인가요?</h3>
            </AccordionHeader>
            <AccordionPanel>
              <p className="text-gray-600">
                아코디언은 내용을 접었다 펼 수 있는 UI 컴포넌트입니다. 공간을 효율적으로 사용할 수 있도록 
                하면서 사용자가 필요한 내용만을 선택적으로 볼 수 있게 합니다.
              </p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="basic-2">
            <AccordionHeader>
              <h3 className="text-lg font-medium">언제 아코디언을 사용하나요?</h3>
            </AccordionHeader>
            <AccordionPanel>
              <p className="text-gray-600">
                아코디언은 다음과 같은 경우에 유용합니다:
              </p>
              <ul className="list-disc pl-5 mt-2 text-gray-600">
                <li>FAQ 섹션</li>
                <li>긴 콘텐츠를 그룹화할 때</li>
                <li>모바일 페이지에서 공간을 절약할 때</li>
                <li>설정 메뉴 또는 필터 패널</li>
              </ul>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="basic-3">
            <AccordionHeader>
              <h3 className="text-lg font-medium">아코디언의 장점은 무엇인가요?</h3>
            </AccordionHeader>
            <AccordionPanel>
              <p className="text-gray-600">
                아코디언의 주요 장점은 다음과 같습니다:
              </p>
              <ul className="list-disc pl-5 mt-2 text-gray-600">
                <li>화면 공간 절약</li>
                <li>사용자 경험 향상 (필요한 내용만 볼 수 있음)</li>
                <li>정보를 논리적으로 그룹화</li>
                <li>콘텐츠 스캔이 용이함</li>
              </ul>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      
      {/* 여러 항목 열기 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">여러 항목 동시에 열기</h2>
        <Accordion allowMultiple defaultExpandedItems={['multi-1', 'multi-3']}>
          <AccordionItem id="multi-1">
            <AccordionButton>첫 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">첫 번째 항목의 내용입니다. 여러 항목을 동시에 열 수 있습니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="multi-2">
            <AccordionButton>두 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">두 번째 항목의 내용입니다. 여러 항목을 동시에 열 수 있습니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="multi-3">
            <AccordionButton>세 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">세 번째 항목의 내용입니다. 여러 항목을 동시에 열 수 있습니다.</p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      
      {/* 비활성화된 아이템 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">비활성화된 아이템</h2>
        <Accordion>
          <AccordionItem id="disabled-1">
            <AccordionButton>활성화된 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">이 항목은 정상적으로 작동합니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="disabled-2" isDisabled>
            <AccordionButton>비활성화된 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">이 내용은 보이지 않습니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="disabled-3">
            <AccordionButton>또 다른 활성화된 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">이 항목은 정상적으로 작동합니다.</p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      
      {/* 제어 컴포넌트 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">제어 컴포넌트</h2>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            현재 열린 항목: {expandedItems.join(', ') || '없음'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setExpandedItems(['faq-1'])}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              첫 번째 열기
            </button>
            <button
              onClick={() => setExpandedItems(['faq-2'])}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              두 번째 열기
            </button>
            <button
              onClick={() => setExpandedItems(['faq-1', 'faq-2'])}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              둘 다 열기
            </button>
            <button
              onClick={() => setExpandedItems([])}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              모두 닫기
            </button>
          </div>
        </div>
        
        <Accordion
          expandedItems={expandedItems}
          onChange={handleExpandedChange}
          allowMultiple
        >
          <AccordionItem id="faq-1">
            <AccordionButton>제어 가능한 첫 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">
                이 항목은 외부에서 제어됩니다. 상단의 버튼을 사용하여 제어해보세요.
              </p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="faq-2">
            <AccordionButton>제어 가능한 두 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">
                이 항목도 외부에서 제어됩니다. 항목을 클릭하면 상태가 업데이트됩니다.
              </p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      
      {/* 중첩된 아코디언 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">중첩된 아코디언</h2>
        <Accordion>
          <AccordionItem id="nested-1">
            <AccordionButton>첫 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600 mb-4">첫 번째 항목의 내용입니다.</p>
              
              <div className="pl-4 border-l-2 border-gray-200">
                <h4 className="font-medium mb-2">중첩된 아코디언:</h4>
                <Accordion>
                  <AccordionItem id="nested-1-1">
                    <AccordionButton>중첩된 첫 번째 항목</AccordionButton>
                    <AccordionPanel>
                      <p className="text-gray-600">중첩된 콘텐츠입니다.</p>
                    </AccordionPanel>
                  </AccordionItem>
                  
                  <AccordionItem id="nested-1-2">
                    <AccordionButton>중첩된 두 번째 항목</AccordionButton>
                    <AccordionPanel>
                      <p className="text-gray-600">중첩된 콘텐츠입니다.</p>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="nested-2">
            <AccordionButton>두 번째 항목</AccordionButton>
            <AccordionPanel>
              <p className="text-gray-600">두 번째 항목의 내용입니다.</p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
      
      {/* 커스텀 스타일 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">커스텀 스타일</h2>
        <Accordion className="bg-gray-50 rounded-lg p-2 shadow-sm">
          <AccordionItem id="custom-1" className="mb-2 bg-white rounded-md shadow-sm">
            <AccordionButton className="text-blue-600 hover:bg-blue-50">
              커스텀 스타일 항목 1
            </AccordionButton>
            <AccordionPanel className="bg-blue-50 rounded-b-md">
              <p className="text-gray-700">커스텀 스타일이 적용된 내용입니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="custom-2" className="mb-2 bg-white rounded-md shadow-sm">
            <AccordionButton className="text-green-600 hover:bg-green-50">
              커스텀 스타일 항목 2
            </AccordionButton>
            <AccordionPanel className="bg-green-50 rounded-b-md">
              <p className="text-gray-700">커스텀 스타일이 적용된 내용입니다.</p>
            </AccordionPanel>
          </AccordionItem>
          
          <AccordionItem id="custom-3" className="bg-white rounded-md shadow-sm">
            <AccordionButton className="text-purple-600 hover:bg-purple-50">
              커스텀 스타일 항목 3
            </AccordionButton>
            <AccordionPanel className="bg-purple-50 rounded-b-md">
              <p className="text-gray-700">커스텀 스타일이 적용된 내용입니다.</p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
};

// 기본 내보내기 추가
export default AccordionExample; 