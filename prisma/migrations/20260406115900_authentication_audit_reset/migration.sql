-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `phone` VARCHAR(191) NULL AFTER `email`,
    ADD COLUMN `failed_login_attempts` INTEGER NOT NULL DEFAULT 0 AFTER `password_hash`,
    ADD COLUMN `locked_until` DATETIME(3) NULL AFTER `failed_login_attempts`,
    ADD COLUMN `last_login_at` DATETIME(3) NULL AFTER `locked_until`,
    ADD UNIQUE INDEX `users_phone_key`(`phone`),
    ADD INDEX `users_locked_until_idx`(`locked_until`);

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_attempts_identifier_created_at_idx`(`identifier`, `created_at`),
    INDEX `login_attempts_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `login_attempts_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_key`(`token`),
    INDEX `password_reset_tokens_identifier_created_at_idx`(`identifier`, `created_at`),
    INDEX `password_reset_tokens_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `password_reset_tokens_expires_idx`(`expires`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
