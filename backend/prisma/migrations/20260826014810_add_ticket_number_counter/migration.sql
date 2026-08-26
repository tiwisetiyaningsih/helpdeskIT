-- CreateTable
CREATE TABLE `TicketNumberCounter` (
    `datePart` VARCHAR(191) NOT NULL,
    `lastValue` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`datePart`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
