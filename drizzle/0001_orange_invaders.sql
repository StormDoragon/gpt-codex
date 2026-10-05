CREATE TYPE "public"."ledger_entry_type" AS ENUM('commitment', 'capital_call', 'distribution');
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"application_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investors_id_workspace_key" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'investor' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"effective_date" date NOT NULL,
	"memo" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_amount_positive" CHECK ("ledger_entries"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_id_workspace_key" UNIQUE("id","workspace_id");
--> statement-breakpoint
ALTER TABLE "investors" ADD CONSTRAINT "investors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investors" ADD CONSTRAINT "investors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investors" ADD CONSTRAINT "investors_application_workspace_fk" FOREIGN KEY ("application_id","workspace_id") REFERENCES "public"."applications"("id","workspace_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_investor_workspace_fk" FOREIGN KEY ("investor_id","workspace_id") REFERENCES "public"."investors"("id","workspace_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_investor_workspace_fk" FOREIGN KEY ("investor_id","workspace_id") REFERENCES "public"."investors"("id","workspace_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "investors_workspace_email_key" ON "investors" USING btree ("workspace_id","email");
--> statement-breakpoint
CREATE UNIQUE INDEX "investors_workspace_user_key" ON "investors" USING btree ("workspace_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "investors_workspace_application_key" ON "investors" USING btree ("workspace_id","application_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "invitations_workspace_investor_idx" ON "invitations" USING btree ("workspace_id","investor_id");
--> statement-breakpoint
CREATE INDEX "ledger_entries_workspace_investor_idx" ON "ledger_entries" USING btree ("workspace_id","investor_id","effective_date");
