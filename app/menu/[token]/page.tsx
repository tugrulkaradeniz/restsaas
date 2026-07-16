import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { CallWaiterButton } from '@/components/menu/CallWaiterButton'
import type { MenuCategory, MenuItem, Campaign } from '@/types/database'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

type FullCategory = MenuCategory & { items: MenuItem[] }

interface Props {
  params: { token: string }
}

const CAMPAIGN_LABEL: Record<string, string> = {
  percent:    '% İndirim',
  fixed:      '₺ İndirim',
  free_item:  'Ücretsiz Ürün',
  happy_hour: 'Mutlu Saat',
}

const CAMPAIGN_BG: Record<string, string> = {
  percent:    'bg-orange-500',
  fixed:      'bg-green-500',
  free_item:  'bg-purple-500',
  happy_hour: 'bg-blue-500',
}

export default async function QrMenuPage({ params }: Props) {
  noStore()
  const service = createServiceClient()

  const { data: table } = await service
    .from('tables')
    .select('id, name, tenant_id')
    .eq('qr_token', params.token)
    .single()

  if (!table) notFound()

  const now = new Date()
  const todayStr  = now.toISOString().split('T')[0]
  const timeStr   = now.toTimeString().slice(0, 5) // "HH:MM"

  const [{ data: categories }, { data: tenant }, { data: campaigns }] = await Promise.all([
    service
      .from('menu_categories')
      .select('*, items:menu_items(*)')
      .eq('tenant_id', table.tenant_id)
      .eq('is_active', true)
      .order('sort_order'),
    service.from('tenants').select('name, address, logo_url').eq('id', table.tenant_id).single(),
    service
      .from('campaigns')
      .select('*')
      .eq('tenant_id', table.tenant_id)
      .eq('is_active', true),
  ])

  const cats = (categories ?? []) as FullCategory[]
  const activeCats = cats.map(c => ({
    ...c,
    items: (c.items ?? []).filter(i => i.is_available && i.is_visible_selfservis),
  })).filter(c => c.items.length > 0)

  // Bugün geçerli kampanyalar
  const activeCampaigns = ((campaigns ?? []) as Campaign[]).filter(c => {
    if (c.valid_from && todayStr < c.valid_from) return false
    if (c.valid_to   && todayStr > c.valid_to)   return false
    if (c.type === 'happy_hour' && c.start_time && c.end_time) {
      if (timeStr < c.start_time || timeStr > c.end_time) return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name ?? 'Logo'}
              className="h-12 mx-auto object-contain mb-1"
            />
          ) : (
            <h1 className="text-lg font-bold text-gray-900 text-center">{tenant?.name ?? 'Menü'}</h1>
          )}
          {tenant?.logo_url && (
            <p className="text-sm font-semibold text-gray-800 text-center">{tenant.name}</p>
          )}
          {tenant?.address && (
            <p className="text-xs text-gray-400 text-center mt-0.5">{tenant.address}</p>
          )}
          <div className="mt-1 text-center">
            <span className="inline-block bg-orange-100 text-orange-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {table.name}
            </span>
          </div>
        </div>

        {/* Category tabs */}
        {activeCats.length > 1 && (
          <div className="overflow-x-auto border-t">
            <div className="flex gap-0 max-w-lg mx-auto">
              {activeCats.map(c => (
                <a
                  key={c.id}
                  href={`#cat-${c.id}`}
                  className="shrink-0 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-orange-600 whitespace-nowrap border-b-2 border-transparent hover:border-orange-500 transition-colors"
                >
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Kampanyalar */}
      {activeCampaigns.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            🎉 Günün Fırsatları
          </h2>
          <div className="space-y-2">
            {activeCampaigns.map(c => (
              <div key={c.id} className="bg-white border rounded-xl p-3.5 flex items-center gap-3">
                <div className={`${CAMPAIGN_BG[c.type] ?? 'bg-gray-500'} text-white text-xs font-bold px-2 py-1 rounded-lg shrink-0`}>
                  {c.type === 'percent' ? `%${c.value}` : c.type === 'fixed' ? `${c.value}₺` : CAMPAIGN_LABEL[c.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  {c.type === 'happy_hour' && c.start_time && c.end_time && (
                    <p className="text-xs text-gray-400 mt-0.5">{c.start_time} – {c.end_time} arası</p>
                  )}
                  {c.min_order_amount && (
                    <p className="text-xs text-gray-400 mt-0.5">Minimum {c.min_order_amount}₺ siparişte</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-8 pb-32">
        {activeCats.map(cat => (
          <section key={cat.id} id={`cat-${cat.id}`}>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
              {cat.name}
            </h2>
            <div className="space-y-2">
              {cat.items.map(item => (
                <div key={item.id} className="bg-white rounded-xl border p-4 flex gap-3 active:scale-[0.99] transition-transform">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                      <p className="text-orange-600 font-bold text-sm shrink-0">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.price)} ₺
                      </p>
                    </div>
                    {item.description_public && (
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.description_public}</p>
                    )}
                    {item.calories && (
                      <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {item.calories} kcal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {activeCats.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p>Menü şu an görüntülenemiyor</p>
          </div>
        )}
      </div>

      {/* Floating waiter call button */}
      <CallWaiterButton tableId={table.id} tableName={table.name} />

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t py-2 text-center">
        <p className="text-xs text-gray-400">Garson çağırabilir veya personelimize bildirebilirsiniz</p>
      </div>
    </div>
  )
}
