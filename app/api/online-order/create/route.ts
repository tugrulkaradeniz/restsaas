import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CartItem } from '@/components/order/RestaurantOrderPage'

export async function POST(req: Request) {
  try {
    const {
      tenantId, cart, deliveryType, deliveryZoneId, deliveryFee,
      customerName, customerPhone, customerEmail,
      deliveryAddress, deliveryLat, deliveryLng,
      orderNote, verificationToken,
    } = await req.json()

    if (!tenantId || !cart?.length || !verificationToken) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const service = createServiceClient()

    // Token doğrula
    const { data: vc } = await service
      .from('verified_customers')
      .select('id')
      .eq('verification_token', verificationToken)
      .single()

    if (!vc) return NextResponse.json({ error: 'Doğrulama geçersiz' }, { status: 401 })

    // Toplam hesapla
    const itemsTotal = (cart as CartItem[]).reduce((s, item) => {
      const unitPrice = item.basePrice + item.selectedOptions.reduce((os, o) => os + o.priceDelta, 0)
      return s + unitPrice * item.quantity
    }, 0)
    const totalAmount = itemsTotal + (deliveryFee ?? 0)

    // Sipariş oluştur
    const { data: order, error: orderErr } = await service.from('orders').insert({
      tenant_id: tenantId,
      source: 'online',
      status: 'pending',
      total_amount: totalAmount,
      discount_amount: 0,
      points_used: 0,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      delivery_address: deliveryAddress ?? null,
      delivery_lat: deliveryLat ?? null,
      delivery_lng: deliveryLng ?? null,
      delivery_type: deliveryType,
      delivery_zone_id: deliveryZoneId ?? null,
      delivery_fee: deliveryFee ?? 0,
      order_note: orderNote ?? null,
    }).select('id').single()

    if (orderErr || !order) return NextResponse.json({ error: orderErr?.message ?? 'Sipariş oluşturulamadı' }, { status: 500 })

    // Sipariş kalemleri
    const orderItems = (cart as CartItem[]).map(item => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.basePrice + item.selectedOptions.reduce((s, o) => s + o.priceDelta, 0),
      note: item.note || null,
      selected_options: item.selectedOptions.length > 0
        ? item.selectedOptions.map(o => ({ group_name: o.groupName, option_name: o.optionName, price_delta: o.priceDelta }))
        : null,
      status: 'pending',
    }))

    await service.from('order_items').insert(orderItems)

    // Son sipariş tarihini güncelle
    await service.from('verified_customers').update({ last_order_at: new Date().toISOString() }).eq('id', vc.id)

    return NextResponse.json({ orderId: order.id })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
