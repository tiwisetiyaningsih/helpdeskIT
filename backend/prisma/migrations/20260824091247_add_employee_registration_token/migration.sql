/*
  Warnings:

  - A unique constraint covering the columns `[registrationTokenHash]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `registrationTokenExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `registrationTokenHash` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_registrationTokenHash_key` ON `Employee`(`registrationTokenHash`);
