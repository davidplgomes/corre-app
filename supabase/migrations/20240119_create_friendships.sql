-- Create friendships table for friend requests and connections
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(requester_id, addressee_id),
    CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view friendships they are part of
CREATE POLICY "Users can view own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests (as requester)
CREATE POLICY "Users can send friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships addressed to them (accept/reject)
CREATE POLICY "Users can respond to friend requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

-- Users can delete friendships they are part of
CREATE POLICY "Users can remove friendships"
    ON friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_friendships_updated_at();
