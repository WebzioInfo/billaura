/*
  Warnings:

  - Added the required column `name` to the `document_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `document_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document_templates" ADD COLUMN     "colors" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "elements" JSONB,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "layout" JSONB,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "typography" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "htmlContent" DROP NOT NULL;
