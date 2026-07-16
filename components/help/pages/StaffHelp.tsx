'use client'

import { HelpButton } from '@/components/help/HelpButton'
import { UserPlus2, ShieldCheck, TimerReset } from 'lucide-react'

export function StaffHelp() {
  return (
    <HelpButton
      title="Personel Yönetimi"
      intro="Çalışanlarınızı ve rollerini yönetin, günlük mesai aktivitesini izleyin."
      steps={[
        { icon: UserPlus2, title: 'Personel ekleyin', description: 'İsim, email ve rol belirleyerek yeni bir çalışan hesabı oluşturun; giriş için 8 haneli restoran koduyla email/şifre kullanılır.' },
        { icon: ShieldCheck, title: 'Rol atayın', description: 'Owner, manager, cashier, waiter, kitchen gibi roller ekranlara erişimi belirler.' },
        { icon: TimerReset, title: 'Bugünkü Aktivite sekmesi', description: 'Her personelin ekran başında geçirdiği süreyi, uzaklaşma sayısını ve şu an çevrimiçi olup olmadığını görün.' },
      ]}
    />
  )
}
