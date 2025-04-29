import React, { useState } from 'react';
import { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Card,
  CardBody,
  Input,
  Form
} from '../components/common';

const ModalExample: React.FC = () => {
  // 기본 모달
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  
  // 다양한 크기의 모달
  const [smallModalOpen, setSmallModalOpen] = useState(false);
  const [mediumModalOpen, setMediumModalOpen] = useState(false);
  const [largeModalOpen, setLargeModalOpen] = useState(false);
  
  // 다양한 유형의 모달
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  
  // 확인 모달 응답 처리
  const handleConfirm = () => {
    alert('확인되었습니다!');
    setConfirmModalOpen(false);
  };
  
  // 폼 제출 처리
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('폼이 제출되었습니다!');
    setFormModalOpen(false);
  };
  
  return (
    <div className="p-6 space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">기본 모달</h2>
        <div className="flex space-x-4">
          <Button onClick={() => setBasicModalOpen(true)}>
            기본 모달 열기
          </Button>
          
          <Modal 
            isOpen={basicModalOpen} 
            onClose={() => setBasicModalOpen(false)}
          >
            <ModalHeader onClose={() => setBasicModalOpen(false)}>
              기본 모달
            </ModalHeader>
            <ModalBody>
              <p>
                이것은 가장 기본적인 모달입니다. 헤더, 본문, 푸터로 구성되어 있습니다.
                닫기 버튼을 클릭하거나 배경을 클릭하면 모달이 닫힙니다.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setBasicModalOpen(false)}>
                닫기
              </Button>
              <Button variant="primary">
                확인
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">모달 크기</h2>
        <div className="flex space-x-4">
          <Button onClick={() => setSmallModalOpen(true)}>
            작은 모달
          </Button>
          <Button onClick={() => setMediumModalOpen(true)}>
            중간 모달
          </Button>
          <Button onClick={() => setLargeModalOpen(true)}>
            큰 모달
          </Button>
          
          {/* 작은 모달 */}
          <Modal 
            isOpen={smallModalOpen} 
            onClose={() => setSmallModalOpen(false)}
            size="sm"
          >
            <ModalHeader onClose={() => setSmallModalOpen(false)}>
              작은 모달
            </ModalHeader>
            <ModalBody>
              <p>작은 크기의 모달입니다.</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSmallModalOpen(false)}>
                닫기
              </Button>
            </ModalFooter>
          </Modal>
          
          {/* 중간 모달 */}
          <Modal 
            isOpen={mediumModalOpen} 
            onClose={() => setMediumModalOpen(false)}
            size="md"
          >
            <ModalHeader onClose={() => setMediumModalOpen(false)}>
              중간 모달
            </ModalHeader>
            <ModalBody>
              <p>중간 크기의 모달입니다 (기본값).</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setMediumModalOpen(false)}>
                닫기
              </Button>
            </ModalFooter>
          </Modal>
          
          {/* 큰 모달 */}
          <Modal 
            isOpen={largeModalOpen} 
            onClose={() => setLargeModalOpen(false)}
            size="lg"
          >
            <ModalHeader onClose={() => setLargeModalOpen(false)}>
              큰 모달
            </ModalHeader>
            <ModalBody>
              <p>큰 크기의 모달입니다. 더 많은 콘텐츠를 표시하는 데 적합합니다.</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card>
                  <CardBody>
                    <p>모달 내부에 다른 컴포넌트도 표시할 수 있습니다.</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p>복잡한 레이아웃도 가능합니다.</p>
                  </CardBody>
                </Card>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setLargeModalOpen(false)}>
                닫기
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">모달 유형</h2>
        <div className="flex space-x-4">
          <Button onClick={() => setAlertModalOpen(true)} variant="danger">
            알림 모달
          </Button>
          <Button onClick={() => setConfirmModalOpen(true)} variant="secondary">
            확인 모달
          </Button>
          <Button onClick={() => setFormModalOpen(true)} variant="primary">
            폼 모달
          </Button>
          
          {/* 알림 모달 */}
          <Modal 
            isOpen={alertModalOpen} 
            onClose={() => setAlertModalOpen(false)}
            size="sm"
          >
            <ModalBody className="text-center py-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg 
                  className="h-6 w-6 text-red-600" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">경고</h3>
              <p className="text-sm text-gray-500 mb-4">
                이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?
              </p>
              <div className="flex justify-center">
                <Button 
                  variant="danger"
                  className="w-full sm:w-auto" 
                  onClick={() => setAlertModalOpen(false)}
                >
                  확인
                </Button>
              </div>
            </ModalBody>
          </Modal>
          
          {/* 확인 모달 */}
          <Modal 
            isOpen={confirmModalOpen} 
            onClose={() => setConfirmModalOpen(false)}
          >
            <ModalHeader onClose={() => setConfirmModalOpen(false)}>
              작업 확인
            </ModalHeader>
            <ModalBody>
              <p>변경사항을 저장하시겠습니까?</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
                취소
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                확인
              </Button>
            </ModalFooter>
          </Modal>
          
          {/* 폼 모달 */}
          <Modal 
            isOpen={formModalOpen} 
            onClose={() => setFormModalOpen(false)}
            size="md"
          >
            <ModalHeader onClose={() => setFormModalOpen(false)}>
              로그인
            </ModalHeader>
            <ModalBody>
              <Form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이메일
                    </label>
                    <Input 
                      type="email" 
                      placeholder="이메일을 입력하세요" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      비밀번호
                    </label>
                    <Input 
                      type="password" 
                      placeholder="비밀번호를 입력하세요" 
                      required 
                    />
                  </div>
                  <div className="flex items-center">
                    <input 
                      id="remember-me" 
                      name="remember-me" 
                      type="checkbox" 
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      로그인 상태 유지
                    </label>
                  </div>
                </div>
                <ModalFooter className="px-0 pb-0">
                  <Button variant="secondary" onClick={() => setFormModalOpen(false)} type="button">
                    취소
                  </Button>
                  <Button variant="primary" type="submit">
                    로그인
                  </Button>
                </ModalFooter>
              </Form>
            </ModalBody>
          </Modal>
        </div>
      </section>
    </div>
  );
};

export default ModalExample;