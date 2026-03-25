CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"myrentcard_account_id" varchar(255),
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"twilio_account_sid" varchar(100),
	"twilio_auth_token" varchar(100),
	"ai_assist_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" varchar,
	"name" varchar(255),
	"email" varchar(255),
	"role" varchar(50) DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"address1" varchar(255),
	"address2" varchar(255),
	"city" varchar(100),
	"state" varchar(50),
	"zip" varchar(20),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twilio_numbers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"property_id" varchar,
	"phone_number" varchar(30) NOT NULL,
	"friendly_name" varchar(255),
	"purpose" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"assigned_property_id" varchar,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"full_name" varchar(255),
	"phone_primary" varchar(30) NOT NULL,
	"phone_secondary" varchar(30),
	"email" varchar(255),
	"desired_move_in_date" varchar(50),
	"desired_bedrooms" varchar(20),
	"budget_min" numeric(10, 2),
	"budget_max" numeric(10, 2),
	"pets" varchar(100),
	"voucher_type" varchar(100),
	"employment_status" varchar(100),
	"monthly_income" numeric(10, 2),
	"language_preference" varchar(50),
	"latest_summary" varchar(2000),
	"latest_sentiment" varchar(50),
	"qualification_score" numeric(5, 2),
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"export_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"crm_external_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_prospects_account_phone" UNIQUE("account_id","phone_primary")
);
--> statement-breakpoint
CREATE TABLE "prospect_conflicts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"prospect_id" varchar NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"existing_value" varchar(1000),
	"extracted_value" varchar(1000) NOT NULL,
	"chosen_value" varchar(1000),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"prospect_id" varchar,
	"property_id" varchar,
	"source_type" varchar(30) NOT NULL,
	"direction" varchar(20) DEFAULT 'inbound' NOT NULL,
	"twilio_message_sid" varchar(100),
	"twilio_call_sid" varchar(100),
	"prospect_match_confidence" varchar(30),
	"parent_thread_key" varchar(255),
	"from_number" varchar(30) NOT NULL,
	"to_number" varchar(30) NOT NULL,
	"raw_text" varchar(5000),
	"transcript" varchar(10000),
	"summary" varchar(2000),
	"category" varchar(100),
	"urgency" varchar(50),
	"sentiment" varchar(50),
	"extraction_confidence" numeric(5, 4),
	"structured_extraction_json" jsonb,
	"extraction_status" varchar(50) DEFAULT 'pending',
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_twilio_message_sid_unique" UNIQUE("twilio_message_sid"),
	CONSTRAINT "interactions_twilio_call_sid_unique" UNIQUE("twilio_call_sid")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"prospect_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_tags" (
	"prospect_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	CONSTRAINT "prospect_tags_prospect_id_tag_id_pk" PRIMARY KEY("prospect_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_batch_items" (
	"export_batch_id" varchar NOT NULL,
	"prospect_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"created_by_user_id" varchar,
	"format" varchar(20) NOT NULL,
	"target_system" varchar(100),
	"record_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"file_url" varchar(1000),
	"mime_type" varchar(100),
	"file_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" varchar,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" varchar,
	"prospect_id" varchar,
	"interaction_id" varchar,
	"property_id" varchar,
	"event_type" varchar(50) NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"source_layer" varchar(50),
	"event_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" varchar(255),
	"device_type" varchar(50),
	"platform" varchar(50),
	"metadata_json" jsonb,
	"previous_state_json" jsonb,
	"new_state_json" jsonb,
	"ai_context_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founder_observations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" varchar,
	"observation_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"prospect_id" varchar,
	"property_id" varchar,
	"week_label" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_users" ADD CONSTRAINT "account_users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_users" ADD CONSTRAINT "account_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twilio_numbers" ADD CONSTRAINT "twilio_numbers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twilio_numbers" ADD CONSTRAINT "twilio_numbers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_assigned_property_id_properties_id_fk" FOREIGN KEY ("assigned_property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_conflicts" ADD CONSTRAINT "prospect_conflicts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_conflicts" ADD CONSTRAINT "prospect_conflicts_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_tags" ADD CONSTRAINT "prospect_tags_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_tags" ADD CONSTRAINT "prospect_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_batch_items" ADD CONSTRAINT "export_batch_items_export_batch_id_export_batches_id_fk" FOREIGN KEY ("export_batch_id") REFERENCES "public"."export_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_batch_items" ADD CONSTRAINT "export_batch_items_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_batches" ADD CONSTRAINT "export_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_batches" ADD CONSTRAINT "export_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_observations" ADD CONSTRAINT "founder_observations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_observations" ADD CONSTRAINT "founder_observations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_observations" ADD CONSTRAINT "founder_observations_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_observations" ADD CONSTRAINT "founder_observations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_account_users_account_id" ON "account_users" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_account_users_user_id" ON "account_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_properties_account_id" ON "properties" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_twilio_numbers_account_id" ON "twilio_numbers" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_twilio_numbers_phone" ON "twilio_numbers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_prospects_account_id" ON "prospects" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_prospects_phone_primary" ON "prospects" USING btree ("phone_primary");--> statement-breakpoint
CREATE INDEX "idx_prospects_status" ON "prospects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prospects_export_status" ON "prospects" USING btree ("export_status");--> statement-breakpoint
CREATE INDEX "idx_prospect_conflicts_prospect_id" ON "prospect_conflicts" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "idx_prospect_conflicts_account_id" ON "prospect_conflicts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_prospect_conflicts_resolved" ON "prospect_conflicts" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "idx_interactions_account_id" ON "interactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_prospect_id" ON "interactions" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_occurred_at" ON "interactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_interactions_extraction_status" ON "interactions" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX "idx_notes_prospect_id" ON "notes" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "idx_notes_account_id" ON "notes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_tags_account_id" ON "tags" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_export_batches_account_id" ON "export_batches" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_account_id" ON "audit_logs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_app_events_account_id" ON "app_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_app_events_event_type" ON "app_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_app_events_event_name" ON "app_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "idx_app_events_prospect_id" ON "app_events" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "idx_app_events_interaction_id" ON "app_events" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "idx_app_events_timestamp" ON "app_events" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_founder_obs_account_id" ON "founder_observations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_founder_obs_type" ON "founder_observations" USING btree ("observation_type");--> statement-breakpoint
CREATE INDEX "idx_founder_obs_created_at" ON "founder_observations" USING btree ("created_at");