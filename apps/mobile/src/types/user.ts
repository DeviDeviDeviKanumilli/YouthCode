export type UserCreatePayload = {
  email?: string | null;
  display_name?: string | null;
  role?: 'consumer' | 'researcher' | 'reviewer' | 'admin';
  school_or_org?: string | null;
  privacy_settings?: Record<string, unknown>;
};

export type UserRead = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  role: string;
  school_or_org?: string | null;
  trusted_reviewer_status: boolean;
  privacy_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserObservationListItem = {
  observation_id: string;
  thumbnail_url?: string | null;
  possible_species?: string | null;
  signal_label?: string | null;
  verification_status: string;
  created_at: string;
};
