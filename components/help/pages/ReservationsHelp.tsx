'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { CalendarPlus, Armchair, BellRing } from 'lucide-react'

export function ReservationsHelp() {
  return (
    <HelpButton
      title="Rezervasyonlar"
      intro="Masa rezervasyonlarını oluşturup takip edin."
      steps={[
        { icon: CalendarPlus, title: 'Rezervasyon oluşturun', description: 'Müşteri adı, telefon, kişi sayısı, tarih/saat ve isteğe bağlı masa seçerek rezervasyon kaydedin.' },
        { icon: Armchair, title: 'Masa otomatik rezerve olur', description: 'Masa seçtiyseniz, o masa Masa Planı ve Siparişler ekranında rezervasyon saatinde "Rezerve" (turuncu) görünür; misafir gelip sipariş açılınca otomatik günceller.' },
        { icon: BellRing, title: 'Durum takibi', description: 'Bekliyor/Onaylandı/İptal/Tamamlandı durumları arasında geçiş yaparak listeyi güncel tutun.' },
      ]}
      tips={['Aynı masaya aynı gün ±2 saat içinde ikinci bir rezervasyon eklemeye çalışırsanız sistem sizi uyarır.']}
    />
  )
}
