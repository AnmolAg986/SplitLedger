CREATE INDEX IF NOT EXISTS expenses_search_idx ON expenses USING GIN (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS groups_search_idx ON groups USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS users_search_idx ON users USING GIN (to_tsvector('english', display_name || ' ' || COALESCE(username, '')));
CREATE INDEX IF NOT EXISTS dm_search_idx ON direct_messages USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS gm_search_idx ON group_messages USING GIN (to_tsvector('english', content));
