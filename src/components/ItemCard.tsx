import { useState } from 'react'
import { Star, Check, Pencil, Plus, Minus, Hand } from 'lucide-react'
import type { GroceryItem } from '../types/database'
import { EditItemModal } from './EditItemModal'
import { useAuth } from '../lib/auth'

interface ItemCardProps {
  item: GroceryItem
  onToggleNeeded: (item: GroceryItem) => void
  onToggleFavorite: (item: GroceryItem) => void
  onUpdate: (id: string, updates: Partial<GroceryItem>) => Promise<void>
  onUploadImage: (file: File, itemId: string) => Promise<string>
  onDelete: (id: string) => Promise<void>
  onUpdateQuantity?: (id: string, quantity: number) => Promise<void>
  onClaim?: (item: GroceryItem) => Promise<void>
  onUnclaim?: (item: GroceryItem) => Promise<void>
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
  onUpdateQuantity,
  onClaim,
  onUnclaim,
  categories,
  isTracking,
  showGotIt,
}: ItemCardProps) {
  const { isViewer, user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [bump, setBump] = useState(0)

  const claimedByMe = !!item.claimed_by && item.claimed_by === user?.id
  const claimedBySomeoneElse = !!item.claimed_by && !claimedByMe

  const handleToggle = () => {
    onToggleNeeded(item)
    setBump(b => b + 1)
  }

  return (
    <>
      <div
        className={`bg-surface-800 rounded-xl border p-3 flex items-center gap-3 transition-all ${
          claimedByMe
            ? 'border-accent/40'
            : claimedBySomeoneElse
              ? 'border-warning/30'
              : 'border-surface-700 hover:border-surface-600'
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

        {/* Name + claim chip */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-surface-100 truncate flex items-center gap-1.5">
            {item.name_he}
            {!showGotIt && item.quantity > 1 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
                ×{item.quantity}
              </span>
            )}
          </div>
          {item.name_en && (
            <div className="text-xs text-surface-500 truncate">{item.name_en}</div>
          )}
          {item.notes && (
            <div className="text-xs text-surface-400 truncate mt-0.5">{item.notes}</div>
          )}
          {isTracking && (
            <div className="text-xs text-surface-500 mt-0.5">📊 אוסף נתונים...</div>
          )}

          {/* Claim row — only on shopping list view */}
          {showGotIt && !isViewer && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {!item.claimed_by && onClaim && (
                <button
                  onClick={() => onClaim(item)}
                  className="flex items-center gap-1 text-xs text-surface-400 hover:text-accent bg-surface-700/50 hover:bg-accent/10 px-2 py-0.5 rounded-full transition-colors"
                  title="אני אקנה את זה"
                >
                  <Hand size={11} /> אני אקנה
                </button>
              )}
              {item.claimed_by && (
                <button
                  onClick={() => claimedByMe && onUnclaim && onUnclaim(item)}
                  disabled={!claimedByMe}
                  className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full transition-colors ${
                    claimedByMe
                      ? 'bg-accent/15 text-accent hover:bg-accent/25 cursor-pointer'
                      : 'bg-warning/15 text-warning cursor-default'
                  }`}
                  title={claimedByMe ? 'בטל סימון' : `${item.claimed_by_name} סימן/ה`}
                >
                  {item.claimed_by_avatar ? (
                    <img src={item.claimed_by_avatar} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <Hand size={11} />
                  )}
                  {claimedByMe ? 'אני קונה' : item.claimed_by_name}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isViewer && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quantity controls — only on shopping list */}
            {showGotIt && onUpdateQuantity && (
              <div className="flex items-center bg-surface-900 rounded-lg overflow-hidden border border-surface-700">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1.5 text-surface-400 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-surface-400 transition-colors"
                  title="פחות"
                >
                  <Minus size={12} />
                </button>
                <span className="px-1.5 text-sm font-mono text-surface-100 min-w-[1.5rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1.5 text-surface-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="עוד"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}

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
              <Check key={bump} size={16} className={bump > 0 ? 'check-bump' : ''} />
            </button>

            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 transition-colors"
              title="ערוך"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
        {isViewer && item.is_needed && (
          <span className="text-primary text-xs">
            ברשימה{item.quantity > 1 ? ` ×${item.quantity}` : ''}
          </span>
        )}
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
