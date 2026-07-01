'use client'

import { useState, useCallback } from 'react'
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FloorPlan, Table, Reservation, FloorPlanTable, TableStatus } from '@/types/database'
import { Plus, Save, Pencil, Trash2 } from 'lucide-react'

const STATUS_COLORS: Record<TableStatus, string> = {
  empty:    '#22c55e',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  dirty:    '#6b7280',
}

type LocalTable = Table & { orders?: { id: string; status: string }[] }

interface Props {
  tenantId: string
  initialFloorPlans: FloorPlan[]
  tables: LocalTable[]
  todayReservations: Reservation[]
}

const TABLE_W = 80
const TABLE_H = 60
const SHAPES: { value: 'rectangle' | 'round'; label: string }[] = [
  { value: 'rectangle', label: 'Dikdörtgen' },
  { value: 'round', label: 'Yuvarlak' },
]

export function FloorPlanEditor({ tenantId, initialFloorPlans, tables: propTables, todayReservations }: Props) {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>(initialFloorPlans)
  const [activeFloorPlanIdx, setActiveFloorPlanIdx] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [localTables, setLocalTables] = useState<LocalTable[]>(propTables)

  // Yeni masa formu
  const [showNewTableForm, setShowNewTableForm] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableShape, setNewTableShape] = useState<'rectangle' | 'round'>('rectangle')
  const [creatingTable, setCreatingTable] = useState(false)

  const supabase = createClient()
  const activeFloorPlan = floorPlans[activeFloorPlanIdx]
  const layout = activeFloorPlan?.layout ?? { tables: [], walls: [] }

  const getTableStatus = useCallback((tableId: string): TableStatus => {
    const table = localTables.find((t) => t.id === tableId)
    if (!table) return 'empty'
    const hasActive = table.orders?.some((o) =>
      ['confirmed', 'preparing', 'ready', 'delivered'].includes(o.status)
    )
    if (hasActive) return 'occupied'
    const isReserved = todayReservations.some((r) => r.table_id === tableId)
    if (isReserved) return 'reserved'
    return table.status
  }, [localTables, todayReservations])

  function handleDragEnd(e: KonvaEventObject<DragEvent>, tableId: string) {
    const updated = layout.tables.map((t) =>
      t.id === tableId ? { ...t, x: e.target.x(), y: e.target.y() } : t
    )
    updateLayout({ ...layout, tables: updated })
  }

  function updateLayout(newLayout: FloorPlan['layout']) {
    setFloorPlans((prev) =>
      prev.map((fp, i) =>
        i === activeFloorPlanIdx ? { ...fp, layout: newLayout } : fp
      )
    )
  }

  function addTableToCanvas(tableId: string, shape: 'rectangle' | 'round' = 'rectangle') {
    const already = layout.tables.find((t) => t.id === tableId)
    if (already) { toast.error('Bu masa zaten planda var'); return }
    const newEntry: FloorPlanTable = { id: tableId, x: 120 + Math.random() * 200, y: 100 + Math.random() * 200, rotation: 0, shape }
    updateLayout({ ...layout, tables: [...layout.tables, newEntry] })
  }

  function removeFromCanvas(tableId: string) {
    updateLayout({ ...layout, tables: layout.tables.filter((t) => t.id !== tableId) })
    setSelectedId(null)
  }

  async function createNewTable() {
    if (!newTableName.trim()) { toast.error('Masa adı girin'); return }
    setCreatingTable(true)
    const { data, error } = await supabase
      .from('tables')
      .insert({ tenant_id: tenantId, name: newTableName.trim(), capacity: parseInt(newTableCapacity) || 4 })
      .select()
      .single()
    setCreatingTable(false)
    if (error) { toast.error(error.message); return }
    const newLocal: LocalTable = { ...data, orders: [] }
    setLocalTables((prev) => [...prev, newLocal])
    addTableToCanvas(data.id, newTableShape)
    setNewTableName('')
    setNewTableCapacity('4')
    setShowNewTableForm(false)
    toast.success(`${data.name} oluşturuldu`)
  }

  async function saveLayout() {
    if (!activeFloorPlan) return
    setSaving(true)
    const { error } = await supabase
      .from('floor_plans')
      .upsert({ ...activeFloorPlan })
    if (error) toast.error('Kaydedilemedi: ' + error.message)
    else toast.success('Plan kaydedildi')
    setSaving(false)
  }

  async function addNewFloorPlan() {
    const name = prompt('Alan adı:')
    if (!name) return
    const { data, error } = await supabase
      .from('floor_plans')
      .insert({ tenant_id: tenantId, name, layout: { tables: [], walls: [] } })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setFloorPlans((prev) => [...prev, data])
    setActiveFloorPlanIdx(floorPlans.length)
  }

  const tablesNotOnCanvas = localTables.filter(
    (t) => !layout.tables.find((lt) => lt.id === t.id)
  )

  return (
    <div className="flex gap-4">
      {/* Sol panel */}
      <div className="w-52 flex flex-col gap-3">
        {/* Alan sekmeleri */}
        <div className="bg-white rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alanlar</span>
            <button onClick={addNewFloorPlan} className="text-orange-500 hover:text-orange-600">
              <Plus size={16} />
            </button>
          </div>
          {floorPlans.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Alan yok — ekle</p>
          )}
          {floorPlans.map((fp, i) => (
            <button
              key={fp.id}
              onClick={() => { setActiveFloorPlanIdx(i); setSelectedId(null) }}
              className={cn(
                'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors',
                i === activeFloorPlanIdx ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {fp.name}
            </button>
          ))}
        </div>

        {/* Yeni masa oluştur */}
        {isEditMode && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Yeni Masa</p>
            {showNewTableForm ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createNewTable()}
                  placeholder="Masa 1, Teras A…"
                  className="w-full border rounded-lg px-2 py-1.5 text-xs"
                />
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-gray-500 shrink-0">Kapasite</span>
                  <input
                    type="number" min="1" max="20"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-16 border rounded-lg px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setNewTableShape(s.value)}
                      className={cn(
                        'flex-1 py-1 rounded-lg text-xs border transition-colors',
                        newTableShape === s.value ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={createNewTable}
                    disabled={creatingTable}
                    className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-xs disabled:opacity-50"
                  >
                    {creatingTable ? '...' : 'Oluştur'}
                  </button>
                  <button
                    onClick={() => { setShowNewTableForm(false); setNewTableName('') }}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewTableForm(true)}
                className="w-full text-sm px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Plus size={14} className="text-orange-500" /> Yeni Masa Ekle
              </button>
            )}
          </div>
        )}

        {/* Plana eklenecek mevcut masalar */}
        {isEditMode && tablesNotOnCanvas.length > 0 && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plana Ekle</p>
            <div className="space-y-1">
              {tablesNotOnCanvas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addTableToCanvas(t.id)}
                  className="w-full text-left text-sm px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Plus size={14} className="text-orange-500" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-xl border p-3 space-y-1.5">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              {{ empty: 'Boş', occupied: 'Dolu', reserved: 'Rezerve', dirty: 'Kirli' }[status]}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <span className="font-medium text-sm text-gray-700">
            {activeFloorPlan?.name ?? 'Alan seçin veya oluşturun'}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode && selectedId && (
              <button
                onClick={() => removeFromCanvas(selectedId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm"
              >
                <Trash2 size={14} /> Kaldır
              </button>
            )}
            <button
              onClick={() => { setIsEditMode((v) => !v); setSelectedId(null) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                isEditMode ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isEditMode ? <><Pencil size={14} /> Düzenleniyor</> : <><Pencil size={14} /> Düzenle</>}
            </button>
            {isEditMode && (
              <button
                onClick={saveLayout}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            )}
          </div>
        </div>

        {!activeFloorPlan ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <p>Önce sol panelden bir alan seçin veya oluşturun</p>
          </div>
        ) : layout.tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <p className="text-sm font-medium">Bu alanda henüz masa yok</p>
            <p className="text-xs text-gray-300">
              Sağ üstteki <strong className="text-orange-400">Düzenle</strong> butonuna tıklayıp sol panelden masa oluşturun
            </p>
          </div>
        ) : (
          <Stage
            width={860}
            height={580}
            onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}
          >
            <Layer>
              {layout.tables.map((lt) => {
                const table = localTables.find((t) => t.id === lt.id)
                const status = getTableStatus(lt.id)
                const color = STATUS_COLORS[status]
                const isSelected = selectedId === lt.id

                return (
                  <Group
                    key={lt.id}
                    x={lt.x}
                    y={lt.y}
                    rotation={lt.rotation}
                    draggable={isEditMode}
                    onDragEnd={(e) => handleDragEnd(e, lt.id)}
                    onClick={() => setSelectedId(lt.id)}
                  >
                    {lt.shape === 'round' ? (
                      <Circle
                        radius={TABLE_W / 2}
                        fill={color}
                        stroke={isSelected ? '#1d4ed8' : 'white'}
                        strokeWidth={isSelected ? 3 : 2}
                        opacity={0.9}
                      />
                    ) : (
                      <Rect
                        x={-TABLE_W / 2}
                        y={-TABLE_H / 2}
                        width={TABLE_W}
                        height={TABLE_H}
                        cornerRadius={8}
                        fill={color}
                        stroke={isSelected ? '#1d4ed8' : 'white'}
                        strokeWidth={isSelected ? 3 : 2}
                        opacity={0.9}
                      />
                    )}
                    <Text
                      text={table?.name ?? '?'}
                      x={-TABLE_W / 2}
                      y={-10}
                      width={TABLE_W}
                      align="center"
                      fill="white"
                      fontStyle="bold"
                      fontSize={13}
                    />
                    <Text
                      text={table?.capacity ? `${table.capacity} kişi` : ''}
                      x={-TABLE_W / 2}
                      y={6}
                      width={TABLE_W}
                      align="center"
                      fill="rgba(255,255,255,0.8)"
                      fontSize={10}
                    />
                  </Group>
                )
              })}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  )
}
