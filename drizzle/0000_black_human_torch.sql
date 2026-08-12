CREATE TABLE `active_sessions` (
	`device_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`phase` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_active_sessions_last_seen` ON `active_sessions` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`nickname` text NOT NULL,
	`vibe` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`heat_seconds` integer NOT NULL,
	`cool_seconds` integer NOT NULL,
	`banger_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_check_ins_created_at` ON `check_ins` (`created_at`);