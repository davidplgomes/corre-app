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

// Run Points by Distance
export const RUN_POINTS = {
  UNDER_2KM: 1,
  UNDER_5KM: 3,
  UNDER_10KM: 5,
  UNDER_21KM: 10,
  MARATHON_PLUS: 15,
} as const;

export const getPointsForRunDistance = (distanceKm: number): number => {
  if (distanceKm >= 21) return RUN_POINTS.MARATHON_PLUS;
  if (distanceKm >= 10) return RUN_POINTS.UNDER_21KM;
  if (distanceKm >= 5) return RUN_POINTS.UNDER_10KM;
  if (distanceKm >= 2) return RUN_POINTS.UNDER_5KM;
  return RUN_POINTS.UNDER_2KM;
};
