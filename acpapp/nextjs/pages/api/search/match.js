// acpapp/nextjs/pages/api/search/match.js
import { calculateMatchScore } from '../../../lib/matching';

const mockFoundDatabase = [
  {
    id: 'f101',
    title: 'Apple iPhone 13 Pro',
    category: 'Electronics',
    location: 'ECC Building',
    date: '2026-09-28',
    description: 'Black phone found in classroom 601 with clear silicone case.',
  },
  {
    id: 'f102',
    title: 'Blue Hydro Flask Water Bottle',
    category: 'Accessories',
    location: 'Central Library',
    date: '2026-09-25',
    description: 'Left on 2nd-floor study table near window.',
  },
  {
    id: 'f103',
    title: 'Laptop Charger (USB-C)',
    category: 'Electronics',
    location: 'Engineering Canteen',
    date: '2026-09-29',
    description: 'White MacBook charger found under cafeteria table.',
  },
];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { title = '', category = '', location = '', date = '', minScore = 20 } = req.query;
  const targetQuery = { title, category, location, date, description: title };

  const rankedResults = mockFoundDatabase
    .map((foundItem) => ({
      foundItem,
      matchScore: calculateMatchScore(targetQuery, foundItem),
    }))
    .filter((result) => result.matchScore >= Number(minScore))
    .sort((a, b) => b.matchScore - a.matchScore);

  return res.status(200).json({
    success: true,
    totalMatches: rankedResults.length,
    queryInput: targetQuery,
    results: rankedResults,
  });
}