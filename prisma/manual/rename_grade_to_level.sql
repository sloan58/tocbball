DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Player'
      AND column_name = 'grade'
  ) THEN
    ALTER TABLE "Player" RENAME COLUMN "grade" TO "level";
  END IF;
END $$;
