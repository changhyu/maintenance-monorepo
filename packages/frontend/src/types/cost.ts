export interface Cost {
  id: string;
  vehicleId: string;
  type: 'fuel' | 'maintenance' | 'insurance' | 'toll' | 'parking' | 'other';
  amount: number;
  date: Date;
  description: string;
  category: string;
  receipt?: string;
  location?: {
    name: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  odometer?: number;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
  notes?: string;
}

export interface CostSummary {
  total: number;
  byCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  byVehicle: {
    vehicleId: string;
    amount: number;
    percentage: number;
  }[];
  byMonth: {
    month: string;
    amount: number;
  }[];
  trends: {
    period: string;
    amount: number;
    change: number;
  }[];
}

export interface CostAnalysis {
  averageCostPerKilometer: number;
  fuelEfficiency: number;
  maintenanceCostTrend: number;
  costSavingsOpportunities: {
    description: string;
    potentialSavings: number;
    implementation: string;
  }[];
  budgetVsActual: {
    category: string;
    budget: number;
    actual: number;
    variance: number;
  }[];
} 