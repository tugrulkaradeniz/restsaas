import Link from 'next/link'
import {
  UtensilsCrossed, LayoutGrid, Globe, Boxes, BarChart3, CalendarPlus, Star,
  ArrowRight, CheckCircle2, ShoppingBag, ChefHat,
} from 'lucide-react'

const OWNER_POINTS = [
  'Masa planı ve POS ile hızlı sipariş alın, mutfağa anında iletin',
  'Online sipariş platformunda yer alın, yeni müşterilere ulaşın',
  'Stok, gider ve KDV raporlarıyla işletmenizi kontrol altında tutun',
  'Personel yönetimi ve mesai takibini tek panelden yapın',
]

const CUSTOMER_POINTS = [
  'Yakınınızdaki restoranları keşfedin',
  'Online sipariş verin — teslimat veya gel-al seçin',
  'Sipariş geçmişinizi ve adreslerinizi tek yerden yönetin',
]

const FEATURES = [
  { icon: LayoutGrid, title: 'Masa & POS Yönetimi', desc: 'Masa planı, sipariş alma ve ödeme tek ekranda.' },
  { icon: Globe, title: 'Online Sipariş Platformu', desc: 'Kendi sipariş sayfanız + pazaryerinde görünürlük.' },
  { icon: Boxes, title: 'Stok & Muhasebe', desc: 'Malzeme, tedarikçi ve fatura takibi otomatik.' },
  { icon: BarChart3, title: 'Raporlar & Analiz', desc: 'Ciro, KDV, personel ve gün sonu raporları.' },
  { icon: CalendarPlus, title: 'Rezervasyon Yönetimi', desc: 'Masa rezervasyonları otomatik masaya bağlanır.' },
  { icon: Star, title: 'Sadakat Programı', desc: 'Müşterileriniz puan kazansın, tekrar gelsin.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-orange-500" />
            </div>
            <span className="font-bold text-gray-900">RestSaas</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              Restoran Girişi
            </Link>
            <Link href="/register" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors">
              Restoran Kaydet
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <span className="inline-block px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold mb-5">
          Restoran Yönetim Platformu
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
          Restoranınızı Baştan Sona Dijitalleştirin
        </h1>
        <p className="text-gray-500 text-lg mt-5 max-w-xl mx-auto">
          Masa siparişinden online sipariş platformuna, stok takibinden raporlamaya kadar
          restoranınızı yönetmek için ihtiyacınız olan her şey tek panelde.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-semibold transition-colors"
          >
            Ücretsiz Restoran Kaydet <ArrowRight size={18} />
          </Link>
          <Link
            href="/order"
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-orange-300 text-gray-700 px-6 py-3.5 rounded-xl font-semibold transition-colors"
          >
            <ShoppingBag size={18} /> Online Sipariş Ver
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-5">
          Zaten hesabınız var mı? <Link href="/login" className="text-orange-500 font-medium hover:text-orange-600">Giriş yapın →</Link>
        </p>
      </section>

      {/* Nasıl faydalanırsınız */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Nasıl Faydalanırsınız?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border p-8">
              <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <ChefHat size={20} className="text-orange-500" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-4">Restoran Sahibiyseniz</h3>
              <ul className="space-y-3 mb-6">
                {OWNER_POINTS.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-orange-500 mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="inline-flex items-center gap-1.5 text-orange-500 font-semibold text-sm hover:text-orange-600">
                Restoranınızı Ücretsiz Kaydedin <ArrowRight size={15} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border p-8">
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag size={20} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-4">Müşteriyseniz</h3>
              <ul className="space-y-3 mb-6">
                {CUSTOMER_POINTS.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-purple-500 mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/order" className="inline-flex items-center gap-1.5 text-purple-600 font-semibold text-sm hover:text-purple-700">
                Restoranları Keşfedin <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Özellikler */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Tek Panelde Her Şey</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="p-5 rounded-xl border hover:border-orange-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                <f.icon size={18} className="text-orange-500" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
              <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alt CTA */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Hemen Başlayın</h2>
          <p className="text-gray-400 text-sm mb-8">
            Restoranınızı yönetmeye ya da sipariş vermeye hazır mısınız?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/order" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-900 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors">
              <ShoppingBag size={16} /> Online Sipariş Ver
            </Link>
            <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors">
              Restoran Girişi
            </Link>
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
              Restoran Kaydet
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} RestSaas — Restoran Yönetim Platformu
      </footer>
    </div>
  )
}
