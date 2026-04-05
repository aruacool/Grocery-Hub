import { useState } from 'react'
import { Star, Check, Pencil } from 'lucide-react'
import type { GroceryItem } from '../types/database'
import { EditItemModal } from './EditItemModal'

interface ItemCardProps {
  item: GroceryItem
  onToggleNeeded: (item: GroceryItem) => void
  onToggleFavorite: (item: GroceryItem) => void
  onUpdate: (id: string, updates: Partial<GroceryItem>) => Promise<void>
  onUploadImage: (file: File, itemId: string) => Promise<string>
  onDelete: (id: string) => Promise<void>
  categories: { id: string; name_he: string }[]
  isTracking?: boolean
  showGotIt?: boolean
}

export function ItemCard({
  item,
  onToggleNeeded,
  onToggleFavorite,
  onUpdate,
  onUploadImage,
  onDelete,
  categories,
  isTracking,
  showGotIt,
}: ItemCardProps) {
  const [editing, setEditing] = useState(false)
  const [animating, setAnimating] = useState(false)

  const handleToggle = () => {
    setAnimating(true)
    setTimeout(() => {
      onToggleNeeded(item)
      setAnimating(false)
    }, 250)
  }

  return (
    <>
      <div
        className={`bg-surface-800 rounded-xl border border-surface-700 p-3 flex items-center gap-3 transition-all hover:border-surface-600 ${
          animating ? (item.is_needed ? 'item-exit' : 'item-enter') : ''
        }`}
      >
        {/* Image */}
        <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{item.category?.icon || '🛒'}</span>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-surface-100 truncate">{item.name_he}</div>
          {item.name_en && (
            <div className="text-xs text-surface-500 truncate">{item.name_en}</div>
          )}
          {item.notes && (
            <div className="text-xs text-surface-400 truncate mt-0.5">{item.notes}</div>
          )}
          {isTracking && (
            <div className="text-xs text-surface-500 mt-0.5">📊 אוסף נתונים...</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onToggleFavorite(item)}
            className={`p-1.5 rounded-lg transition-colors ${
              item.is_favorite
                ? 'text-warning bg-warning/10'
                : 'text-surface-500 hover:text-warning'
            }`}
            title="מועדף"
          >
            <Star size={16} fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              showGotIt
                ? 'text-accent bg-accent/10 hover:bg-accent/20'
                : item.is_needed
                  ? 'text-primary bg-primary/10'
                  : 'text-surface-500 hover:text-primary hover:bg-primary/10'
            }`}
            title={showGotIt ? 'קניתי!' : item.is_needed ? 'ברשימה' : 'הוסף לרשימה'}
          >
            <Check size={16} />
          </button>

          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 transition-colors"
            title="ערוך"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <EditItemModal
          item={item}
          categories={categories}
          onClose={() => setEditing(false)}
          onSave={onUpdate}
          onUploadImage={onUploadImage}
          onDelete={onDelete}
        />
      )}
    </>
  )
}
