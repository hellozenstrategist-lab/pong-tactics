CREATE TABLE `familiar_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`model` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used` integer DEFAULT 0 NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
