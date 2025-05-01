import { ReportOptions } from '../context/ReportContext';

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  options: ReportOptions;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
  createdBy: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  fields: string[];
  order: number;
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  defaultValue?: any;
  order: number;
}

export interface TemplateGroup {
  id: string;
  name: string;
  templates: string[];
  order: number;
}

export interface TemplateSettings {
  defaultFormat: 'pdf' | 'csv' | 'excel';
  defaultGroupBy: 'none' | 'status' | 'serviceType' | 'priority' | 'technician';
  defaultFields: {
    status: boolean;
    serviceType: boolean;
    priority: boolean;
    duration: boolean;
    cost: boolean;
    location: boolean;
    notes: boolean;
    parts: boolean;
  };
  autoSave: boolean;
  lastUsedTemplate?: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customCron?: string;
  timeOfDay: string; // HH:mm 형식
  daysOfWeek?: number[]; // 0-6, 주간 스케줄링용
  dayOfMonth?: number; // 1-31, 월간 스케줄링용
  recipients: string[]; // 이메일 주소 목록
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notifyOnCompletion: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface ScheduleResult {
  id: string;
  scheduleId: string;
  status: 'success' | 'failure' | 'pending';
  startTime: Date;
  endTime?: Date;
  error?: string;
  reportUrl?: string;
  retryCount: number;
}

export interface ScheduleNotification {
  id: string;
  scheduleId: string;
  type: 'success' | 'failure' | 'retry';
  message: string;
  createdAt: Date;
  read: boolean;
}

export interface ShareSettings {
  allowPublicAccess: boolean;
  expirationDate?: Date;
  password?: string;
  allowDownload: boolean;
  allowPrint: boolean;
  allowEdit: boolean;
  watermark?: string;
}

export interface ShareLink {
  id: string;
  reportId: string;
  url: string;
  settings: ShareSettings;
  createdAt: Date;
  createdBy: string;
  accessCount: number;
  lastAccessed?: Date;
}

export interface SharePermission {
  id: string;
  reportId: string;
  userId: string;
  permissions: {
    view: boolean;
    download: boolean;
    print: boolean;
    edit: boolean;
    share: boolean;
  };
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
}

export interface ShareActivity {
  id: string;
  reportId: string;
  userId?: string;
  action: 'view' | 'download' | 'print' | 'edit' | 'share';
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
  location?: string;
}

export interface ShareRecipient {
  id: string;
  reportId: string;
  email: string;
  name?: string;
  message?: string;
  sentAt: Date;
  viewedAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  notificationPreference: 'none' | 'onAccess' | 'daily' | 'weekly';
}

export interface ReportMetrics {
  totalCount: number;
  totalDuration: number;
  totalCost: number;
  averageDuration: number;
  averageCost: number;
  completionRate: number;
  statusDistribution: {
    [status: string]: number;
  };
  priorityDistribution: {
    [priority: string]: number;
  };
  serviceTypeDistribution: {
    [type: string]: number;
  };
  technicianPerformance: {
    [technicianId: string]: {
      totalTasks: number;
      completedTasks: number;
      averageDuration: number;
      averageCost: number;
      rating: number;
    };
  };
  timeDistribution: {
    hourly: { [hour: string]: number };
    daily: { [day: string]: number };
    monthly: { [month: string]: number };
  };
  locationHeatmap: {
    [location: string]: number;
  };
  trends: {
    duration: {
      [date: string]: number;
    };
    cost: {
      [date: string]: number;
    };
    volume: {
      [date: string]: number;
    };
  };
}

export interface AnalyticsFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: string[];
  priority?: string[];
  serviceType?: string[];
  technician?: string[];
  location?: string[];
  costRange?: {
    min: number;
    max: number;
  };
  durationRange?: {
    min: number;
    max: number;
  };
}

export interface AnalyticsConfig {
  metrics: {
    [key: string]: boolean;
  };
  groupBy: 'none' | 'status' | 'priority' | 'serviceType' | 'technician' | 'location';
  chartType: 'line' | 'bar' | 'pie' | 'heatmap';
  timeUnit: 'hour' | 'day' | 'week' | 'month';
  showTrends: boolean;
  compareWithPrevious: boolean;
  exportFormat: 'pdf' | 'excel' | 'csv';
}

export interface AnalyticsResult {
  metrics: ReportMetrics;
  filter: AnalyticsFilter;
  config: AnalyticsConfig;
  generatedAt: Date;
}

export interface SearchFilter {
  keyword: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  status?: string[];
  priority?: string[];
  serviceType?: string[];
  technician?: string[];
  location?: string[];
  costRange?: {
    min: number;
    max: number;
  };
  durationRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  sortBy?: 'date' | 'status' | 'priority' | 'cost' | 'duration';
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface SearchResult {
  items: any[];
  total: number;
  page: number;
  totalPages: number;
  filter: SearchFilter;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filter: SearchFilter;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDefault?: boolean;
  lastUsed?: Date;
} 