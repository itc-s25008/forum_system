-- Ensure database-generated UUIDs are applied to existing databases.
ALTER TABLE "User"
    ALTER COLUMN "id" SET DEFAULT uuidv7();

ALTER TABLE "Topic"
    ALTER COLUMN "id" SET DEFAULT uuidv7();

ALTER TABLE "Post"
    ALTER COLUMN "id" SET DEFAULT uuidv7();
