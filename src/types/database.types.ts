import { MembershipTier } from '@constants/tiers';
import { EventType } from '@constants/points';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'creator_id' | 'created_at'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'joined_at'>;
        Update: never;
      };
      check_ins: {
        Row: CheckIn;
        Insert: Omit<CheckIn, 'id' | 'checked_in_at'>;
        Update: never;
      };
      monthly_leaderboard: {
        Row: LeaderboardEntry;
        Insert: Omit<LeaderboardEntry, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LeaderboardEntry, 'id' | 'user_id' | 'month'>>;
      };
      neighborhoods: {
        Row: Neighborhood;
        Insert: Omit<Neighborhood, 'id' | 'created_at'>;
        Update: Partial<Omit<Neighborhood, 'id'>>;
      };
      feed_posts: {
        Row: FeedPost;
        Insert: Omit<FeedPost, 'id' | 'created_at'>;
        Update: Partial<Omit<FeedPost, 'id' | 'created_at' | 'user_id'>>;
      };
      marketplace_items: {
        Row: MarketplaceItem;
        Insert: Omit<MarketplaceItem, 'id' | 'created_at'>;
        Update: Partial<Omit<MarketplaceItem, 'id' | 'created_at' | 'seller_id'>>;
      };
      corre_shop_items: {
        Row: ShopItem;
        Insert: Omit<ShopItem, 'id' | 'created_at'>;
        Update: Partial<Omit<ShopItem, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  neighborhood: string | null;
  membership_tier: MembershipTier;
  current_month_points: number;
  total_lifetime_points: number;
  language_preference: 'en' | 'pt' | 'es';
  qr_code_secret: string;
  is_merchant: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  points_value: number;
  event_datetime: string;
  location_lat: number;
  location_lng: number;
  location_name: string | null;
  check_in_radius_meters: number;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
}

export interface CheckIn {
  id: string;
  event_id: string;
  user_id: string;
  check_in_lat: number;
  check_in_lng: number;
  points_earned: number;
  checked_in_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-01 format
  points: number;
  rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  city: string;
  created_at: string;
}

export interface FeedPost {
  id: string;
  user_id: string;
  activity_type: 'run' | 'check_in' | 'post';
  content: string | null;
  media_url: string | null;
  meta_data: {
    distance?: string;
    time?: string;
    pace?: string;
    event_id?: string;
    location?: string;
  } | null;
  created_at: string;
  // Joins
  users?: Partial<User>;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  status: 'active' | 'sold';
  created_at: string;
  // Joins
  users?: Partial<User>;
}

export interface ShopItem {
  id: string;
  title: string;
  description: string | null;
  points_price: number;
  image_url: string | null;
  stock: number;
  created_at: string;
}
