import { useState } from 'react'
import { X } from 'lucide-react'
import type { GroceryItem } from '../types/database'

interface AddItemModalProps {
  categories: { id: string; name_he: string }[]
  onClose: () => void
  onAdd: (item: Omit<GroceryItem, 'id' | 'created_at' | 'use_count'>) => Promise<void>
}

export function AddItemModal({ categories, onClose, onAdd }: AddItemModalProps) {
  const [nameHe, setNameHe] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!nameHe.trim()) return
    setSaving(true)
    await onAdd({
      name_he: nameHe.trim(),
      name_en: nameEn.trim() || null,
      category_id: categoryId,
      notes: notes.trim() || null,
      image_url: null,
      is_needed: false,
      is_favorite: false,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">הוסף פריט חדש</h2>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">שם בעברית</label>
            <input
              value={nameHe}
              onChange={e => setNameHe(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary"
              dir="rtl"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">שם באנגלית (אופציונלי)</label>
            <input
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">קטגוריה</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name_he}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary resize-none"
              rows={2}
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100">
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nameHe.trim()}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'הוסף'}
          </button>
        </div>
      </div>
    </div>
  )
}
