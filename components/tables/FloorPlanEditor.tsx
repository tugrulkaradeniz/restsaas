'use client'

import { useState, useCallback } from 'react'
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FloorPlan, Table, Reservation, FloorPlanTable, TableStatus } from '@/types/database'
import { Plus, Save, Pencil, Eye } from 'lucide-react'

const STATUS_COLORS: Record<TableStatus, string> = {
  empty:    '#22c55e',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  dirty:    '#6b7280',
}

interface Props {
  initialFloorPlans: FloorPlan[]
  tables: (Table & { orders?: { id: string; status: string }[] })[]
  todayReservations: Reservation[]
}

const TABLE_W = 80
const TABLE_H = 60

export function FloorPlanEditor({ initialFloorPlans, tables, todayReservations }: Props) {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>(initialFloorPlans)
  const [activeFloorPlanIdx, setActiveFloorPlanIdx] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const activeFloorPlan = floorPlans[activeFloorPlanIdx]
  const layout = activeFloorPlan?.layout ?? { tables: [], walls: [] }

  // Masa durumunu hesapla
  const getTableStatus = useCallback((tableId: string): TableStatus => {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return 'empty'
    const hasActive = table.orders?.some((o) =>
      ['confirmed','preparing','ready','delivered'].includes(o.status)
    )
    if (hasActive) return 'occupied'
    const isReserved = todayReservations.some((r) => r.table_id === tableId)
    if (isReserved) return 'reserved'
    return table.status
  }, [tables, todayReservations])

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

  async function addTableToCanvas(tableId: string) {
    const already = layout.tables.find((t) => t.id === tableId)
    if (already) { toast.error('Bu masa zaten planda var'); return }
    const newEntry: FloorPlanTable = { id: tableId, x: 100, y: 100, rotation: 0, shape: 'rectangle' }
    updateLayout({ ...layout, tables: [...layout.tables, newEntry] })
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
      .insert({ name, layout: { tables: [], walls: [] } })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setFloorPlans((prev) => [...prev, data])
    setActiveFloorPlanIdx(floorPlans.length)
  }

  const tablesNotOnCanvas = tables.filter(
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
          {floorPlans.map((fp, i) => (
            <button
              key={fp.id}
              onClick={() => setActiveFloorPlanIdx(i)}
              className={cn(
                'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors',
                i === activeFloorPlanIdx
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {fp.name}
            </button>
          ))}
        </div>

        {/* Eklenecek masalar */}
        {isEditMode && tablesNotOnCanvas.length > 0 && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ekle</p>
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
            {activeFloorPlan?.name ?? 'Plan seçin'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                isEditMode
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isEditMode ? <><Pencil size={14} /> Düzenleniyor</> : <><Eye size={14} /> Görünüm</>}
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

        <Stage
          width={900}
          height={600}
          onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}
        >
          <Layer>
            {layout.tables.map((lt) => {
              const table = tables.find((t) => t.id === lt.id)
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
                    text={table?.name ?? lt.id.slice(0, 4)}
                    x={lt.shape === 'round' ? -TABLE_W / 2 : -TABLE_W / 2}
                    y={-10}
                    width={TABLE_W}
                    align="center"
                    fill="white"
                    fontStyle="bold"
                    fontSize={13}
                  />
                  <Text
                    text={table?.capacity ? `${table.capacity} kişi` : ''}
                    x={lt.shape === 'round' ? -TABLE_W / 2 : -TABLE_W / 2}
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
      </div>
    </div>
  )
}
