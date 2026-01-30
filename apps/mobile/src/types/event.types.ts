import { EventType } from '@constants/points';

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  pointsValue: number;
  eventDatetime: Date;
  locationLat: number;
  locationLng: number;
  locationName: string | null;
  checkInRadiusMeters: number;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventType: EventType;
  eventDatetime: Date;
  locationLat: number;
  locationLng: number;
  locationName?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventType?: EventType;
  eventDatetime?: Date;
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
}

export interface EventWithParticipants extends EventData {
  participants: string[]; // Array of user IDs
  isParticipating: boolean;
  hasCheckedIn: boolean;
}

export interface CheckInData {
  eventId: string;
  userId: string;
  userLat: number;
  userLng: number;
}

export interface CheckInResult {
  success: boolean;
  pointsEarned: number;
  message: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}
