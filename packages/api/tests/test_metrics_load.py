import asyncio
import aiohttp
import random
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/test-metrics"
ENDPOINTS = [
    "/success",
    "/slow",
    "/error",
    "/database",
    "/cache"
]

async def make_request(session, endpoint):
    """단일 요청 실행"""
    try:
        start_time = time.time()
        async with session.get(f"{BASE_URL}{endpoint}") as response:
            elapsed = time.time() - start_time
            status = response.status
            print(f"{datetime.now().strftime('%H:%M:%S')} - {endpoint} - Status: {status} - Time: {elapsed:.2f}s")
    except Exception as e:
        print(f"Error calling {endpoint}: {str(e)}")

async def load_test():
    """로드 테스트 실행"""
    async with aiohttp.ClientSession() as session:
        while True:
            # 무작위로 엔드포인트 선택
            endpoint = random.choice(ENDPOINTS)
            # 요청 실행
            await make_request(session, endpoint)
            # 0.5초에서 2초 사이 대기
            await asyncio.sleep(random.uniform(0.5, 2))

if __name__ == "__main__":
    print("로드 테스트를 시작합니다. Ctrl+C로 중단할 수 있습니다.")
    try:
        asyncio.run(load_test())
    except KeyboardInterrupt:
        print("\n로드 테스트를 종료합니다.") 