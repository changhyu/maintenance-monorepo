import { ApiClient } from '../client';

// 텔레메트리 값 타입 정의
export type TelemetryValue = number | string | boolean | Record<string, unknown>;
// 텔레메트리 메타데이터 타입 정의
export type TelemetryMetadata = Record<string, unknown>;
// 진단 데이터 타입 정의
export type DiagnosticDataType = Record<string, unknown>;
// 소프트웨어 업데이트 정보 타입 정의
export interface SoftwareUpdate {
  id: string;
  vehicleId: string;
  version: string;
  updateDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  description?: string;
  changelogs?: string[];
  fileSize?: number;
  installDuration?: number;
  requiredBy?: string;
  installBy?: string;
  [key: string]: unknown;
}

export enum TelemetryType {
  ENGINE = 'ENGINE',
  BATTERY = 'BATTERY',
  FUEL = 'FUEL',
  TIRE = 'TIRE',
  TRANSMISSION = 'TRANSMISSION',
  BRAKE = 'BRAKE',
  ODOMETER = 'ODOMETER',
  GPS = 'GPS',
  TEMPERATURE = 'TEMPERATURE',
  DIAGNOSTICS = 'DIAGNOSTICS'
}

export enum TelemetrySeverity {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface TelemetryData {
  id: string;
  vehicleId: string;
  timestamp: string;
  type: TelemetryType;
  value: TelemetryValue;
  unit?: string;
  severity?: TelemetrySeverity;
  metadata?: TelemetryMetadata;
}

export interface TelemetryStats {
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  medianValue?: number;
  warningCount: number;
  criticalCount: number;
  lastReading?: {
    value: TelemetryValue;
    timestamp: string;
    severity: TelemetrySeverity;
  };
}

export interface TelemetryFilter {
  vehicleId?: string;
  types?: TelemetryType | TelemetryType[];
  startDate?: string;
  endDate?: string;
  severity?: TelemetrySeverity | TelemetrySeverity[];
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DiagnosticCode {
  code: string;
  description: string;
  affectedSystem: string;
  possibleCauses: string[];
  recommendedActions: string[];
  severity: TelemetrySeverity;
}

export interface DiagnosticEvent {
  id: string;
  vehicleId: string;
  timestamp: string;
  code: string;
  description: string;
  isActive: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  diagnosticData?: DiagnosticDataType;
}

export interface VehicleLocation {
  vehicleId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  altitude?: number;
  address?: string;
}

export interface TelemetryAlertRule {
  id: string;
  vehicleId?: string;
  type: TelemetryType;
  condition: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  value: number;
  severity: TelemetrySeverity;
  notifyUsers: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryAlert {
  id: string;
  vehicleId: string;
  ruleId: string;
  timestamp: string;
  type: TelemetryType;
  value: TelemetryValue;
  severity: TelemetrySeverity;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface CreateTelemetryAlertRuleRequest {
  vehicleId?: string;
  type: TelemetryType;
  condition: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  value: number;
  severity: TelemetrySeverity;
  notifyUsers: string[];
}

export interface UpdateTelemetryAlertRuleRequest {
  condition?: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
  value?: number;
  severity?: TelemetrySeverity;
  notifyUsers?: string[];
  isActive?: boolean;
}

export class TelemetryService {
  private client: ApiClient;
  private basePath = '/telemetry';

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  // 특정 차량의 텔레메트리 데이터 조회
  async getVehicleTelemetry(vehicleId: string, filter?: Omit<TelemetryFilter, 'vehicleId'>): Promise<TelemetryData[]> {
    return this.client.get<TelemetryData[]>(`/vehicles/${vehicleId}/telemetry`, { params: filter });
  }

  // 특정 차량의 특정 유형 텔레메트리 데이터 조회
  async getVehicleTelemetryByType(vehicleId: string, type: TelemetryType, filter?: Omit<TelemetryFilter, 'vehicleId' | 'types'>): Promise<TelemetryData[]> {
    return this.client.get<TelemetryData[]>(`/vehicles/${vehicleId}/telemetry/${type}`, { params: filter });
  }

  // 텔레메트리 데이터 통계 조회
  async getVehicleTelemetryStats(vehicleId: string, type: TelemetryType, filter?: { startDate?: string; endDate?: string }): Promise<TelemetryStats> {
    return this.client.get<TelemetryStats>(`/vehicles/${vehicleId}/telemetry/${type}/stats`, { params: filter });
  }

  // 여러 차량의 텔레메트리 데이터 조회
  async getMultiVehicleTelemetry(vehicleIds: string[], filter?: Omit<TelemetryFilter, 'vehicleId'>): Promise<Record<string, TelemetryData[]>> {
    return this.client.post<Record<string, TelemetryData[]>>(`${this.basePath}/vehicles`, { vehicleIds, ...filter });
  }

  // 차량 진단 코드 조회
  async getDiagnosticCodes(filter?: { code?: string; affectedSystem?: string; severity?: TelemetrySeverity }): Promise<DiagnosticCode[]> {
    return this.client.get<DiagnosticCode[]>(`${this.basePath}/diagnostic-codes`, { params: filter });
  }

  // 특정 차량의 진단 이벤트 조회
  async getVehicleDiagnosticEvents(vehicleId: string, filter?: { isActive?: boolean; startDate?: string; endDate?: string }): Promise<DiagnosticEvent[]> {
    return this.client.get<DiagnosticEvent[]>(`/vehicles/${vehicleId}/diagnostics`, { params: filter });
  }

  // 진단 이벤트 해결 처리
  async resolveDiagnosticEvent(vehicleId: string, eventId: string, resolutionData: { resolvedBy: string; resolutionNotes?: string }): Promise<DiagnosticEvent> {
    return this.client.post<DiagnosticEvent>(`/vehicles/${vehicleId}/diagnostics/${eventId}/resolve`, resolutionData);
  }

  // 차량 위치 조회
  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation> {
    return this.client.get<VehicleLocation>(`/vehicles/${vehicleId}/location`);
  }

  // 차량 위치 이력 조회
  async getVehicleLocationHistory(vehicleId: string, filter: { startDate: string; endDate: string; limit?: number }): Promise<VehicleLocation[]> {
    return this.client.get<VehicleLocation[]>(`/vehicles/${vehicleId}/location/history`, { params: filter });
  }

  // 여러 차량의 현재 위치 조회
  async getMultiVehicleLocations(vehicleIds: string[]): Promise<Record<string, VehicleLocation>> {
    return this.client.post<Record<string, VehicleLocation>>(`${this.basePath}/locations`, { vehicleIds });
  }

  // 텔레메트리 알림 규칙 조회
  async getTelemetryAlertRules(filter?: { vehicleId?: string; type?: TelemetryType; isActive?: boolean }): Promise<TelemetryAlertRule[]> {
    return this.client.get<TelemetryAlertRule[]>(`${this.basePath}/alert-rules`, { params: filter });
  }

  // 텔레메트리 알림 규칙 생성
  async createTelemetryAlertRule(rule: CreateTelemetryAlertRuleRequest): Promise<TelemetryAlertRule> {
    return this.client.post<TelemetryAlertRule>(`${this.basePath}/alert-rules`, rule);
  }

  // 텔레메트리 알림 규칙 업데이트
  async updateTelemetryAlertRule(ruleId: string, rule: UpdateTelemetryAlertRuleRequest): Promise<TelemetryAlertRule> {
    return this.client.put<TelemetryAlertRule>(`${this.basePath}/alert-rules/${ruleId}`, rule);
  }

  // 텔레메트리 알림 규칙 삭제
  async deleteTelemetryAlertRule(ruleId: string): Promise<void> {
    return this.client.delete(`${this.basePath}/alert-rules/${ruleId}`);
  }

  // 텔레메트리 알림 조회
  async getTelemetryAlerts(filter?: { vehicleId?: string; ruleId?: string; acknowledged?: boolean; startDate?: string; endDate?: string }): Promise<TelemetryAlert[]> {
    return this.client.get<TelemetryAlert[]>(`${this.basePath}/alerts`, { params: filter });
  }

  // 텔레메트리 알림 확인 처리
  async acknowledgeTelemetryAlert(alertId: string, acknowledgeData: { acknowledgedBy: string }): Promise<TelemetryAlert> {
    return this.client.post<TelemetryAlert>(`${this.basePath}/alerts/${alertId}/acknowledge`, acknowledgeData);
  }

  // 차량의 소프트웨어 업데이트 이력 조회
  async getVehicleSoftwareUpdateHistory(vehicleId: string): Promise<SoftwareUpdate[]> {
    return this.client.get<SoftwareUpdate[]>(`/vehicles/${vehicleId}/software-updates`);
  }
} 