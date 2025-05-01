import { RouteInfo } from '../services/NavigationService';

export interface NavigationRoute {
  id: string;
  title: string;
  timestamp: number;
  routeInfo: RouteInfo;
  description?: string;
}