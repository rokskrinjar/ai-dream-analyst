-- Add DELETE policy for dream_analyses table to allow users to delete analyses of their own dreams
CREATE POLICY "Users can delete analyses of their own dreams"
ON dream_analyses
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM dreams
    WHERE dreams.id = dream_analyses.dream_id
    AND dreams.user_id = auth.uid()
  )
);