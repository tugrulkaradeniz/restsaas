'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { FolderPlus, UtensilsCrossed, Settings2, ImagePlus } from 'lucide-react'

export function MenuHelp() {
  return (
    <HelpButton
      title="Menü Yönetimi"
      intro="Kategori ve ürünlerinizi buradan oluşturup düzenlersiniz."
      steps={[
        { icon: FolderPlus, title: 'Kategori oluşturun', description: 'Çorbalar, Ana Yemekler gibi kategorileri ekleyip sıralamasını belirleyin.' },
        { icon: UtensilsCrossed, title: 'Ürün ekleyin', description: 'Her kategoriye ürün adı, fiyat, KDV oranı ve fotoğraf ile ürün ekleyin.' },
        { icon: Settings2, title: 'Seçenek grupları (⚙️)', description: 'Boyut, hamur kalınlığı gibi zorunlu/opsiyonel seçenek gruplarını ve fiyat farklarını tanımlayın.' },
        { icon: ImagePlus, title: 'Alerjen ve çıkarılabilir malzeme', description: 'Ürüne alerjen bilgisi ve müşterinin çıkarabileceği malzemeleri (soğansız vb.) ekleyin — QR menüde görünür.' },
      ]}
      tips={['Bir ürünü "Kullanılamaz" yaparsanız POS ve online menüden anında kalkar, silmek zorunda değilsiniz.']}
    />
  )
}
