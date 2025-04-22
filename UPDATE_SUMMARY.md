# 패키지 업데이트 요약 (2025-04-22)

## 주요 업데이트 내용

이 문서는 monorepo 프로젝트의 주요 의존성 업데이트 및 변경 사항을 요약합니다.

### 주요 패키지 버전 업데이트

#### 프론트엔드 및 핵심 의존성
- **React**: 18.x → 19.1.0 (메이저 버전 업그레이드)
- **React DOM**: 18.x → 19.1.0
- **React Router DOM**: 6.x → 7.5.1
- **TypeScript**: 5.1.x → 5.4.2
- **Vite**: 5.x → 6.3.2
- **ESLint**: 8.x → 9.25.1
- **Prettier**: 3.x → 3.5.3
- **@typescript-eslint**: 7.x → 8.31.0
- **concurrently**: 7.x → 9.1.2

#### 백엔드 및 인프라 의존성
- **Express**: 4.x → 5.1.0
- **Prisma**: 5.x → 6.6.0
- **Commander**: 최신 API로 업데이트
- **cookie-parser**: 1.4.7
- **express-session**: 1.18.1
- **jspdf**: 2.5.x → 3.0.1

#### 모바일 의존성
- **Expo**: 50.x → 52.0.46
- **React Native**: 0.73.x → 0.79.1
- **React Native Web**: 0.19.x → 0.20.0
- **Expo WebPack Config**: 최신 버전 (19.0.1)

### 주요 변경 사항

#### API 게이트웨이
- Express 5.0 업데이트로 인한 타입 정의 변경
- app 변수에 명시적 타입 주석 추가 (`express.Application` 타입)

```typescript
// 기존 코드
const app = express();

// 변경 코드
const app: express.Application = express();
```

#### 모바일 앱
- Expo 52로 업데이트
- React 19로 업데이트
- 웹 내보내기 스크립트 변경으로 인한 빌드 호환성 이슈 해결

#### 보안 모듈
- Commander API 업데이트 (최신 버전 12.0.0)
- import 방식 변경: `import { program } from 'commander'` → `import { Command } from 'commander'`
- 명령줄 옵션 생성 방식 업데이트

```typescript
// 기존 코드
import { program } from 'commander';
// ... options ...
program.parse(process.argv);

// 변경 코드
import { Command } from 'commander';
const program = new Command();
// ... options ...
program.parse(process.argv);
```

#### 데이터베이스 모듈
- Prisma 6.6.0 업데이트로 인한 타입 변경 사항 처리
- MaintenanceRepository의 create 메서드 변경:

```typescript
// 기존 코드
const { parts, ...maintenanceData } = data;
const maintenanceRecord = await tx.maintenanceRecord.create({
  data: {
    ...maintenanceData,
    vehicle: {
      connect: { id: maintenanceData.vehicleID }
    }
  }
});

// 변경 코드
const { parts, vehicleID, ...maintenanceData } = data;
const maintenanceRecord = await tx.maintenanceRecord.create({
  data: {
    ...maintenanceData,
    vehicle: {
      connect: { id: vehicleID }
    }
  }
});
```

### 남은 이슈

- 14개의 취약점(3개 중간 심각도, 11개 높은 심각도)이 여전히 존재합니다.
- 일부 패키지는 더 이상 지원되지 않는다는 경고가 있습니다 (deprecated).
- react-scripts를 최신 버전으로 업데이트하는 것이 권장됩니다.

### 다음 단계 권장 사항

1. `npm audit fix --force`를 실행하여 더 많은 취약점을 해결할 수 있습니다.
2. react-scripts 패키지를 업데이트하거나 대체할 수 있는 더 현대적인 대안을 고려하세요.
3. 더 이상 지원되지 않는 패키지를 최신 대안으로 교체하는 것이 좋습니다.
4. 프로젝트의 통합 테스트를 실행하여 업데이트된 의존성과 호환성을 확인하세요.

---

*업데이트 날짜: 2025년 4월 22일*