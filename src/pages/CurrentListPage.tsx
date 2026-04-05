import { useMemo } from 'react'
import { Printer, ShoppingBag } from 'lucide-react'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { ItemCard } from '../components/ItemCard'

export function CurrentListPage() {
  const {
    items, categories, loading,
    toggleNeeded, toggleFavorite, updateItem, deleteItem, uploadImage,
  } = useGroceryItems()

  const neededItems = useMemo(
    () => items.filter(item => item.is_needed),
    [items]
  )

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, typeof neededItems>()
    for (const cat of categories) {
      const catItems = neededItems.filter(item => item.category_id === cat.id)
      if (catItems.length > 0) map.set(cat.id, catItems)
    }
    return map
  }, [neededItems, categories])

  const handlePrint = () => {
    const lines = categories
      .filter(cat => groupedByCategory.has(cat.id))
      .map(cat => {
        const items = groupedByCategory.get(cat.id)!
        return `${cat.icon} ${cat.name_he}\n${items.map(i => `  ☐ ${i.name_he}`).join('\n')}`
      })
      .join('\n\n')

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl" lang="he">
          <head><title>רשימת קניות</title>
            <style>body { font-family: system-ui; font-size: 16px; padding: 20px; white-space: pre-wrap; direction: rtl; }</style>
          </head>
          <body>${lines}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ShoppingBag size={20} /> רשימת קניות
          <span className="text-sm text-surface-400 font-normal">({neededItems.length})</span>
        </h1>
        {neededItems.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-100 transition-colors"
          >
            <Printer size={16} /> הדפס
          </button>
        )}
      </div>

      {neededItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <div className="text-surface-400">הרשימה ריקה!</div>
          <div className="text-sm text-surface-500 mt-1">הוסף פריטים מעמוד המוצרים</div>
        </div>
      ) : (
        categories.map(cat => {
          const catItems = groupedByCategory.get(cat.id)
          if (!catItems) return null
          return (
            <section key={cat.id}>
              <h2 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
                {cat.icon} {cat.name_he}
              </h2>
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
                    showGotIt
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
