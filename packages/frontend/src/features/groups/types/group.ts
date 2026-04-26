export interface GroupMember {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  role?: 'admin' | 'member';
  joined_at?: string;
}

export interface Group {
  id: string;
  name: string;
  type: string;
  member_count: number;
  members?: GroupMember[];
  is_archived: boolean;
  avatar_url?: string;
  created_at: string;
}
