-- AlterTable
ALTER TABLE "Tutor" ADD COLUMN     "antiPatterns" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "goldenLines" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "identity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "liveContext" JSONB,
ADD COLUMN     "teachingArc" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "vocabulary" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "voiceTraits" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false;
