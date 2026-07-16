'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { Receipt, Tags, CalendarRange } from 'lucide-react'

export function ExpensesHelp() {
  return (
    <HelpButton
      title="Gider Takibi"
      intro="İşletme giderlerinizi kategori bazında kaydedip takip edin."
      steps={[
        { icon: Receipt, title: 'Gider ekleyin', description: 'Tutar, tarih ve açıklama girerek kira, fatura, maaş gibi giderleri kaydedin.' },
        { icon: Tags, title: 'Kategorilere ayırın', description: 'Her gideri bir kategoriye atayarak hangi alana ne kadar harcadığınızı görün.' },
        { icon: CalendarRange, title: 'Tarihe göre inceleyin', description: 'Listeyi tarih aralığına göre filtreleyip dönemsel gider toplamını kontrol edin.' },
      ]}
    />
  )
}
