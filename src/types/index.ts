export type OwnerOrRider = 'Boat Owner' | 'Boat Rider' | 'Owner & Rider';

export interface UserImages {
  image_1: string | null;
  image_2: string | null;
  image_3: string | null;
  image_4: string | null;
  image_5: string | null;
  image_6: string | null;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  bio: string | null;
  gender: string | null;
  birthday: string | null;
  owner_or_rider: OwnerOrRider | null;
  is_admin: boolean;
  status: 'approved' | 'pending' | 'denied';
  images: UserImages;
}

export interface SurfEvent {
  id: number;
  user_id: number;
  title: string;
  description: string;
  event_type: string;
  location: string;
  picture_url: string | null;
  start_time: string;
  end_time: string | null;
  number_of_spots: number;
  price: number;
  spots_taken: number;
  organizer?: Pick<User, 'id' | 'first_name' | 'last_name' | 'images'>;
}

export interface EventSignup {
  id: number;
  event_id: number;
  user_id: number;
  created_at: string;
  user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'images'>;
}

export interface DirectMessage {
  id: number;
  user_id_from: number;
  user_id_to: number;
  message: string;
  read: boolean;
  created_at: string;
}

export interface GroupMessage {
  id: number;
  event_id: number;
  user_id_from: number;
  message: string;
  created_at: string;
  user_from?: Pick<User, 'id' | 'first_name' | 'images'>;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string | null;
}
