import type { CreateMediaInput } from "@/lib/validation";
import { getTmdbMovieDetails, getTmdbTvDetails } from "@/lib/tmdb";

/**
 * Fetches TMDB movie/TV details and fills missing metadata on create.
 * Plex-only adds often send only tmdbId + type + a Plex-derived title — this pulls poster, overview, season count, etc.
 */
export async function mergeCreatePayloadWithTmdb(validated: CreateMediaInput): Promise<CreateMediaInput> {
  try {
    if (validated.type === "tv") {
      const d = await getTmdbTvDetails(validated.tmdbId);
      if (!d) return validated;

      const title = d.name?.trim() ? d.name : validated.title;
      const overview =
        validated.overview?.trim() != null && validated.overview.trim() !== ""
          ? validated.overview
          : d.overview?.trim()
            ? d.overview
            : validated.overview;
      const posterPath =
        validated.posterPath?.trim() != null && validated.posterPath.trim() !== ""
          ? validated.posterPath
          : d.poster_path ?? validated.posterPath;
      const releaseDate =
        validated.releaseDate?.trim() != null && validated.releaseDate.trim() !== ""
          ? validated.releaseDate
          : d.first_air_date ?? validated.releaseDate;
      const totalSeasons =
        validated.totalSeasons != null
          ? validated.totalSeasons
          : typeof d.number_of_seasons === "number" && d.number_of_seasons > 0
            ? d.number_of_seasons
            : validated.totalSeasons;

      return {
        ...validated,
        title,
        overview,
        posterPath,
        releaseDate,
        totalSeasons,
      };
    }

    const d = await getTmdbMovieDetails(validated.tmdbId);
    if (!d) return validated;

    const title = d.title?.trim() ? d.title : validated.title;
    const overview =
      validated.overview?.trim() != null && validated.overview.trim() !== ""
        ? validated.overview
        : d.overview?.trim()
          ? d.overview
          : validated.overview;
    const posterPath =
      validated.posterPath?.trim() != null && validated.posterPath.trim() !== ""
        ? validated.posterPath
        : d.poster_path ?? validated.posterPath;
    const releaseDate =
      validated.releaseDate?.trim() != null && validated.releaseDate.trim() !== ""
        ? validated.releaseDate
        : d.release_date ?? validated.releaseDate;
    const runtime =
      validated.runtime != null
        ? validated.runtime
        : typeof d.runtime === "number" && d.runtime > 0
          ? d.runtime
          : validated.runtime;

    return {
      ...validated,
      title,
      overview,
      posterPath,
      releaseDate,
      runtime,
    };
  } catch {
    return validated;
  }
}
