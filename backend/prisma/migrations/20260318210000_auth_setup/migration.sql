-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "hashedRt" TEXT,
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
