-- Migration 034: Friend Request Enhancements (Username)
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
CREATE UNIQUE INDEX ON users(lower(username));
