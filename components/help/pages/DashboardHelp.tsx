'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { LayoutDashboard, BellRing, BarChart3, PackageSearch } from 'lucide-react'

export function DashboardHelp() {
  return (
    <HelpButton
      title="Genel Bakış"
      intro="Restoranınızın günlük durumunu tek ekranda özetler."
      steps={[
        { icon: LayoutDashboard, title: 'KPI kartları', description: 'Bugünkü ciro, sipariş sayısı, aktif sipariş ve bugünkü rezervasyon sayısını üstte görürsünüz.' },
        { icon: BellRing, title: 'Bekleyen garson çağrıları', description: 'Müşteri QR menüden garson çağırdıysa burada anında görünür.' },
        { icon: BarChart3, title: 'Ciro grafiği ve en çok satanlar', description: 'Son 7 günün ciro grafiği ile bugün en çok satılan ürünleri karşılaştırın.' },
        { icon: PackageSearch, title: 'Düşük stok uyarısı', description: 'Minimum stok seviyesinin altına düşen malzemeler burada listelenir, Stok ekranına gitmeden fark edersiniz.' },
      ]}
    />
  )
}
