CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`record` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `experiences_owner` ON `experiences` (`owner`);