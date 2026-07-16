'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { Tag, MousePointerClick, PiggyBank, Power } from 'lucide-react'

export function CampaignsHelp() {
  return (
    <HelpButton
      title="Kampanyalar"
      intro="Menüde indirim ve promosyon oluşturup satışı artırın."
      steps={[
        { icon: Tag, title: 'Kampanya tipi seçin', description: 'Kategori indirimi, sipariş tutarı indirimi, mutlu saat, paket (bundle) ya da "1 alana 1 bedava" (BOGO) gibi tiplerden birini seçin.' },
        { icon: MousePointerClick, title: 'Ürün/kategori bağlayın', description: 'Kampanyanın hangi ürün veya kategorilere uygulanacağını seçin, tarih/saat aralığı belirleyin.' },
        { icon: PiggyBank, title: 'POS\'ta otomatik uygulanır', description: 'Aktif kampanyalar Siparişler ekranında sepete uygun ürün eklendiğinde otomatik indirim olarak hesaplanır.' },
        { icon: Power, title: 'Aç/kapat', description: 'Bir kampanyayı silmeden geçici olarak devre dışı bırakmak için aktiflik anahtarını kullanabilirsiniz.' },
      ]}
      tips={['Aynı anda birden fazla kampanya aktifse, müşteriye en avantajlı olan otomatik seçilir.']}
    />
  )
}
