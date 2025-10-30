-- Add soft delete columns to dreams table
ALTER TABLE public.dreams 
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_dreams_is_deleted ON public.dreams(is_deleted);
CREATE INDEX idx_dreams_user_not_deleted ON public.dreams(user_id, is_deleted) WHERE is_deleted = false;

-- Add comment for documentation
COMMENT ON COLUMN public.dreams.is_deleted IS 'Soft delete flag - true if dream is deleted';
COMMENT ON COLUMN public.dreams.deleted_at IS 'Timestamp when dream was soft deleted';