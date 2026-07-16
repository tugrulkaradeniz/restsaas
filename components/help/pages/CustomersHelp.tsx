'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { UserPlus, Star, Gift, Search } from 'lucide-react'

export function CustomersHelp() {
  return (
    <HelpButton
      title="Müşteri & Sadakat"
      intro="Müşteri kayıtlarını ve puan bazlı sadakat programını yönetin."
      steps={[
        { icon: UserPlus, title: 'Müşteri ekleyin', description: 'İsim ve telefon ile yeni müşteri kaydı oluşturun; POS\'ta ödeme alırken aynı telefonla otomatik eşleşir.' },
        { icon: Star, title: 'Puan kazanma', description: 'Sadakat programı açıksa, ödenen siparişlerde müşteri otomatik puan kazanır (Ayarlar\'daki oran üzerinden).' },
        { icon: Gift, title: 'Puan kullanma', description: 'POS\'ta ödeme alırken müşterinin biriken puanları indirime çevrilebilir.' },
        { icon: Search, title: 'Ara ve filtrele', description: 'İsim veya telefonla listede hızlıca müşteri bulun.' },
      ]}
    />
  )
}
