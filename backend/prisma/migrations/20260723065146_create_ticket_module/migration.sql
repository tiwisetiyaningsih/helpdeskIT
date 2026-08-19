-- CreateTable
CREATE TABLE `Ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `noPelaporan` VARCHAR(191) NOT NULL,
    `reporterId` INTEGER NOT NULL,
    `handlerId` INTEGER NULL,
    `keluhan` TEXT NOT NULL,
    `priority` INTEGER NOT NULL,
    `waktuKeluhan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `kategoriKeluhan` VARCHAR(191) NULL,
    `sla` VARCHAR(191) NULL,
    `eskalasi` VARCHAR(191) NULL,
    `batasResponse` DATETIME(3) NULL,
    `selesaiResponse` DATETIME(3) NULL,
    `keteranganResponse` TEXT NULL,
    `isPending` BOOLEAN NOT NULL DEFAULT false,
    `lamaPending` INTEGER NULL,
    `analisaAwal` TEXT NULL,
    `hasilAnalisa` TEXT NULL,
    `mulaiPengerjaan` DATETIME(3) NULL,
    `estimasiPengerjaan` DATETIME(3) NULL,
    `selesaiPengerjaan` DATETIME(3) NULL,
    `catatan` TEXT NULL,
    `status` ENUM('OPEN', 'WAITING', 'IN_PROGRESS', 'PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `waktuPengerjaan` INTEGER NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_noPelaporan_key`(`noPelaporan`),
    INDEX `Ticket_reporterId_idx`(`reporterId`),
    INDEX `Ticket_handlerId_idx`(`handlerId`),
    INDEX `Ticket_priority_waktuKeluhan_idx`(`priority`, `waktuKeluhan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketEvidence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `objectName` VARCHAR(191) NOT NULL,
    `bucketName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `uploadedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketEvidence_ticketId_idx`(`ticketId`),
    INDEX `TicketEvidence_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_handlerId_fkey` FOREIGN KEY (`handlerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketEvidence` ADD CONSTRAINT `TicketEvidence_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketEvidence` ADD CONSTRAINT `TicketEvidence_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
