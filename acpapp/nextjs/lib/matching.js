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

  const listA = [...new Set(tokensA)];
  const listB = [...new Set(tokensB)];

  const matchedA = listA.filter((a) => listB.some((b) => isTokenMatch(a, b))).length;
  const matchedB = listB.filter((b) => listA.some((a) => isTokenMatch(a, b))).length;

  const intersection = Math.min(matchedA, matchedB);
  const union = listA.length + listB.length - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

export function calculateMatchScore(itemA, itemB) {
  let score = 0.0;

  // 1. Text & Keyword Similarity (40%) - Name & Title Priority
  const textA = `${itemA.name || itemA.title || ""} ${itemA.description || ""}`;
  const textB = `${itemB.name || itemB.title || ""} ${itemB.description || ""}`;
  const tokensTextA = tokenizeText(textA);
  const tokensTextB = tokenizeText(textB);
  const textSimilarity = calculateJaccardSimilarity(tokensTextA, tokensTextB);

  // 🚫 STRICT CHECK: ถ้าชื่อสินค้าไม่มีความเกี่ยวข้องกันเลย (เช่น Mouse vs Laptop) 
  // ให้ปรับลดน้ำหนักคะแนน Category และจำกัดคะแนนรวมไม่ให้สูงเกินไป
  const nameA = tokenizeText(itemA.name || itemA.title || "");
  const nameB = tokenizeText(itemB.name || itemB.title || "");
  const nameSimilarity = calculateJaccardSimilarity(nameA, nameB);

  // 2. Category Match (25%)
  const catA = (itemA.category || "").trim().toLowerCase();
  const catB = (itemB.category || "").trim().toLowerCase();
  if (catA && catB && catA === catB) {
    // ถ้าหมวดหมู่ตรงกัน แต่ชื่อสินค้าไม่มีความเชื่อมโยงกันเลย จะได้คะแนนหมวดหมู่เพียงครึ่งเดียว
    score += (nameSimilarity === 0 && textSimilarity === 0) ? 10.0 : 25.0;
  }

  // บวกคะแนน Text Similarity (40%)
  score += textSimilarity * 40.0;

  // 3. Location Proximity (20%)
  const tokensLocA = tokenizeText(itemA.location || "");
  const tokensLocB = tokenizeText(itemB.location || "");
  score += calculateJaccardSimilarity(tokensLocA, tokensLocB) * 20.0;

  // 4. Date Delta Decay (15%)
  const dateAVal = itemA.date_reported || itemA.date;
  const dateBVal = itemB.date_reported || itemB.date;
  if (dateAVal && dateBVal) {
    const dateA = new Date(dateAVal);
    const dateB = new Date(dateBVal);
    const diffDays = Math.abs((dateA - dateB) / (1000 * 60 * 60 * 24));
    score += 15.0 * Math.exp(-0.1 * diffDays);
  }

  // 🔒 HARD CAP: ถ้าชื่อสินค้า (Name) ไม่มีความเกี่ยวข้องกันเลย ล็อคคะแนนรวมไม่เกิน 35%
  if (nameSimilarity === 0 && textSimilarity < 0.2) {
    score = Math.min(score, 35.0);
  }

  return Math.round(score * 100) / 100;
}