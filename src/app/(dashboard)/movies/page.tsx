"use client";

import { MediaListPage } from "@/components/MediaListPage";

export default function MoviesPage() {
  return <MediaListPage typeFilter="movie" emptyNoun="movies" />;
}
