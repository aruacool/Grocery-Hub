import { useState, useRef } from 'react'
import { X, Upload, Trash2 } from 'lucide-react'
import type { GroceryItem } from '../types/database'

interface EditItemModalProps {
  item: GroceryItem
  categories: { id: string; name_he: string }[]
  onClose: () => void
  onSave: (id: string, updates: Partial<GroceryItem>) => Promise<void>
  onUploadImage: (file: File, itemId: string) => Promise<string>
  onDelete: (id: string) => Promise<void>
}

export function EditItemModal({ item, categories, onClose, onSave, onUploadImage, onDelete }: EditItemModalProps) {
  const [nameHe, setNameHe] = useState(item.name_he)
  const [nameEn, setNameEn] = useState(item.name_en || '')
  const [categoryId, setCategoryId] = useState(item.category_id)
  const [notes, setNotes] = useState(item.notes || '')
  const [imageUrl, setImageUrl] = useState(item.image_url || '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    await onSave(item.id, {
      name_he: nameHe,
      name_en: nameEn || null,
      category_id: categoryId,
      notes: notes || null,
      image_url: imageUrl || null,
    })
    setSaving(false)
    onClose()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    const url = await onUploadImage(file, item.id)
    setImageUrl(url)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (confirm('למחוק את הפריט?')) {
      await onDelete(item.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">עריכת פריט</h2>
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
            />
          </div>

          <div>
            <label className="block text-sm text-surface-400 mb-1">שם באנגלית</label>
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

          <div>
            <label className="block text-sm text-surface-400 mb-1">תמונה</label>
            <div className="flex gap-2">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="כתובת URL או העלה קובץ"
                className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-surface-100 text-sm focus:outline-none focus:border-primary"
                dir="ltr"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-400 hover:text-surface-100"
              >
                <Upload size={18} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-danger hover:text-red-400 text-sm"
          >
            <Trash2 size={14} /> מחק
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !nameHe}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
