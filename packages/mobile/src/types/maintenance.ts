export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  vehicleId?: string;
  technicianId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  parts?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  estimatedDuration?: number; // 분 단위
  actualDuration?: number; // 분 단위
  cost?: number;
  location?: {
    name: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  attachments?: {
    id: string;
    type: 'image' | 'document' | 'other';
    url: string;
    name: string;
  }[];
  history?: {
    timestamp: string;
    action: string;
    userId: string;
    details?: string;
  }[];
}

export interface MaintenanceReservation {
  id: string;
  vehicleId: string;
  customerId: string;
  technicianId?: string;
  serviceType: 'regular' | 'emergency' | 'inspection' | 'repair';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  estimatedDuration: number; // 분 단위
  actualDuration?: number; // 분 단위
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  location?: {
    name: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  parts?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  cost?: number;
  attachments?: {
    id: string;
    type: 'image' | 'document' | 'other';
    url: string;
    name: string;
  }[];
  history?: {
    timestamp: string;
    action: string;
    userId: string;
    details?: string;
  }[];
} 