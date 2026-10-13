import { calculateMatchScore } from '../../../lib/matching';
import { fetchItemsFromBackend } from '../../../lib/backend';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q = '', category = '', location = '' } = req.query;

    // Forwards the caller's token; sends the 401/error response itself if it fails.
    const items = await fetchItemsFromBackend(req, res);
    if (items === null) return;

    // NOTE: no date_reported here on purpose. The date term of the score only
    // applies when BOTH items have a date, so a keyword search is ranked on
    // text / category / location only (otherwise every recent item got 15%).
    const queryTarget = {
      name: q,
      title: q,
      description: q,
      category: category,
      location: location,
    };

    const results = items
      // Only active cases: skip claimed and archived (deleted) items
      .filter((item) => item.status === 'open')
      .map((item) => ({
        ...item,
        match_score: calculateMatchScore(queryTarget, item),
      }))
      // Skip items that match nothing at all
      .filter((item) => item.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({
      query: q,
      total_results: results.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
