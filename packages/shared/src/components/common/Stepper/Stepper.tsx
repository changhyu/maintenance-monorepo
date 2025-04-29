import React from 'react';
import { Step } from './Step';

export interface StepProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'complete' | 'current' | 'upcoming';
}

export interface StepperProps {
  steps: StepProps[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (index: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep,
  orientation = 'horizontal',
  size = 'md',
  onClick,
}) => {
  // 각 스텝에 상태 부여
  const stepsWithStatus: StepProps[] = steps.map((step, index) => ({
    ...step,
    status: 
      index < activeStep 
        ? 'complete' 
        : index === activeStep 
          ? 'current' 
          : 'upcoming',
  }));

  const containerClasses = orientation === 'vertical' 
    ? 'flex flex-col space-y-2' 
    : 'flex items-center';

  return (
    <div className={containerClasses}>
      {stepsWithStatus.map((step, index) => (
        <Step
          key={index}
          index={index}
          isLast={index === steps.length - 1}
          orientation={orientation}
          size={size}
          onClick={onClick ? () => onClick(index) : undefined}
          {...step}
        />
      ))}
    </div>
  );
}; 