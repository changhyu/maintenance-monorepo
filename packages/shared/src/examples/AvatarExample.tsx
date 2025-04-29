import React from 'react';
import { Avatar, AvatarGroup } from '../components/common/Avatar';

export const AvatarExample: React.FC = () => {
  // 아바타 샘플 데이터
  const sampleAvatars = [
    { id: 1, name: '홍길동', src: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: '김철수', src: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, name: '이영희', src: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, name: '박지민', src: 'https://i.pravatar.cc/150?img=4' },
    { id: 5, name: '최수진', src: 'https://i.pravatar.cc/150?img=5' },
    { id: 6, name: '정민준', src: 'https://i.pravatar.cc/150?img=6' },
    { id: 7, name: '윤서연', src: 'https://i.pravatar.cc/150?img=7' },
  ];

  // 이미지 없는 아바타 데이터
  const initialsAvatars = [
    { id: 1, name: '홍길동' },
    { id: 2, name: '김철수' },
    { id: 3, name: '이영희' },
    { id: 4, name: '박지민' },
    { id: 5, name: '최수진' },
  ];

  // 아바타 클릭 이벤트 핸들러
  const handleAvatarClick = (id: string | number) => {
    console.log(`아바타 ${id} 클릭됨`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">아바타 컴포넌트 예제</h1>
      
      {/* 기본 아바타 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">기본 아바타</h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=1" name="홍길동" />
            <span className="mt-2 text-sm">기본</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="김철수" />
            <span className="mt-2 text-sm">이미지 없음</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="이영희" bgColor="blue" />
            <span className="mt-2 text-sm">파란색 배경</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=2" borderRadius="lg" />
            <span className="mt-2 text-sm">둥근 모서리</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=3" borderRadius="none" />
            <span className="mt-2 text-sm">모서리 없음</span>
          </div>
        </div>
      </section>
      
      {/* 아바타 크기 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">아바타 크기</h2>
        <div className="flex items-end gap-4">
          <div className="flex flex-col items-center">
            <Avatar size="xs" src="https://i.pravatar.cc/150?img=1" />
            <span className="mt-2 text-sm">XS</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar size="sm" src="https://i.pravatar.cc/150?img=2" />
            <span className="mt-2 text-sm">SM</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar size="md" src="https://i.pravatar.cc/150?img=3" />
            <span className="mt-2 text-sm">MD</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar size="lg" src="https://i.pravatar.cc/150?img=4" />
            <span className="mt-2 text-sm">LG</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar size="xl" src="https://i.pravatar.cc/150?img=5" />
            <span className="mt-2 text-sm">XL</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar size="2xl" src="https://i.pravatar.cc/150?img=6" />
            <span className="mt-2 text-sm">2XL</span>
          </div>
        </div>
      </section>
      
      {/* 이니셜 아바타 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">이니셜 아바타</h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center">
            <Avatar name="홍길동" bgColor="gray" />
            <span className="mt-2 text-sm">회색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="김철수" bgColor="red" />
            <span className="mt-2 text-sm">빨간색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="이영희" bgColor="yellow" />
            <span className="mt-2 text-sm">노란색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="박지민" bgColor="green" />
            <span className="mt-2 text-sm">녹색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="최수진" bgColor="blue" />
            <span className="mt-2 text-sm">파란색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="정민준" bgColor="indigo" />
            <span className="mt-2 text-sm">인디고</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="윤서연" bgColor="purple" />
            <span className="mt-2 text-sm">보라색</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="장하은" bgColor="pink" />
            <span className="mt-2 text-sm">분홍색</span>
          </div>
        </div>
      </section>
      
      {/* 상태 표시 아바타 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">상태 표시 아바타</h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=1" status="online" />
            <span className="mt-2 text-sm">온라인</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=2" status="offline" />
            <span className="mt-2 text-sm">오프라인</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=3" status="away" />
            <span className="mt-2 text-sm">자리비움</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=4" status="busy" />
            <span className="mt-2 text-sm">바쁨</span>
          </div>
        </div>
      </section>
      
      {/* 테두리 아바타 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">테두리 아바타</h2>
        <div className="flex flex-wrap gap-6 bg-gray-100 p-4 rounded-lg">
          <div className="flex flex-col items-center">
            <Avatar src="https://i.pravatar.cc/150?img=1" hasBorder />
            <span className="mt-2 text-sm">이미지</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar name="홍길동" bgColor="blue" hasBorder />
            <span className="mt-2 text-sm">이니셜</span>
          </div>
        </div>
      </section>
      
      {/* 클릭 가능한 아바타 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">클릭 가능한 아바타</h2>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center">
            <Avatar 
              src="https://i.pravatar.cc/150?img=1" 
              onClick={() => alert('아바타 클릭됨')} 
            />
            <span className="mt-2 text-sm">클릭해보세요</span>
          </div>
        </div>
      </section>
      
      {/* 아바타 그룹 - 기본 */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">아바타 그룹</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-medium mb-2">기본 그룹</h3>
            <AvatarGroup avatars={sampleAvatars} />
          </div>
          
          <div>
            <h3 className="font-medium mb-2">크기 설정</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm mr-2">Small:</span>
                <AvatarGroup avatars={sampleAvatars} size="sm" />
              </div>
              <div>
                <span className="text-sm mr-2">Medium:</span>
                <AvatarGroup avatars={sampleAvatars} size="md" />
              </div>
              <div>
                <span className="text-sm mr-2">Large:</span>
                <AvatarGroup avatars={sampleAvatars} size="lg" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">최대 개수 제한</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm mr-2">3개 제한:</span>
                <AvatarGroup avatars={sampleAvatars} max={3} />
              </div>
              <div>
                <span className="text-sm mr-2">5개 제한:</span>
                <AvatarGroup avatars={sampleAvatars} max={5} />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">겹침 정도</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm mr-2">작은 간격:</span>
                <AvatarGroup avatars={sampleAvatars} spacing="sm" />
              </div>
              <div>
                <span className="text-sm mr-2">중간 간격:</span>
                <AvatarGroup avatars={sampleAvatars} spacing="md" />
              </div>
              <div>
                <span className="text-sm mr-2">큰 간격:</span>
                <AvatarGroup avatars={sampleAvatars} spacing="lg" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">더보기 색상</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm mr-2">회색:</span>
                <AvatarGroup avatars={sampleAvatars} max={3} moreAvatarBgColor="gray" />
              </div>
              <div>
                <span className="text-sm mr-2">파란색:</span>
                <AvatarGroup avatars={sampleAvatars} max={3} moreAvatarBgColor="blue" />
              </div>
              <div>
                <span className="text-sm mr-2">인디고:</span>
                <AvatarGroup avatars={sampleAvatars} max={3} moreAvatarBgColor="indigo" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">이니셜 아바타 그룹</h3>
            <AvatarGroup avatars={initialsAvatars} />
          </div>
          
          <div>
            <h3 className="font-medium mb-2">클릭 가능한 아바타 그룹</h3>
            <AvatarGroup 
              avatars={sampleAvatars} 
              max={4} 
              onAvatarClick={handleAvatarClick} 
            />
            <p className="text-sm mt-2 text-gray-500">콘솔에서 클릭 이벤트 확인</p>
          </div>
        </div>
      </section>
    </div>
  );
}; 