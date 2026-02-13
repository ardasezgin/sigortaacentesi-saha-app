CREATE TABLE `communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`levhaNo` varchar(50) NOT NULL,
	`acenteAdi` text,
	`type` varchar(50) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`notes` text NOT NULL,
	`createdBy` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`levhaNo` varchar(50) NOT NULL,
	`acenteAdi` text,
	`requestType` varchar(50) NOT NULL,
	`priority` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`response` text,
	`createdBy` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iletisimTuru` varchar(50) NOT NULL,
	`isOrtagi` varchar(100) NOT NULL,
	`levhaNo` varchar(50) NOT NULL,
	`acenteAdi` text NOT NULL,
	`kimleGorusuldu` varchar(255) NOT NULL,
	`tarih` varchar(50) NOT NULL,
	`gundem` varchar(100) NOT NULL,
	`detayAciklama` text NOT NULL,
	`hatirlatma` text,
	`hatirlatmaTarihi` varchar(50),
	`dosyalar` text,
	`createdBy` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
