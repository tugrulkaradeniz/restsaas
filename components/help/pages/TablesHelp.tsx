'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { LayoutGrid, MousePointerClick, QrCode } from 'lucide-react'

export function TablesHelp() {
  return (
    <HelpButton
      title="Masa Planı"
      intro="Restoranınızın masa düzenini oluşturup canlı durumunu izlersiniz."
      steps={[
        { icon: LayoutGrid, title: 'Masa ve düzen oluşturun', description: 'Masa ekleyip sürükle-bırak ile yerleşim planınızı çizin; kapasite ve şekil belirleyin.' },
        { icon: MousePointerClick, title: 'Renkler durumu gösterir', description: 'Yeşil: boş, kırmızı: dolu, turuncu: rezerve, gri: kirli/temizlenmeyi bekliyor.' },
        { icon: QrCode, title: 'QR kodları oluşturun', description: 'Sağ üstteki butonla her masa için ayrı QR kod üretip yazdırabilirsiniz — müşteri okutunca o masanın online menüsü açılır.' },
      ]}
    />
  )
}
