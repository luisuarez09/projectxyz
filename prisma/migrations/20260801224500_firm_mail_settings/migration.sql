-- CreateEnum
CREATE TYPE "app"."MailProvider" AS ENUM ('MAILRELAY', 'CUSTOM_SMTP');

-- CreateEnum
CREATE TYPE "app"."MailConnectionStatus" AS ENUM ('NOT_TESTED', 'VERIFIED', 'FAILED');

-- The firm may operate under a natural person or a legal entity.
CREATE TYPE "app"."FirmEntityType" AS ENUM ('NATURAL_PERSON', 'LEGAL_ENTITY');
ALTER TABLE "app"."firms" ADD COLUMN "entity_type" "app"."FirmEntityType" NOT NULL DEFAULT 'LEGAL_ENTITY';

-- A system-generated bootstrap invitation has no human sender.
ALTER TABLE "app"."invitations" ALTER COLUMN "invited_by_user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "app"."firm_mail_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" "app"."MailProvider" NOT NULL DEFAULT 'MAILRELAY',
    "sender_domain" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER NOT NULL DEFAULT 587,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT false,
    "smtp_require_tls" BOOLEAN NOT NULL DEFAULT true,
    "smtp_user" TEXT,
    "smtp_password_ciphertext" BYTEA,
    "smtp_password_iv" BYTEA,
    "smtp_password_auth_tag" BYTEA,
    "smtp_password_key_version" TEXT,
    "from_address" TEXT,
    "from_name" TEXT NOT NULL DEFAULT 'proyectoxyz',
    "reply_to" TEXT,
    "connection_status" "app"."MailConnectionStatus" NOT NULL DEFAULT 'NOT_TESTED',
    "last_verified_at" TIMESTAMPTZ(6),
    "last_connection_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "firm_mail_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "firm_mail_settings_firm_id_key" ON "app"."firm_mail_settings"("firm_id");

-- AddForeignKey
ALTER TABLE "app"."firm_mail_settings" ADD CONSTRAINT "firm_mail_settings_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app"."firm_mail_settings" ADD CONSTRAINT "firm_mail_settings_port_check" CHECK ("smtp_port" BETWEEN 1 AND 65535);
ALTER TABLE "app"."firm_mail_settings" ADD CONSTRAINT "firm_mail_settings_secret_check" CHECK (
  ("smtp_password_ciphertext" IS NULL AND "smtp_password_iv" IS NULL AND "smtp_password_auth_tag" IS NULL AND "smtp_password_key_version" IS NULL) OR
  ("smtp_password_ciphertext" IS NOT NULL AND "smtp_password_iv" IS NOT NULL AND "smtp_password_auth_tag" IS NOT NULL AND "smtp_password_key_version" IS NOT NULL)
);
ALTER TABLE "app"."firm_mail_settings" ADD CONSTRAINT "firm_mail_settings_enabled_check" CHECK (
  NOT "enabled" OR (
    "connection_status" = 'VERIFIED' AND
    length(trim("sender_domain")) > 0 AND
    length(trim("smtp_host")) > 0 AND
    length(trim("smtp_user")) > 0 AND
    "smtp_password_ciphertext" IS NOT NULL AND
    length(trim("from_address")) > 0 AND
    length(trim("from_name")) > 0 AND
    length(trim("reply_to")) > 0
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "app"."firm_mail_settings" TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."firm_mail_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_mail_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_mail_settings_staff_policy" ON "app"."firm_mail_settings" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
);
