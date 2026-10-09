-- Phase 16A: internationalization architecture foundation.
--
-- Adds a `Locale` enum (ar/fr/en/es) and a nullable `preferredLocale`
-- column on `User` for durable, cross-device UI-language preference.
-- Entirely additive: no existing column is altered or dropped, no
-- existing row is touched, and this has no relationship whatsoever to
-- `Resource.language` (content language, untouched by this migration).
--
-- `preferredLocale` defaults to NULL for all existing users — null means
-- "no explicit UI-language choice stored", in which case the per-request
-- locale cookie (or the application default, "ar") governs rendering.
-- No backfill is needed or performed: there is no prior UI-language
-- preference anywhere to migrate from.

CREATE TYPE "Locale" AS ENUM ('ar', 'fr', 'en', 'es');

ALTER TABLE "User" ADD COLUMN "preferredLocale" "Locale";
