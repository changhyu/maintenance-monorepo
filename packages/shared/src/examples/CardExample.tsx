import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  CardImage,
  CardGrid,
  Button
} from '../components/common';

// 카드 샘플 데이터
const articles = [
  {
    id: 1,
    title: '디자인 시스템의 중요성',
    description: '효율적인 UI 개발을 위한 디자인 시스템 구축 방법과 그 중요성에 대해 알아봅니다.',
    imageUrl: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2',
    author: '김디자이너',
    date: '2023-06-15',
    tags: ['디자인', '프론트엔드', 'UI/UX']
  },
  {
    id: 2,
    title: '리액트 컴포넌트 최적화 기법',
    description: '리액트 애플리케이션의 성능을 향상시키기 위한 다양한 컴포넌트 최적화 기법을 소개합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    author: '박개발자',
    date: '2023-05-22',
    tags: ['React', '성능최적화', '프론트엔드']
  },
  {
    id: 3,
    title: '접근성 있는 웹 만들기',
    description: '모든 사용자가 웹 콘텐츠에 접근할 수 있도록 웹 접근성을 향상시키는 방법을 알아봅니다.',
    imageUrl: 'https://images.unsplash.com/photo-1584697964190-7427e2db2e8c',
    author: '이접근',
    date: '2023-04-10',
    tags: ['웹접근성', 'ARIA', '프론트엔드']
  },
  {
    id: 4,
    title: 'TypeScript로 안전한 코드 작성하기',
    description: 'TypeScript를 활용하여 타입 안전성을 보장하고 버그를 줄이는 방법에 대해 알아봅니다.',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    author: '정타입',
    date: '2023-03-18',
    tags: ['TypeScript', '프론트엔드', '개발팁']
  }
];

const CardExample: React.FC = () => {
  return (
    <div className="p-6 space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">기본 카드 스타일</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardBody>
              <h3 className="text-lg font-medium">기본 카드</h3>
              <p className="text-gray-600 mt-2">
                가장 기본적인 카드 컴포넌트입니다.
              </p>
            </CardBody>
          </Card>
          
          <Card variant="outlined">
            <CardBody>
              <h3 className="text-lg font-medium">아웃라인 카드</h3>
              <p className="text-gray-600 mt-2">
                테두리가 있는 스타일의 카드입니다.
              </p>
            </CardBody>
          </Card>
          
          <Card variant="filled">
            <CardBody>
              <h3 className="text-lg font-medium">배경 카드</h3>
              <p className="text-gray-600 mt-2">
                배경색이 있는 스타일의 카드입니다.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">카드 크기</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card size="sm">
            <CardBody>
              <h3 className="text-lg font-medium">작은 카드</h3>
              <p className="text-gray-600 mt-2">
                작은 패딩을 가진 카드입니다.
              </p>
            </CardBody>
          </Card>
          
          <Card size="md">
            <CardBody>
              <h3 className="text-lg font-medium">중간 카드</h3>
              <p className="text-gray-600 mt-2">
                중간 크기 패딩을 가진 카드입니다.
              </p>
            </CardBody>
          </Card>
          
          <Card size="lg">
            <CardBody>
              <h3 className="text-lg font-medium">큰 카드</h3>
              <p className="text-gray-600 mt-2">
                큰 패딩을 가진 카드입니다.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">상호작용 카드</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card isHoverable onClick={() => alert('카드가 클릭되었습니다!')}>
            <CardBody>
              <h3 className="text-lg font-medium">호버 효과 카드</h3>
              <p className="text-gray-600 mt-2">
                마우스를 올리면 확대 효과가 나타나는 카드입니다. 클릭해보세요!
              </p>
            </CardBody>
          </Card>
          
          <Card direction="row" className="items-center">
            <div className="w-1/3">
              <img 
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97" 
                alt="노트북 코딩" 
                className="w-full h-full object-cover rounded-l-lg"
              />
            </div>
            <CardBody className="w-2/3">
              <h3 className="text-lg font-medium">가로 방향 카드</h3>
              <p className="text-gray-600 mt-2">
                내용이 가로로 배치되는 카드입니다.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">복합 카드 (헤더, 본문, 푸터)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">카드 제목</h3>
              <p className="text-sm text-gray-500">부제목 또는 메타 정보</p>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">
                이것은 카드의 본문 영역입니다. 여기에 주요 내용이 들어갑니다.
                카드는 헤더, 본문, 푸터로 구성될 수 있으며, 다양한 정보를 구조적으로 표시할 수 있습니다.
              </p>
            </CardBody>
            <CardFooter>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">2023년 6월 15일</span>
                <Button size="sm" variant="primary">
                  더 보기
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          <Card>
            <CardImage 
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
              alt="노트북과 커피"
            />
            <CardBody>
              <h3 className="text-xl font-semibold">이미지가 포함된 카드</h3>
              <p className="text-gray-700 mt-2">
                카드 상단에 이미지가 포함된 컴포넌트입니다. 블로그 포스트나 제품 카드 등에 활용할 수 있습니다.
              </p>
            </CardBody>
            <CardFooter>
              <Button fullWidth>자세히 보기</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">카드 그리드 (블로그 스타일)</h2>
        <CardGrid columns={{ sm: 1, md: 2, lg: 2 }} gap="lg">
          {articles.map((article) => (
            <Card key={article.id} isHoverable>
              <CardImage 
                src={article.imageUrl} 
                alt={article.title}
                height="h-56"
              />
              <CardBody>
                <div className="flex gap-2 mb-2">
                  {article.tags.map((tag, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-xl font-bold">{article.title}</h3>
                <p className="text-gray-600 mt-2">{article.description}</p>
              </CardBody>
              <CardFooter divider>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <span className="ml-2 text-sm font-medium">{article.author}</span>
                  </div>
                  <span className="text-sm text-gray-500">{article.date}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </CardGrid>
      </section>
    </div>
  );
};

export default CardExample; 