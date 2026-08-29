export type Category =
  | "clothes"
  | "books"
  | "electronics"
  | "furniture"
  | "food"
  | "other";

export type ListingType = "donate" | "exchange";
export type Availability = "now" | "today" | "tomorrow" | "weekend";
export type ListingStatus = "open" | "promised" | "completed";
export type RequestStatus = "pending" | "accepted" | "declined";

export type Profile = {
  id: string;
  auth_id: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_org: boolean;
  verified: boolean;
  city: string;
  rating_avg: number;
  rating_count: number;
};

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  listing_type: ListingType;
  condition: string;
  availability: Availability;
  area_label: string;
  lat: number;
  lng: number;
  collection_notes: string | null;
  status: ListingStatus;
  estimated_kg: number;
  is_seed: boolean;
  created_at: string;
  photos: string[];
  donor: Profile;
  request_count: number;
  requester_avatars: string[];
};

export type CommunityEvent = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: string;
  starts_at: string;
  area_label: string;
  lat: number;
  lng: number;
  photo_url: string | null;
  is_seed: boolean;
  host: Profile;
  going_count: number;
  going_avatars: string[];
};

export type DonationRequest = {
  id: string;
  listing_id: string;
  requester_id: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  requester?: Profile;
};

export type Thread = {
  id: string;
  listing_id: string;
  donor_id: string;
  recipient_id: string;
  listing?: Listing;
  other?: Profile;
  last_message?: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ItemAnalysis = {
  title: string;
  category: Category;
  condition: string;
  description: string;
  estimated_kg_min: number;
  estimated_kg_max: number;
  recommendation: "reuse" | "repair" | "recycle";
  recommendation_detail: string;
  safety_warnings: string[];
  keywords: string[];
  provider: string;
};

export type AppNotification = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
};
