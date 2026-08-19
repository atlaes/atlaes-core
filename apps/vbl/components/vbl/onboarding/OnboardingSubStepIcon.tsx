'use client';

import {
  BadgeCheck,
  Contact as IdCard,
  FileText,
  Landmark,
  MapPin,
  PenLine,
  ShieldPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type OnboardingSubStepIconName =
  | 'user'
  | 'card'
  | 'location'
  | 'bank'
  | 'document'
  | 'confirm'
  | 'pen'
  | 'health';

const ICONS: Record<OnboardingSubStepIconName, LucideIcon> = {
  user: UserRound,
  card: IdCard,
  location: MapPin,
  bank: Landmark,
  document: FileText,
  confirm: BadgeCheck,
  pen: PenLine,
  health: ShieldPlus,
};

interface OnboardingSubStepIconProps {
  subStepId: string;
  icon: OnboardingSubStepIconName | string;
  isActive: boolean;
  isCompleted: boolean;
}

export function OnboardingSubStepIcon({
  subStepId,
  icon,
  isActive,
  isCompleted,
}: OnboardingSubStepIconProps) {
  const Icon = ICONS[icon as OnboardingSubStepIconName] ?? FileText;
  const iconColor = isActive || isCompleted ? '#163300' : '#9CA3AF';
  const bgColor = isActive || isCompleted ? '#9FE870' : '#E5E7EB';

  return (
    <div
      data-testid={`substep-icon-${subStepId}`}
      className="flex h-7 w-7 items-center justify-center rounded-full"
      style={{ backgroundColor: bgColor }}
    >
      <Icon aria-hidden="true" className="h-4 w-4" color={iconColor} />
    </div>
  );
}
