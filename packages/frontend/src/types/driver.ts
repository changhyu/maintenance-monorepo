export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: DriverStatus;
  vehicleId?: string;
  createdAt: Date;
  updatedAt: Date;
  address?: string;
  safetyScore?: number;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
}

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED'
}

export interface DriverStats {
  totalTrips: number;
  totalDistance: number;
  averageRating: number;
  safetyScore: number;
  fuelEfficiency: number;
  incidentCount: number;
  completedMaintenanceChecks: number;
  lastActiveDate: Date;
}

export interface DriverFilters {
  status?: DriverStatus;
  vehicleId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  type: string;
  url: string;
  uploadedAt: Date;
  expiryDate?: Date;
  status: 'VALID' | 'EXPIRED' | 'PENDING_REVIEW';
}

export interface PaginatedDrivers {
  items: Driver[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DriverCreate = Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>;

export type DriverUpdate = Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>>; 