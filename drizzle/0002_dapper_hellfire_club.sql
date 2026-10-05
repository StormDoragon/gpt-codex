CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"bucket" bigint NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limits_key_bucket_pk" PRIMARY KEY("key","bucket")
);
--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");