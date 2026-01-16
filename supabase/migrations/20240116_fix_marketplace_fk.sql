-- Drop the existing foreign key constraint
ALTER TABLE public.marketplace_items DROP CONSTRAINT IF EXISTS marketplace_items_seller_id_fkey;

-- Add the new foreign key constraint pointing to public.users
ALTER TABLE public.marketplace_items
    ADD CONSTRAINT marketplace_items_seller_id_fkey
    FOREIGN KEY (seller_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;
