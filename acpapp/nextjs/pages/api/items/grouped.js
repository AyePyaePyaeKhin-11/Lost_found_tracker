import { calculateMatchScore } from '../../../lib/matching';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const backendRes = await fetch(`${backendUrl}/api/items`);

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      return res.status(backendRes.status).json({
        error: `Backend returned status ${backendRes.status}`,
        details: errorText,
      });
    }

    const items = await backendRes.json();

    // 1. กรองเฉพาะรายการที่ยังคงเปิดเคสอยู่ (status === 'open')
    const lostItems = items.filter((item) => item.type === 'lost' && item.status === 'open');
    const foundItems = items.filter((item) => item.type === 'found' && item.status === 'open');

    const MATCH_THRESHOLD = 20; // ปรับ Threshold ตามความเหมาะสม (เช่น 20%)
    const MAX_CANDIDATES = 5;    // จำกัดให้คืนค่าสูงสุด 5 รายการต่อกลุ่ม

    const groupedMatches = lostItems.map((lostItem) => {
      const matches = foundItems
        .map((foundItem) => {
          const score = calculateMatchScore(lostItem, foundItem);
          return {
            ...foundItem,
            match_score: score,
          };
        })
        // 2. กรองเฉพาะรายการที่คะแนนถึงเกณฑ์ Threshold
        .filter((item) => item.match_score >= MATCH_THRESHOLD) 
        .sort((a, b) => b.match_score - a.match_score)
        // 3. ตัดเอาเฉพาะ Top 5 รายการแรก
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