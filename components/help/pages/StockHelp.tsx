'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { Boxes, Truck, FileText, History } from 'lucide-react'

export function StockHelp() {
  return (
    <HelpButton
      title="Stok & Muhasebe"
      intro="Malzeme stoklarını, tedarikçileri ve faturaları buradan yönetirsiniz."
      steps={[
        { icon: Boxes, title: 'Malzemeler', description: 'Her malzeme için birim, mevcut stok ve minimum stok eşiği tanımlayın — eşiğin altına düşünce Genel Bakış\'ta uyarı çıkar.' },
        { icon: Truck, title: 'Tedarikçiler', description: 'Malzeme aldığınız tedarikçileri kaydedin, faturaları onlara bağlayın.' },
        { icon: FileText, title: 'Fatura / Stok Girişi', description: 'Gelen malzeme faturasını girin, KDV\'yi satır satır işleyin — stok otomatik artar.' },
        { icon: History, title: 'Hareketler', description: 'Sipariş, alım veya manuel düzeltme yüzünden her stok değişikliği burada tarih/tip bazlı loglanır.' },
      ]}
      tips={['Reçete tanımlı ürünler satıldığında ilgili malzeme stoğu otomatik düşer, elle stok girmenize gerek kalmaz.']}
    />
  )
}
