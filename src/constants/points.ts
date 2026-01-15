export type EventType = 'routine' | 'special' | 'race';

export const EVENT_POINTS: Record<EventType, number> = {
  routine: 3,
  special: 5,
  race: 10,
} as const;

export const POINTS_FOR_TIER_UPGRADE = 12;
export const UPGRADED_MEMBERSHIP_FEE = 17.5; // Discount applied after reaching 12 points

export const getPointsForEventType = (eventType: EventType): number => {
  return EVENT_POINTS[eventType];
};

export const canUpgradeTier = (currentPoints: number): boolean => {
  return currentPoints >= POINTS_FOR_TIER_UPGRADE;
};
