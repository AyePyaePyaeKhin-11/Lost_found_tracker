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

function calculateJaccardSimilarity(tokensA, tokensB) {
  if (!tokensA || !tokensB || tokensA.length === 0 || tokensB.length === 0) return 0.0;
  
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0.0 : intersection / union;
}

export function calculateMatchScore(itemA, itemB) {
  let score = 0.0;

  // 1. Category Match (30%) - Exact String Match
  const catA = (itemA.category || "").trim().toLowerCase();
  const catB = (itemB.category || "").trim().toLowerCase();
  if (catA && catB && catA === catB) {
    score += 30.0;
  }

  // 2. Text & Keyword Similarity (30%) - Name & Description
  const textA = `${itemA.name || itemA.title || ""} ${itemA.description || ""}`;
  const textB = `${itemB.name || itemB.title || ""} ${itemB.description || ""}`;
  const tokensTextA = tokenizeText(textA);
  const tokensTextB = tokenizeText(textB);
  score += calculateJaccardSimilarity(tokensTextA, tokensTextB) * 30.0;

  // 3. Location Proximity (25%) - Building & Area Parsing
  const tokensLocA = tokenizeText(itemA.location || "");
  const tokensLocB = tokenizeText(itemB.location || "");
  score += calculateJaccardSimilarity(tokensLocA, tokensLocB) * 25.0;

  // 4. Date Delta Decay (15%) - Elapsed Days Proximity
  const dateAVal = itemA.date_reported || itemA.date;
  const dateBVal = itemB.date_reported || itemB.date;
  if (dateAVal && dateBVal) {
    const dateA = new Date(dateAVal);
    const dateB = new Date(dateBVal);
    const diffDays = Math.abs((dateA - dateB) / (1000 * 60 * 60 * 24));
    // Exponential Decay: ยิ่งห่างวัน คะแนนยิ่งลด
    score += 15.0 * Math.exp(-0.1 * diffDays);
  }

  return Math.round(score * 100) / 100;
}