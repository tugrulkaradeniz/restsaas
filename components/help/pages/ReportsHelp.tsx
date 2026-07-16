'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { BarChart3, Wallet, Users, PercentCircle } from 'lucide-react'

export function ReportsHelp() {
  return (
    <HelpButton
      title="Raporlar"
      intro="Satış performansınızı ve gün sonu durumunuzu buradan izlersiniz."
      steps={[
        { icon: BarChart3, title: 'Ciro ve en çok satanlar', description: 'Seçili dönem için toplam ciro, sipariş sayısı, en çok satan ürünler ve günlük ciro grafiği.' },
        { icon: Wallet, title: 'Gün Sonu Özeti', description: 'Brüt ciro, indirim ve ödeme yöntemine (nakit/kart/POS) göre kırılımı görüp yazdırabilirsiniz.' },
        { icon: Users, title: 'Personel Satış Raporu', description: 'Hangi garsonun ne kadar ciro yaptığını, sipariş sayısı ve ortalama sipariş tutarıyla karşılaştırın.' },
        { icon: PercentCircle, title: 'KDV Raporu', description: 'Satılan ürünlerin KDV oranına göre kırılımını (KDV hariç/KDV/KDV dahil tutar) ve toplam tahsil edilen KDV\'yi gösterir.' },
      ]}
      tips={['Üstteki Bugün / Son 7 Gün / Son 30 Gün / Geçen Ay seçici tüm bölümleri aynı anda etkiler.']}
    />
  )
}
