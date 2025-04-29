import React, { useState } from 'react';
import { 
  Pagination, 
  PaginationInfo,
  Card,
  CardBody,
  Button
} from '../components/common';

const PaginationExample: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPage2, setCurrentPage2] = useState(5);
  const [currentPage3, setCurrentPage3] = useState(1);
  const [currentPage4, setCurrentPage4] = useState(1);
  
  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handlePageChange2 = (page: number) => {
    setCurrentPage2(page);
  };
  
  const handlePageChange3 = (page: number) => {
    setCurrentPage3(page);
  };
  
  const handlePageChange4 = (page: number) => {
    setCurrentPage4(page);
  };
  
  // 더미 데이터 생성 함수
  const generateDummyData = (currentPage: number, itemsPerPage = 5) => {
    return Array.from({ length: itemsPerPage }, (_, index) => ({
      id: (currentPage - 1) * itemsPerPage + index + 1,
      name: `아이템 ${(currentPage - 1) * itemsPerPage + index + 1}`,
      description: `페이지 ${currentPage}의 아이템 설명입니다.`,
    }));
  };
  
  const dummyData = generateDummyData(currentPage);
  
  return (
    <div className="p-6 space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">기본 페이지네이션</h2>
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="space-y-4">
                {dummyData.map(item => (
                  <div key={item.id} className="p-4 border rounded-md">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <PaginationInfo 
                  currentPage={currentPage} 
                  totalPages={10} 
                  totalItems={50}
                  itemsPerPage={5}
                />
                
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={10} 
                  onPageChange={handlePageChange}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">다양한 크기</h2>
        <div className="space-y-4">
          <div className="flex flex-col space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">작은 크기</h3>
              <Pagination 
                currentPage={currentPage} 
                totalPages={10} 
                onPageChange={handlePageChange}
                size="sm"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">중간 크기 (기본값)</h3>
              <Pagination 
                currentPage={currentPage} 
                totalPages={10} 
                onPageChange={handlePageChange}
                size="md"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">큰 크기</h3>
              <Pagination 
                currentPage={currentPage} 
                totalPages={10} 
                onPageChange={handlePageChange}
                size="lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">범위와 말줄임표</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">긴 페이지네이션 (현재: {currentPage2} / 100)</h3>
            <Pagination 
              currentPage={currentPage2} 
              totalPages={100} 
              onPageChange={handlePageChange2}
              siblingCount={1}
              boundaryCount={1}
            />
            
            <div className="mt-4 flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => setCurrentPage2(1)}
                disabled={currentPage2 === 1}
              >
                처음으로
              </Button>
              <Button 
                size="sm" 
                onClick={() => setCurrentPage2(25)}
                variant={currentPage2 === 25 ? "primary" : "secondary"}
              >
                25
              </Button>
              <Button 
                size="sm" 
                onClick={() => setCurrentPage2(50)}
                variant={currentPage2 === 50 ? "primary" : "secondary"}
              >
                50
              </Button>
              <Button 
                size="sm" 
                onClick={() => setCurrentPage2(75)}
                variant={currentPage2 === 75 ? "primary" : "secondary"}
              >
                75
              </Button>
              <Button 
                size="sm" 
                onClick={() => setCurrentPage2(100)}
                disabled={currentPage2 === 100}
              >
                마지막으로
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">많은 형제 페이지 버튼 (siblingCount=2)</h3>
            <Pagination 
              currentPage={currentPage2} 
              totalPages={100} 
              onPageChange={handlePageChange2}
              siblingCount={2}  // 현재 페이지 양쪽에 2개의 버튼 표시
              boundaryCount={1}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">많은 경계 페이지 버튼 (boundaryCount=2)</h3>
            <Pagination 
              currentPage={currentPage2} 
              totalPages={100} 
              onPageChange={handlePageChange2}
              siblingCount={1}
              boundaryCount={2}  // 시작과 끝에 2개의 버튼 표시
            />
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">버튼 설정</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">처음/끝 버튼 숨기기</h3>
            <Pagination 
              currentPage={currentPage3} 
              totalPages={10} 
              onPageChange={handlePageChange3}
              showEdgeButtons={false}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">이전/다음 버튼 숨기기</h3>
            <Pagination 
              currentPage={currentPage3} 
              totalPages={10} 
              onPageChange={handlePageChange3}
              showPrevNext={false}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">모든 네비게이션 버튼 숨기기</h3>
            <Pagination 
              currentPage={currentPage3} 
              totalPages={10} 
              onPageChange={handlePageChange3}
              showEdgeButtons={false}
              showPrevNext={false}
            />
          </div>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">페이지네이션 정보</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">기본 정보</h3>
            <PaginationInfo 
              currentPage={currentPage4} 
              totalPages={10} 
              totalItems={100}
              itemsPerPage={10}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">페이지 정보만</h3>
            <PaginationInfo 
              currentPage={currentPage4} 
              totalPages={10} 
              totalItems={100}
              itemsPerPage={10}
              showItems={false}
              showRange={false}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">아이템 정보만</h3>
            <PaginationInfo 
              currentPage={currentPage4} 
              totalPages={10} 
              totalItems={100}
              itemsPerPage={10}
              showPages={false}
              showRange={false}
            />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">범위 정보만</h3>
            <PaginationInfo 
              currentPage={currentPage4} 
              totalPages={10} 
              totalItems={100}
              itemsPerPage={10}
              showPages={false}
              showItems={false}
            />
          </div>
          
          <div className="mt-6">
            <Card>
              <CardBody>
                <div className="space-y-2 mb-4">
                  {generateDummyData(currentPage4, 3).map(item => (
                    <div key={item.id} className="p-3 border rounded-md">
                      <p>{item.name}</p>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <PaginationInfo 
                    currentPage={currentPage4} 
                    totalPages={10} 
                    totalItems={30}
                    itemsPerPage={3}
                  />
                  
                  <Pagination 
                    currentPage={currentPage4} 
                    totalPages={10} 
                    onPageChange={handlePageChange4}
                    size="sm"
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PaginationExample; 