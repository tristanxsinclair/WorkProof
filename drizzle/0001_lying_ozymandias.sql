CREATE TABLE `verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`experience_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`worker_name` text NOT NULL,
	`recipient_email` text NOT NULL,
	`version` text NOT NULL,
	`snapshot` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`response` text,
	FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `verification_owner_created` ON `verification_requests` (`owner_id`,`created_at`);