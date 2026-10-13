import { calculateMatchScore } from '../../../lib/matching';
import { fetchItemsFromBackend } from '../../../lib/backend';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forwards the caller's token; sends the 401/error response itself if it fails.
    const items = await fetchItemsFromBackend(req, res);
    if (items === null) return;

    // 1. Only cases that are still open
    const lostItems = items.filter((item) => item.type === 'lost' && item.status === 'open');
    const foundItems = items.filter((item) => item.type === 'found' && item.status === 'open');

    // Minimum score (%). 30 = a candidate needs more than a same-day date plus a
    // location alias (that alone can reach ~27); lower it if you want looser matches.
    const MATCH_THRESHOLD = 30;
    const MAX_CANDIDATES = 5; // top candidates returned per lost item

    const groupedMatches = lostItems.map((lostItem) => {
      const matches = foundItems
        .map((foundItem) => ({
          ...foundItem,
          match_score: calculateMatchScore(lostItem, foundItem),
        }))
        // 2. Keep only candidates at or above the threshold
        .filter((item) => item.match_score >= MATCH_THRESHOLD)
        .sort((a, b) => b.match_score - a.match_score)
        // 3. Top 5 only
        .slice(0, MAX_CANDIDATES);

      return {
        target_item: lostItem,
        matched_candidates: matches,
      };
    });

    return res.status(200).json({
      total_groups: groupedMatches.length,
      groups: groupedMatches,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
