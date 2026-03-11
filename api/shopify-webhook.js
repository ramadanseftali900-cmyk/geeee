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
    console.log('📦 Webhook tetiklendi:', JSON.stringify(req.body, null, 2));

    const { siparis, shopifyConfig } = req.body;

    // Gerekli veriler var mı kontrol et
    if (!siparis || !shopifyConfig || !shopifyConfig.store || !shopifyConfig.token) {
      console.log('❌ Eksik veri:', { siparis: !!siparis, shopifyConfig: !!shopifyConfig });
      return res.status(400).json({ 
        error: 'Eksik veri: siparis ve shopifyConfig gerekli',
        received: { siparis: !!siparis, shopifyConfig: !!shopifyConfig }
      });
    }

    // En minimal Shopify sipariş formatı
    const shopifyOrder = {
      order: {
        line_items: [{
          title: siparis.urunAdi || 'Web Sitesi Ürünü',
          quantity: 1,
          price: '1.00'
        }],
        financial_status: 'pending'
      }
    };

    console.log('📤 Shopify\'a gönderiliyor:', JSON.stringify(shopifyOrder, null, 2));

    // Shopify API'ye gönder
    const apiUrl = `https://${shopifyConfig.store}/admin/api/2023-10/orders.json`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifyConfig.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopifyOrder)
    });

    const responseText = await response.text();
    console.log('📥 Shopify yanıtı:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`Shopify API Error ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    
    console.log('✅ Shopify sipariş başarılı:', result.order?.order_number || result.order?.id);

    return res.status(200).json({
      success: true,
      shopifyOrderId: result.order?.id,
      shopifyOrderNumber: result.order?.order_number,
      message: `Sipariş #${result.order?.order_number || result.order?.id} Shopify'a aktarıldı`
    });

  } catch (error) {
    console.error('❌ Webhook hatası:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Shopify sipariş aktarımında hata oluştu'
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