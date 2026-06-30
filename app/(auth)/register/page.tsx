'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { UtensilsCrossed, Copy, Check } from 'lucide-react'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ restaurantName: '', fullName: '', email: '', password: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Bir hata oluştu.')
    } else {
      setCode(data.code)
    }
    setLoading(false)
  }

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Kayıt başarılı — kodu göster
  if (code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-xl mb-4">
            <Check size={28} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hesabınız Oluşturuldu!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Aşağıdaki restoran kodunu personellerinizle paylaşın.
            Giriş yaparken bu kodu kullanacaklar.
          </p>

          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Restoran Kodunuz</p>
            <p className="text-4xl font-mono font-bold text-gray-900 tracking-widest">{code}</p>
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-2 mx-auto mb-6 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            {copied ? 'Kopyalandı!' : 'Kodu Kopyala'}
          </button>

          <p className="text-sm text-gray-500">
            Giriş yapmak için bu kodu kullanabilirsiniz:{' '}
            <a
              href={`/login?code=${code}`}
              className="text-orange-500 hover:underline font-medium"
            >
              Giriş sayfasına git →
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl mb-4">
            <UtensilsCrossed size={22} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hesap Oluştur</h1>
          <p className="text-sm text-gray-500 mt-1">Restoranınızı ücretsiz kaydedin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restoran Adı</label>
            <input
              name="restaurantName"
              type="text"
              value={form.restaurantName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Lezzet Durağı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adınız Soyadınız</label>
            <input
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Ahmet Yılmaz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="ahmet@restoran.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="text-orange-500 hover:underline font-medium">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  )
}
