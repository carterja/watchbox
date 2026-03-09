// Import script for existing watchlist
// Run with: npx tsx scripts/import-list.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data extracted from the images
const importData = [
  // Apple TV (wife - red)
  { title: "Trying", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Margo's Got Money Troubles", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Morning Show", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Shrinking", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Platonic", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Bad Sisters", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Mythic Quest", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  { title: "Loot", streamingService: "Apple TV", viewer: "wife", type: "tv" },
  
  // Netflix (wife - red)
  { title: "Bridgerton", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "F1 Academy", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Drive to Survive", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Glitter & Gold", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Pipe Dream", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Stranger Things Doc", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "How to Get to Heaven from Belfast", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Selling Sunset", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Too Much", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Cunk on Earth", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Simone Biles Rising", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "The Residence", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Long Story Short", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Mo", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "The Diplomat", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Emily in Paris", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "Nobody Wants This", streamingService: "Netflix", viewer: "wife", type: "tv" },
  { title: "British Bake Off", streamingService: "Netflix", viewer: "wife", type: "tv" },
  
  // Plex (both - purple)
  { title: "RHOSLC", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Mormon Wives", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Love Story", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Deli Boys", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Outlander", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Handmaid's Tale", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Colin from Accounts", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Stumble", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "All Her Fault", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "The Americans", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Couples Therapy", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Ghosts", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "30 Rock", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "High Potential", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "The Paper", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "St. Denis", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Top Chef", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "SNL", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "The Bear", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Atlanta", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "PONIES", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Evil", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Ghosts", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Only Murders", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Elsbeth", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "WWDITS", streamingService: "Plex", viewer: "both", type: "tv" },
  { title: "Traitors", streamingService: "Plex", viewer: "both", type: "tv" },
  
  // HBO (both - purple)
  { title: "The Other Two", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "I Love LA", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "Somebody Somewhere", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "Sex Lives of College Girls", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "Knight of the Seven Kingdoms", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "The Rehearsal", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "The Chair Company", streamingService: "HBO", viewer: "both", type: "tv" },
  { title: "Veep", streamingService: "HBO", viewer: "both", type: "tv" },
  
  // Prime (both - purple)
  { title: "Etoile", streamingService: "Prime", viewer: "both", type: "tv" },
  { title: "Overcompensating", streamingService: "Prime", viewer: "both", type: "tv" },
  { title: "Fallout", streamingService: "Prime", viewer: "both", type: "tv" },
  { title: "Fleabag", streamingService: "Prime", viewer: "both", type: "tv" },
  
  // Comedy Specials (both - purple)
  { title: "Rachel Bloom", streamingService: "Comedy Specials", viewer: "both", type: "movie" },
  { title: "Marcello Hernandez", streamingService: "Comedy Specials", viewer: "both", type: "movie" },
];

async function searchTMDB(title: string, type: 'tv' | 'movie') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY not set');
  
  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
  const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
  
  const res = await fetch(url);
  const json = await res.json();
  
  if (json.results && json.results.length > 0) {
    const first = json.results[0];
    return {
      tmdbId: first.id,
      title: type === 'movie' ? first.title : first.name,
      overview: first.overview || null,
      posterPath: first.poster_path || null,
      releaseDate: (type === 'movie' ? first.release_date : first.first_air_date) || null,
      totalSeasons: type === 'tv' && first.number_of_seasons ? first.number_of_seasons : null,
    };
  }
  return null;
}

async function main() {
  console.log('🎬 Starting watchlist import...\n');
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const item of importData) {
    try {
      console.log(`Searching for: ${item.title} (${item.type})...`);
      
      const tmdbData = await searchTMDB(item.title, item.type as 'tv' | 'movie');
      
      if (!tmdbData) {
        console.log(`  ❌ Not found on TMDB\n`);
        errors++;
        continue;
      }
      
      // Check if already exists
      const existing = await prisma.media.findFirst({
        where: {
          tmdbId: tmdbData.tmdbId,
          type: item.type,
        },
      });
      
      if (existing) {
        console.log(`  ⏭️  Already in database\n`);
        skipped++;
        continue;
      }
      
      // Create new entry
      await prisma.media.create({
        data: {
          tmdbId: tmdbData.tmdbId,
          type: item.type,
          title: tmdbData.title,
          overview: tmdbData.overview,
          posterPath: tmdbData.posterPath,
          releaseDate: tmdbData.releaseDate,
          status: 'yet_to_start',
          streamingService: item.streamingService,
          viewer: item.viewer as 'wife' | 'both' | 'me',
          totalSeasons: tmdbData.totalSeasons,
        },
      });
      
      console.log(`  ✅ Imported: ${tmdbData.title}\n`);
      imported++;
      
      // Rate limiting - wait 250ms between requests
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error(`  ❌ Error importing ${item.title}:`, error);
      errors++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped (already exists): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📝 Total: ${importData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
