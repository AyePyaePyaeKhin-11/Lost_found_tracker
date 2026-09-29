// acpapp/nextjs/pages/api/search/match.js
import { calculateMatchScore } from '../../../lib/matching';

// Expanded Dataset with 10 found items
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
    location: 'Canteen A',
    date: '2026-09-29',
    description: 'White MacBook charger found under cafeteria table in Canteen A.',
  },
  {
    id: 'f104',
    title: 'Silver iPad Air with Stylus',
    category: 'Electronics',
    location: 'HM Building',
    date: '2026-09-27',
    description: 'Found inside lecture room HM 302.',
  },
  {
    id: 'f105',
    title: 'KMITL Student ID Card',
    category: 'Documents',
    location: '7-11 Near Engineering',
    date: '2026-09-29',
    description: 'Left near checkout counter at Seven Eleven.',
  },
  {
    id: 'f106',
    title: 'Sony Wireless Headphones',
    category: 'Electronics',
    location: 'HM Building',
    date: '2026-09-26',
    description: 'Over-ear black noise-canceling headphones left in lobby.',
  },
  {
    id: 'f107',
    title: 'Car Key (Toyota)',
    category: 'Keys',
    location: 'Canteen A',
    date: '2026-09-28',
    description: 'Key fob with red leather keychain found on bench outside Canteen A.',
  },
  {
    id: 'f108',
    title: 'Scientific Calculator Casio fx-991EX',
    category: 'Stationery',
    location: 'ECC Building',
    date: '2026-09-24',
    description: 'Left in E12 lab room after exam.',
  },
  {
    id: 'f109',
    title: 'Black Nike Backpack',
    category: 'Bags',
    location: '7-11 Near Library',
    date: '2026-09-29',
    description: 'Contains notebook and umbrella, left outside 7-11 entrance.',
  },
  {
    id: 'f110',
    title: 'Prescription Glasses in Brown Case',
    category: 'Accessories',
    location: 'Central Library',
    date: '2026-09-23',
    description: 'Found on 1st-floor silent reading zone bench.',
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