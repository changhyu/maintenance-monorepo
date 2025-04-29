import React, { useState, useCallback } from 'react';
import { useIntersectionObserver, useInView, useInfiniteScroll } from '../hooks/useIntersectionObserver';
import { Badge } from '../components/common/Badge/Badge';
import { Card, CardBody } from '../components/common/Card';

const LazyImage = ({ src, alt, className = '' }: { src: string; alt: string; className?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({ threshold: 0.1, once: true });
  
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {isIntersecting ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

const InViewSection = ({ id, bgColor = 'bg-blue-100' }: { id: number; bgColor?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const callback = useCallback((isIntersecting: boolean) => {
    if (isIntersecting) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);
  
  const ref = useInView<HTMLDivElement>(callback, { threshold: 0.5 });
  
  return (
    <div 
      ref={ref}
      className={`h-64 my-10 rounded-lg transition-all duration-500 ${bgColor} ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
      } flex items-center justify-center`}
    >
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">섹션 {id}</h3>
        <p>현재 상태: {isVisible ? '화면에 보임' : '화면에서 벗어남'}</p>
        {isVisible && <Badge variant="success" size="md">현재 보는 중</Badge>}
      </div>
    </div>
  );
};

const InfiniteScrollExample = () => {
  const [items, setItems] = useState<number[]>(Array.from({ length: 10 }, (_, i) => i + 1));
  const [hasMore, setHasMore] = useState(true);
  
  const loadMoreItems = async () => {
    // 실제 API 호출을 시뮬레이션하기 위한 지연
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const currentLength = items.length;
    const nextItems = Array.from(
      { length: 5 }, 
      (_, i) => currentLength + i + 1
    );
    
    setItems(prev => [...prev, ...nextItems]);
    
    // 30개 아이템이 로드되면 더 이상 로드하지 않음
    if (items.length + nextItems.length >= 30) {
      setHasMore(false);
    }
  };
  
  const [loaderRef, isLoading] = useInfiniteScroll<HTMLDivElement>(
    loadMoreItems,
    { rootMargin: '100px', enabled: hasMore }
  );
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">무한 스크롤 예제</h2>
      <p className="text-gray-600">아래로 스크롤하면 자동으로 항목이 로드됩니다.</p>
      
      <div className="space-y-4">
        {items.map(item => (
          <Card key={item}>
            <CardBody>
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {item}
                </div>
                <div>
                  <h3 className="font-medium">항목 {item}</h3>
                  <p className="text-gray-600 text-sm">무한 스크롤로 로드된 항목입니다.</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        
        <div ref={loaderRef} className="py-4 text-center">
          {isLoading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : hasMore ? (
            <p className="text-gray-500">스크롤하여 더 로드하기</p>
          ) : (
            <p className="text-gray-500">모든 항목을 로드했습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const IntersectionObserverExample = () => {
  return (
    <div className="space-y-12 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Intersection Observer 예제</h1>
        <p className="text-gray-600">이 페이지는 다양한 방식으로 IntersectionObserver를 사용하는 예제를 보여줍니다.</p>
      </div>
      
      <section>
        <h2 className="text-xl font-bold mb-4">1. 지연 이미지 로딩 (Lazy Loading)</h2>
        <p className="text-gray-600 mb-4">이미지는 뷰포트에 들어올 때만 로드됩니다.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
            'https://images.unsplash.com/photo-1511884642898-4c92249e20b6',
            'https://images.unsplash.com/photo-1540206395-68808572332f'
          ].map((url, index) => (
            <LazyImage 
              key={index} 
              src={`${url}?w=500&h=300&auto=format`} 
              alt={`풍경 이미지 ${index + 1}`}
              className="h-48 rounded-lg shadow-md"
            />
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-bold mb-4">2. 요소 가시성 감지</h2>
        <p className="text-gray-600 mb-4">각 섹션은 화면에 50% 이상 보일 때 시각적으로 강조됩니다.</p>
        
        <InViewSection id={1} bgColor="bg-blue-100" />
        <InViewSection id={2} bgColor="bg-green-100" />
        <InViewSection id={3} bgColor="bg-purple-100" />
        <InViewSection id={4} bgColor="bg-yellow-100" />
      </section>
      
      <section>
        <h2 className="text-xl font-bold mb-4">3. 무한 스크롤</h2>
        <p className="text-gray-600 mb-4">페이지 하단에 도달하면 자동으로 새 항목이 로드됩니다.</p>
        
        <InfiniteScrollExample />
      </section>
      
      <div className="h-24"></div>
    </div>
  );
};