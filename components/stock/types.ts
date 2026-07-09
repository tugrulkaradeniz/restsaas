export type PaymentStatus = 'pending' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'bank' | 'card' | 'check'

export interface StockEntryItem {
  id: string
  entry_id: string
  ingredient_id: string
  quantity: number
  unit_cost: number
  kdv_rate: number
  kdv_included: boolean
  kdv_amount: number
  total: number
  ingredient?: { name: string; unit: string } | null
}

export interface StockPayment {
  id: string
  entry_id: string
  amount: number
  method: PaymentMethod
  paid_at: string
  note: string | null
}

export interface StockEntry {
  id: string
  tenant_id: string
  supplier_id: string | null
  invoice_no: string | null
  invoice_date: string
  due_date: string | null
  subtotal: number
  kdv_amount: number
  total_amount: number
  paid_amount: number
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  supplier?: { name: string } | null
  items?: StockEntryItem[]
}

export type StockMovementType = 'order' | 'purchase' | 'adjustment'

export interface StockMovement {
  id: string
  tenant_id: string
  ingredient_id: string
  type: StockMovementType
  quantity_change: number
  resulting_qty: number
  order_id: string | null
  entry_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
  ingredient?: { name: string; unit: string } | null
}
