// TypeScript declaration for @heroicons/react modules
declare module '@heroicons/react/outline' {
  import { ComponentType, SVGProps } from 'react';
  
  // 모든 아이콘 컴포넌트에 대한 타입 정의
  export const HomeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const TruckIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const WrenchIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const UserGroupIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const ChartBarIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const DocumentTextIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const CogIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const MenuIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const XIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const BeakerIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const BellIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const CalendarIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const ClipboardIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const CurrencyDollarIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const UserIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const UsersIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const SearchIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const PlusIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const MinusIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const ExclamationIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const CheckIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const PencilIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const TrashIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const DotsVerticalIcon: ComponentType<SVGProps<SVGSVGElement>>;
  
  // 더 많은 아이콘들에 대한 타입 정의도 필요하면 추가할 수 있습니다
}

// 필요한 경우 다른 heroicons 경로에 대한 타입 정의도 추가
declare module '@heroicons/react/solid' {
  import { ComponentType, SVGProps } from 'react';
  
  export const HomeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const TruckIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const WrenchIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const UserGroupIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const ChartBarIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const DocumentTextIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const CogIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const UserCircleIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const LogoutIcon: ComponentType<SVGProps<SVGSVGElement>>;
  export const BellIcon: ComponentType<SVGProps<SVGSVGElement>>;
  // 다른 아이콘들도 필요에 따라 추가할 수 있습니다
}

declare module '@heroicons/react/24/outline' {
  import { ComponentType, SVGProps } from 'react';
  export * from '@heroicons/react/outline';
}

declare module '@heroicons/react/24/solid' {
  import { ComponentType, SVGProps } from 'react';
  export * from '@heroicons/react/solid';
}