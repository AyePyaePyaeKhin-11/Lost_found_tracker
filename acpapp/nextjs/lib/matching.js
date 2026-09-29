// acpapp/nextjs/lib/matching.js

const ALIAS_MAP = {
  apple: ['iphone', 'macbook', 'ipad', 'airpods'],
  iphone: ['apple', 'mobile', 'phone', 'smartphone'],
  macbook: ['apple', 'laptop'],
  ecc: ['engineering', 'e12', 'telecom'],
  engineering: ['ecc', 'e12', 'eng'],
  library: ['central library', 'kmitl library', 'office of the library'],
  canteen: ['cafeteria', 'food court', 'canteen a'],
  'canteen a': ['canteen', 'cafeteria', 'food court'],
  hm: ['hm building', 'praomklao', 'hm building kmitl'],
  'hm building': ['hm', 'praomklao'],
  '7-11': ['seven eleven', 'convenience store', '711', 'seven'],
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'with', 'by', 
  'for', 'of', 'to', 'near', 'found', 'lost', 'item', 'my', 'is'
]);

function tokenizeText(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function isTokenMatch(tokenA, tokenB) {
  if (tokenA === tokenB) return true;
  if (ALIAS_MAP[tokenA] && ALIAS_MAP[tokenA].includes(tokenB)) return true;
  if (ALIAS_MAP[tokenB] && ALIAS_MAP[tokenB].includes(tokenA)) return true;
  return false;
}

export function calculateMatchScore(lostItem, foundItem) {
  let score = 0;

  // 1. Category Match (30 pts)
  if (lostItem.category && foundItem.category) {
    if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
      score += 30;
    }
  }

  // 2. Location Proximity (25 pts)
  if (lostItem.location && foundItem.location) {
    const lostLocTokens = tokenizeText(lostItem.location);
    const foundLocTokens = tokenizeText(foundItem.location);

    const hasLocMatch = lostLocTokens.some((lToken) =>
      foundLocTokens.some((fToken) => isTokenMatch(lToken, fToken))
    );

    if (hasLocMatch) score += 25;
  }

  // 3. Text & Keyword Similarity (30 pts)
  const lostTokens = tokenizeText(`${lostItem.title || ''} ${lostItem.description || ''}`);
  const foundTokens = tokenizeText(`${foundItem.title || ''} ${foundItem.description || ''}`);

  if (lostTokens.length > 0 && foundTokens.length > 0) {
    let matchedCount = 0;
    lostTokens.forEach((lToken) => {
      if (foundTokens.some((fToken) => isTokenMatch(lToken, fToken))) {
        matchedCount++;
      }
    });
    const matchRatio = matchedCount / lostTokens.length;
    score += Math.min(30, Math.round(matchRatio * 30));
  }

  // 4. Date Delta Decay (15 pts)
  if (lostItem.date && foundItem.date) {
    const diffTime = Math.abs(new Date(foundItem.date) - new Date(lostItem.date));
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) score += 15;
    else if (diffDays <= 3) score += 10;
    else if (diffDays <= 7) score += 5;
  }

  return score;
}