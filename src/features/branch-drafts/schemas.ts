import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const nullableTextSchema = z.string().trim().max(50_000).nullable();
export const titleSchema = z.string().trim().max(300).nullable();
export const shortSummarySchema = z.string().trim().max(2_000).nullable();
export const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const privacySchema = z.enum([
  "private",
  "selected_people",
  "project_members",
  "secure_link",
  "public",
]);

export const collaboratorRoleSchema = z.enum([
  "editor",
  "reviewer",
  "commenter",
  "viewer",
]);

export const relationshipTypeSchema = z.enum([
  "developed_from", "inspired_by", "extends", "supports", "challenges",
  "contradicts", "combines_with", "replaces", "redirected_by",
  "based_on_evidence_from", "derived_from", "reproduces",
  "applies_in_another_field", "produces_new_question", "continues",
  "reuses_method", "prior_attempt", "references", "related_unverified",
]);
