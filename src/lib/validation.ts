import { z } from "zod";

// Media type validation
export const MediaTypeSchema = z.enum(["movie", "tv"]);
export const MediaStatusSchema = z.enum(["yet_to_start", "in_progress", "finished"]);
export const ViewerSchema = z.enum(["wife", "both", "me"]);

// Season progress validation
export const SeasonProgressSchema = z.object({
  season: z.number().int().min(1),
  status: z.enum(["not_started", "in_progress", "completed"]),
});

// Create media validation
export const CreateMediaSchema = z.object({
  tmdbId: z.number().int().positive(),
  type: MediaTypeSchema,
  title: z.string().min(1).max(500),
  overview: z.string().max(5000).nullable().optional(),
  posterPath: z.string().max(500).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  status: MediaStatusSchema,
  totalSeasons: z.number().int().positive().max(100).nullable().optional(),
  streamingService: z.string().max(100).nullable().optional(),
  viewer: ViewerSchema.nullable().optional(),
});

// Update media validation
export const UpdateMediaSchema = z.object({
  status: MediaStatusSchema.optional(),
  progressNote: z.string().max(1000).optional(),
  totalSeasons: z.number().int().positive().max(100).optional(),
  seasonProgress: z.array(SeasonProgressSchema).optional(),
  streamingService: z.string().max(100).nullable().optional(),
  viewer: ViewerSchema.nullable().optional(),
});

// TMDB search validation
export const TmdbSearchSchema = z.object({
  q: z.string().min(1).max(200),
});

// Export types
export type CreateMediaInput = z.infer<typeof CreateMediaSchema>;
export type UpdateMediaInput = z.infer<typeof UpdateMediaSchema>;
export type TmdbSearchInput = z.infer<typeof TmdbSearchSchema>;
