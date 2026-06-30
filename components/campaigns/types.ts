export type CampaignType = 'happy_hour' | 'bundle' | 'bogo' | 'category' | 'order_discount'
export type DiscountType = 'percent' | 'fixed'

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  happy_hour:     'Saatli İndirim',
  bundle:         'Kombo Menü',
  bogo:           'N Al M Bedava',
  category:       'Kategori İndirimi',
  order_discount: 'Sipariş İndirimi',
}

export const DAYS = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 0, label: 'Paz' },
]

export interface CampaignItem {
  id: string
  campaign_id: string
  item_type: 'product' | 'category'
  menu_item_id: string | null
  category_id: string | null
  quantity: number
  role: 'main' | 'free' | 'bundled'
  menu_item?: { id: string; name: string; price: number } | null
  category?: { id: string; name: string } | null
}

export interface Campaign {
  id: string
  tenant_id: string
  name: string
  type: CampaignType
  is_active: boolean
  description: string | null
  discount_type: DiscountType | null
  value: number
  bundle_price: number | null
  min_order_amount: number | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[] | null
  valid_from: string | null
  valid_to: string | null
  created_at: string
  items?: CampaignItem[]
}
