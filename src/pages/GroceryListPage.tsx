import { useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { useDepletion } from '../hooks/useDepletion'
import { useAuth } from '../lib/auth'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import type { GroceryItem } from '../types/database'

export function GroceryListPage() {
  const {
    items, categories, loading,
    toggleNeeded, toggleFavorite, updateItem, addItem, deleteItem, uploadImage,
  } = useGroceryItems()
  const { suggestions, trackingItems, dismissSuggestion } = useDepletion(items)
  const { isViewer } = useAuth()
  const [search, setSearch] = useState('')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      item =>
        item.name_he.toLowerCase().includes(q) ||
        (item.name_en && item.name_en.toLowerCase().includes(q))
    )
  }, [items, search])

  const favorites = useMemo(
    () => filtered.filter(item => item.is_favorite).sort((a, b) => b.use_count - a.use_count),
    [filtered]
  )

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, GroceryItem[]>()
    for (const cat of categories) {
      const catItems = filtered
        .filter(item => item.category_id === cat.id && !item.is_favorite)
        .sort((a, b) => b.use_count - a.use_count)
      if (catItems.length > 0) map.set(cat.id, catItems)
    }
    return map
  }, [filtered, categories])

  const toggleCollapse = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const handleAddToList = async (item: GroceryItem) => {
    await toggleNeeded({ ...item, is_needed: false })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש מוצרים..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pr-10 pl-4 py-2.5 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary"
            dir="rtl"
          />
        </div>
        {!isViewer && <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors"
          title="הוסף פריט חדש"
        >
          <Plus size={20} />
        </button>}
      </div>

      {/* Depletion Suggestions */}
      {!isViewer && suggestions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
            <RefreshCw size={16} /> הצעות לחידוש מלאי
          </h2>
          <div className="space-y-2">
            {suggestions.map(s => {
              const daysAgo = Math.round(
                (Date.now() - s.lastPurchased.getTime()) / (1000 * 60 * 60 * 24)
              )
              return (
                <div
                  key={s.item.id}
                  className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.item.image_url ? (
                      <img src={s.item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{s.item.category?.icon || '🛒'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.item.name_he}</div>
                    <div className="text-xs text-surface-400">
                      נקנה לפני {daysAgo} ימים — בדרך כלל כל ~{s.avgIntervalDays} ימים
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAddToList(s.item)}
                      className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-hover"
                    >
                      הוסף
                    </button>
                    <button
                      onClick={() => dismissSuggestion(s.item.id)}
                      className="text-xs text-surface-400 px-2 py-1.5 hover:text-surface-200"
                    >
                      דלג
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
            ⭐ מועדפים
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {favorites.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onToggleNeeded={toggleNeeded}
                onToggleFavorite={toggleFavorite}
                onUpdate={updateItem}
                onUploadImage={uploadImage}
                onDelete={deleteItem}
                categories={categories}
                isTracking={trackingItems.has(item.id) && !suggestions.some(s => s.item.id === item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const catItems = itemsByCategory.get(cat.id)
        if (!catItems) return null
        const collapsed = collapsedCats.has(cat.id)
        return (
          <section key={cat.id}>
            <button
              onClick={() => toggleCollapse(cat.id)}
              className="w-full flex items-center justify-between text-sm font-bold text-surface-300 mb-3 hover:text-surface-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                {cat.icon} {cat.name_he}
                <span className="text-xs text-surface-500 font-normal">({catItems.length})</span>
              </span>
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            {!collapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggleNeeded={toggleNeeded}
                    onToggleFavorite={toggleFavorite}
                    onUpdate={updateItem}
                    onUploadImage={uploadImage}
                    onDelete={deleteItem}
                    categories={categories}
                    isTracking={trackingItems.has(item.id) && !suggestions.some(s => s.item.id === item.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center text-surface-500 py-12">
          {search ? 'לא נמצאו תוצאות' : 'אין פריטים'}
        </div>
      )}

      {showAddModal && (
        <AddItemModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onAdd={addItem}
        />
      )}
    </div>
  )
}
