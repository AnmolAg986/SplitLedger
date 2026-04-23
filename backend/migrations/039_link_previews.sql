-- Migration 039: Message Link Previews
CREATE TABLE message_link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE direct_messages ADD COLUMN link_preview_id UUID REFERENCES message_link_previews(id) ON DELETE SET NULL;
ALTER TABLE group_messages ADD COLUMN link_preview_id UUID REFERENCES message_link_previews(id) ON DELETE SET NULL;
