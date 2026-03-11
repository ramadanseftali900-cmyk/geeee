// 🚀 VERCEL WEBHOOK FONKSİYONU - Otomatik Shopify Sipariş Aktarımı

export default async function handler(req, res) {
  // CORS headers ekle
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET request için test response
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Shopify Webhook aktif!', 
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  }

  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Webhook tetiklendi:', req.body);

    const { siparis, shopifyConfig } = req.body;

    // Basit test response - gerçek Shopify API'sini çağırmadan
    console.log('✅ Test: Sipariş alındı:', siparis?.siparisNo);
    
    return res.status(200).json({
      success: true,
      message: 'Test başarılı - Shopify entegrasyonu çalışıyor',
      siparisNo: siparis?.siparisNo || 'test',
      shopifyOrderNumber: '#TEST-' + Date.now()
    });

  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Webhook test hatası'
    });
  }
}

// Fiyat hesaplama fonksiyonu (TL'den USD'ye çevrim)
function calculatePrice(tutarStr) {
  if (!tutarStr) return '0.00';
  
  // Sadece rakamları al
  const tutar = parseInt(tutarStr.replace(/[^0-9]/g, '')) || 0;
  
  // TL'yi USD'ye çevir (yaklaşık kur: 1 USD = 30 TL)
  const usdPrice = (tutar / 30).toFixed(2);
  
  return usdPrice;
}