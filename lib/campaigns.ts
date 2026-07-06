import type { Campaign } from '@/components/campaigns/types'

export interface DiscountCartLine {
  menuItemId: string
  price: number
  qty: number
}

export interface CategoryLookup {
  id: string
  items: { id: string }[]
}

export interface CampaignDiscount {
  campaignId: string
  campaignName: string
  amount: number
}

function isCampaignEligibleNow(c: Campaign, now: Date): boolean {
  if (!c.is_active) return false

  const todayStr = now.toISOString().slice(0, 10)
  if (c.valid_from && todayStr < c.valid_from) return false
  if (c.valid_to && todayStr > c.valid_to) return false

  if (c.days_of_week && c.days_of_week.length > 0) {
    if (!c.days_of_week.includes(now.getDay())) return false
  }

  if (c.start_time && c.end_time) {
    const hm = now.toTimeString().slice(0, 5)
    const start = c.start_time.slice(0, 5)
    const end = c.end_time.slice(0, 5)
    if (start <= end) {
      if (hm < start || hm > end) return false
    } else {
      // Gece yarısını geçen aralık (örn. 22:00–02:00)
      if (hm < start && hm > end) return false
    }
  }

  return true
}

function categoryIdOf(menuItemId: string, categories: CategoryLookup[]): string | null {
  const cat = categories.find(c => c.items.some(i => i.id === menuItemId))
  return cat?.id ?? null
}

function discountFromValue(type: 'percent' | 'fixed' | null, value: number, base: number): number {
  if (base <= 0) return 0
  if (type === 'fixed') return Math.min(value, base)
  return base * (value / 100)
}

function computeSingleCampaignDiscount(
  campaign: Campaign,
  cart: DiscountCartLine[],
  categories: CategoryLookup[]
): number {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  if (subtotal <= 0) return 0

  switch (campaign.type) {
    case 'order_discount': {
      if (campaign.min_order_amount && subtotal < campaign.min_order_amount) return 0
      return discountFromValue(campaign.discount_type, campaign.value, subtotal)
    }

    case 'category': {
      const catId = (campaign.items ?? [])[0]?.category_id
      if (!catId) return 0
      const catSubtotal = cart
        .filter(i => categoryIdOf(i.menuItemId, categories) === catId)
        .reduce((s, i) => s + i.price * i.qty, 0)
      return discountFromValue(campaign.discount_type, campaign.value, catSubtotal)
    }

    case 'happy_hour': {
      const targetIds = (campaign.items ?? [])
        .filter(i => i.item_type === 'product')
        .map(i => i.menu_item_id)
      const targetSubtotal = targetIds.length === 0
        ? subtotal
        : cart.filter(i => targetIds.includes(i.menuItemId)).reduce((s, i) => s + i.price * i.qty, 0)
      return discountFromValue(campaign.discount_type, campaign.value, targetSubtotal)
    }

    case 'bundle': {
      const rows = (campaign.items ?? []).filter(i => i.role === 'bundled' && i.menu_item_id)
      if (rows.length === 0) return 0
      const canForm = rows.every(r => {
        const inCart = cart.find(i => i.menuItemId === r.menu_item_id)
        return (inCart?.qty ?? 0) >= r.quantity
      })
      if (!canForm) return 0
      const originalPrice = rows.reduce((s, r) => {
        const inCart = cart.find(i => i.menuItemId === r.menu_item_id)
        return s + (inCart?.price ?? 0) * r.quantity
      }, 0)
      if (campaign.bundle_price != null) {
        return Math.max(0, originalPrice - campaign.bundle_price)
      }
      return discountFromValue(campaign.discount_type, campaign.value, originalPrice)
    }

    case 'bogo': {
      const main = (campaign.items ?? []).find(i => i.role === 'main')
      const free = (campaign.items ?? []).find(i => i.role === 'free')
      if (!main?.menu_item_id || !free) return 0
      const inCart = cart.find(i => i.menuItemId === main.menu_item_id)
      if (!inCart) return 0
      const setSize = main.quantity + free.quantity
      const sets = Math.floor(inCart.qty / setSize)
      if (sets <= 0) return 0
      const freeUnits = sets * free.quantity
      return freeUnits * inCart.price
    }

    default:
      return 0
  }
}

export function computeBestCampaignDiscount(
  cart: DiscountCartLine[],
  campaigns: Campaign[],
  categories: CategoryLookup[],
  now: Date = new Date()
): CampaignDiscount | null {
  let best: CampaignDiscount | null = null
  for (const campaign of campaigns) {
    if (!isCampaignEligibleNow(campaign, now)) continue
    const amount = computeSingleCampaignDiscount(campaign, cart, categories)
    if (amount > 0 && (!best || amount > best.amount)) {
      best = { campaignId: campaign.id, campaignName: campaign.name, amount }
    }
  }
  return best
}
