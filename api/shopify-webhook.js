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

    // Gerekli veriler var mı kontrol et
    if (!siparis || !shopifyConfig || !shopifyConfig.store || !shopifyConfig.token) {
      return res.status(400).json({ 
        error: 'Eksik veri: siparis ve shopifyConfig gerekli' 
      });
    }

    // Shopify sipariş formatına çevir
    const shopifyOrder = {
      order: {
        email: 'musteri@example.com',
        fulfillment_status: null,
        send_receipt: false,
        send_fulfillment_receipt: false,
        note: `Web sitesinden otomatik aktarılan sipariş - ${siparis.siparisNo}`,
        tags: `web-sitesi, otomatik, forum-${siparis.forum}`,
        customer: {
          first_name: siparis.musteri.split(' ')[0] || siparis.musteri,
          last_name: siparis.musteri.split(' ').slice(1).join(' ') || '',
          email: 'musteri@example.com',
          phone: siparis.telefon ? '+90' + siparis.telefon : ''
        },
        billing_address: {
          first_name: siparis.musteri.split(' ')[0] || siparis.musteri,
          last_name: siparis.musteri.split(' ').slice(1).join(' ') || '',
          address1: siparis.adres || '',
          city: siparis.il || '',
          province: siparis.il || '',
          country: 'Turkey',
          zip: '00000',
          phone: siparis.telefon ? '+90' + siparis.telefon : ''
        },
        shipping_address: {
          first_name: siparis.musteri.split(' ')[0] || siparis.musteri,
          last_name: siparis.musteri.split(' ').slice(1).join(' ') || '',
          address1: siparis.adres || '',
          city: siparis.il || '',
          province: siparis.il || '',
          country: 'Turkey',
          zip: '00000',
          phone: siparis.telefon ? '+90' + siparis.telefon : ''
        },
        line_items: [{
          title: siparis.urunAdi || 'Ürün',
          quantity: parseInt(siparis.adet) || 1,
          price: calculatePrice(siparis.tutar),
          variant_title: siparis.adet || '1 Adet',
          vendor: 'Web Sitesi',
          product_exists: false,
          fulfillment_service: 'manual'
        }],
        financial_status: 'pending',
        total_price: calculatePrice(siparis.tutar),
        currency: 'USD', // Shopify USD tercih ediyor
        payment_gateway_names: [siparis.odemeYontemi || 'Kapıda Ödeme']
      }
    };

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Shopify sipariş başarılı:', result.order.order_number);

    return res.status(200).json({
      success: true,
      shopifyOrderId: result.order.id,
      shopifyOrderNumber: result.order.order_number,
      message: `Sipariş #${result.order.order_number} Shopify'a aktarıldı`
    });

  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    
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