import { calculateMatchScore } from '../../../lib/matching';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q = '', category = '', location = '' } = req.query;

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const backendRes = await fetch(`${backendUrl}/api/items`);

    if (!backendRes.ok) {
      // ดึงรายละเอียด Error จริงจาก Backend ออกมาดู
      const errorText = await backendRes.text();
      return res.status(backendRes.status).json({ 
        error: `Backend returned status ${backendRes.status}`,
        details: errorText
      });
    }

    const items = await backendRes.json();

    const queryTarget = {
      name: q,
      title: q,
      description: q,
      category: category,
      location: location,
      date_reported: new Date().toISOString(),
    };

    const scoredItems = items.map((item) => {
      const score = calculateMatchScore(queryTarget, item);
      return {
        ...item,
        match_score: score,
      };
    });

    scoredItems.sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({
      query: q,
      total_results: scoredItems.length,
      results: scoredItems,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}