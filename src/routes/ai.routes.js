const router = require('express').Router();
const auth = require('../middleware/auth.middleware');

const gemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY bulunamadı');
  }

  const MODEL = 'gemini-2.0-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API hatası: ${response.status} - ${err}`);
  }

  const data = await response.json();
  console.log('Gemini cevabı:', JSON.stringify(data));

  if (!data.candidates || !data.candidates[0]) {
    throw new Error('Gemini boş yanıt döndü');
  }

  return data.candidates[0].content.parts[0].text.trim();
};

const TYPE_NAMES = {
  item: 'eşya satış',
  house: 'ev devretme',
  roommate: 'ev arkadaşı',
  job: 'part-time iş',
  internship: 'staj ilanı',
};

const TYPE_LABELS = {
  item: 'Eşya',
  house: 'Ev',
  roommate: 'Ev Arkadaşı',
  job: 'İş',
  internship: 'Staj',
};

const VALID_TYPES = Object.keys(TYPE_NAMES);

router.post('/improve-description', auth, async (req, res) => {
  console.log('GEMINI_API_KEY var mı:', !!process.env.GEMINI_API_KEY);
  console.log('İstek geldi:', req.body);
  const { title, description, type } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'Başlık ve açıklama zorunludur.' });
  }
  try {
    const improved = await gemini(
      `Sen bir ilan yazarısın. Aşağıdaki ${TYPE_NAMES[type] || 'ilan'} ilanının açıklamasını daha çekici ve profesyonel hale getir. Sadece iyileştirilmiş açıklamayı yaz, başka hiçbir şey ekleme.\n\nBaşlık: ${title}\nAçıklama: ${description}\n\nİyileştirilmiş açıklama:`
    );
    res.json({ improved });
  } catch (err) {
    console.error('AI hatası:', err.message);
    res.status(500).json({ message: 'AI servisi şu an kullanılamıyor.', detail: err.message });
  }
});

router.post('/suggest-category', auth, async (req, res) => {
  console.log('GEMINI_API_KEY var mı:', !!process.env.GEMINI_API_KEY);
  console.log('İstek geldi:', req.body);
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Başlık zorunludur.' });
  }
  try {
    const raw = await gemini(
      `Aşağıdaki ilan için en uygun kategoriyi seç. SADECE şu değerlerden birini yaz, başka hiçbir şey yazma: item, house, roommate, job, internship\n\nBaşlık: ${title}\nAçıklama: ${description || ''}\n\nKategori:`
    );
    const category = raw.toLowerCase().split('\n')[0].trim();
    const resolved = VALID_TYPES.includes(category) ? category : 'item';
    res.json({ category: resolved, label: TYPE_LABELS[resolved] });
  } catch (err) {
    console.error('AI hatası:', err.message);
    res.status(500).json({ message: 'AI servisi şu an kullanılamıyor.', detail: err.message });
  }
});

router.post('/suggest-price', auth, async (req, res) => {
  console.log('GEMINI_API_KEY var mı:', !!process.env.GEMINI_API_KEY);
  console.log('İstek geldi:', req.body);
  const { title, description, type, condition } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Başlık zorunludur.' });
  }
  try {
    const raw = await gemini(
      `Türkiye'de üniversite öğrencileri arasında yapılan ikinci el satışta bu ürün için makul fiyat aralığı öner. SADECE fiyat aralığını yaz, örnek: "150 - 250 TL"\n\nÜrün: ${title}\nDurum: ${condition || 'belirtilmemiş'}\n\nFiyat aralığı:`
    );
    res.json({ suggestion: raw.split('\n')[0].trim() });
  } catch (err) {
    console.error('AI hatası:', err.message);
    res.status(500).json({ message: 'AI servisi şu an kullanılamıyor.', detail: err.message });
  }
});

module.exports = router;
