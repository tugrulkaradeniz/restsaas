'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { Building2, ImageIcon, Percent, Printer, Ruler, Type, Utensils, MapPin, Clock } from 'lucide-react'

export function BusinessSettingsHelp() {
  return (
    <HelpButton
      title="İşletme Ayarları"
      intro="Restoranınızın temel bilgilerini ve sadakat programını buradan düzenlersiniz."
      steps={[
        { icon: Building2, title: 'İşletme bilgileri', description: 'İsim, adres, telefon gibi bilgiler adisyon ve QR menüde görünür.' },
        { icon: ImageIcon, title: 'Logo yükleyin', description: 'Logo QR menüde ve müşteri ekranlarında marka görünürlüğü sağlar.' },
        { icon: Percent, title: 'Sadakat programı', description: 'Puan kazanma oranını açıp belirleyerek Müşteriler ekranındaki sadakat sistemini aktif edin.' },
      ]}
    />
  )
}

export function PrintSettingsHelp() {
  return (
    <HelpButton
      title="Baskı & Yazıcı"
      intro="Adisyon ve mutfak bileti çıktısının görünümünü özelleştirirsiniz."
      steps={[
        { icon: Ruler, title: 'Kağıt genişliği', description: '58mm/80mm termal yazıcı ya da A4 normal yazıcıya göre seçin.' },
        { icon: Type, title: 'Gösterilecek alanlar', description: 'Sipariş no, garson adı, KDV detayı gibi alanları açıp kapatın; alt mesajı özelleştirin.' },
        { icon: Printer, title: 'Test Yazdır', description: 'Ayarları kaydetmeden önce örnek bir fişle gerçek yazdırma çıktısını deneyin.' },
      ]}
      tips={['Bu ayarlar tarayıcıda saklanır — farklı bir kasa bilgisayarında ayrıca ayarlanması gerekir.']}
    />
  )
}

export function OnlineOrderSettingsHelp() {
  return (
    <HelpButton
      title="Online Sipariş Ayarları"
      intro="Web/mobil üzerinden gelen siparişleri açıp yapılandırırsınız."
      steps={[
        { icon: Utensils, title: 'Online sipariş aç/kapat', description: 'Kapalıyken restoranınız pazaryerinde (marketplace) sipariş alamaz duruma geçer.' },
        { icon: Utensils, title: 'Mutfak tipi ve konum', description: 'Mutfak tipi filtreleme ve mesafe hesaplaması için restoran konumunuzu belirleyin.' },
        { icon: Clock, title: 'Çalışma saatleri', description: 'Siparişin kabul edildiği gün/saat aralıklarını tanımlayın.' },
        { icon: MapPin, title: 'Teslimat bölgeleri', description: 'Bölge bazlı minimum sipariş tutarı ve teslimat ücreti belirleyin.' },
      ]}
    />
  )
}
