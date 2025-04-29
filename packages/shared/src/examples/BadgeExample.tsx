import React, { useState } from 'react';
import {
  Badge,
  BadgeContainer,
  Button,
  Card,
  CardBody,
  CardHeader,
} from '../components/common';

const BadgeExample: React.FC = () => {
  const [notificationCount, setNotificationCount] = useState(5);
  const [badges, setBadges] = useState<string[]>(['태그1', '태그2', '태그3']);

  // 알림 카운트 증가
  const increaseCount = () => {
    setNotificationCount((prev) => prev + 1);
  };

  // 알림 카운트 감소
  const decreaseCount = () => {
    setNotificationCount((prev) => Math.max(0, prev - 1));
  };

  // 알림 초기화
  const resetCount = () => {
    setNotificationCount(0);
  };

  // 배지 제거 핸들러
  const handleRemoveBadge = (index: number) => {
    setBadges((prev) => prev.filter((_, i) => i !== index));
  };

  // 배지 추가 핸들러
  const handleAddBadge = () => {
    setBadges((prev) => [...prev, `태그${prev.length + 1}`]);
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">배지 컴포넌트 예제</h1>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">기본 배지</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Badge variant="primary">기본</Badge>
              <Badge variant="secondary">보조</Badge>
              <Badge variant="success">성공</Badge>
              <Badge variant="warning">경고</Badge>
              <Badge variant="danger">위험</Badge>
              <Badge variant="info">정보</Badge>
              <Badge variant="light">밝은</Badge>
              <Badge variant="dark">어두운</Badge>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">다양한 크기</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Badge size="xs" variant="primary">
                  아주 작음
                </Badge>
                <Badge size="sm" variant="primary">
                  작음
                </Badge>
                <Badge size="md" variant="primary">
                  중간
                </Badge>
                <Badge size="lg" variant="primary">
                  큼
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">다양한 모양</h3>
              <div className="flex flex-wrap gap-4">
                <Badge shape="rounded" variant="primary">
                  기본 모서리
                </Badge>
                <Badge shape="pill" variant="primary">
                  알약형
                </Badge>
                <Badge
                  shape="circle"
                  variant="primary"
                  className="h-8 w-8 p-0"
                  icon={
                    <span className="text-sm font-medium">
                      {notificationCount}
                    </span>
                  }
                >
                  {notificationCount}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">아이콘이 있는 배지</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Badge
                variant="primary"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              >
                정보
              </Badge>

              <Badge
                variant="success"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                }
              >
                성공
              </Badge>

              <Badge
                variant="warning"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                    />
                  </svg>
                }
              >
                주의
              </Badge>

              <Badge
                variant="danger"
                iconPosition="right"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                }
              >
                삭제
              </Badge>
            </div>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">배지 컨테이너</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-6">
              <BadgeContainer
                badge={
                  <Badge
                    shape="circle"
                    variant="danger"
                    className="h-5 w-5 p-0"
                    icon={<span className="text-xs">{notificationCount}</span>}
                  >
                    {notificationCount}
                  </Badge>
                }
              >
                <Button>알림</Button>
              </BadgeContainer>

              <BadgeContainer
                badge={
                  <Badge
                    shape="circle"
                    variant="success"
                    className="h-3 w-3 p-0"
                  />
                }
                position="bottom-right"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold">A</span>
                </div>
              </BadgeContainer>

              <BadgeContainer
                badge={<Badge variant="warning">신규</Badge>}
                position="top-left"
              >
                <div className="border p-4 rounded bg-white">
                  <p>새로운 기능</p>
                </div>
              </BadgeContainer>

              <BadgeContainer
                badge={
                  <Badge shape="pill" variant="primary">
                    {notificationCount > 0 ? notificationCount : '없음'}
                  </Badge>
                }
                position="bottom-left"
              >
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </BadgeContainer>
            </div>

            <div className="mt-6">
              <div className="flex gap-2 mb-4">
                <Button onClick={increaseCount} size="sm">
                  증가
                </Button>
                <Button onClick={decreaseCount} size="sm" variant="secondary">
                  감소
                </Button>
                <Button onClick={resetCount} size="sm" variant="danger">
                  초기화
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">제거 가능한 배지</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    variant="primary"
                    shape="pill"
                    removable
                    onRemove={() => handleRemoveBadge(index)}
                  >
                    {badge}
                  </Badge>
                ))}
              </div>

              <Button onClick={handleAddBadge} size="sm">
                배지 추가
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">클릭 가능한 배지</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="primary"
                onClick={() => alert('클릭됨: 기본 배지')}
                shape="pill"
              >
                클릭하세요
              </Badge>
              <Badge
                variant="success"
                onClick={() => alert('클릭됨: 성공 배지')}
                shape="pill"
                icon={
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                }
              >
                확인
              </Badge>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
};

export default BadgeExample; 