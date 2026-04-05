import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, X } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useGroceryItems } from '../hooks/useGroceryItems'
import type { RecipeIngredient } from '../types/database'

export function RecipeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, getRecipeIngredients, createRecipe, updateRecipe, uploadRecipeImage } = useRecipes()
  const { items } = useGroceryItems()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reelUrl, setReelUrl] = useState('')
  const [cookingIngredients, setCookingIngredients] = useState<string[]>([''])
  const [shoppingItems, setShoppingItems] = useState<{ grocery_item_id: string | null }[]>([])
  const [steps, setSteps] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [itemSearch, setItemSearch] = useState('')

  const isEdit = !!id
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!id || loaded) return
    const recipe = recipes.find(r => r.id === id)
    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || '')
      setReelUrl(recipe.reel_url || '')
      setCookingIngredients(recipe.cooking_ingredients?.length ? recipe.cooking_ingredients : [''])
      setSteps(recipe.steps?.length ? recipe.steps : [''])
      getRecipeIngredients(recipe.id).then((ings: RecipeIngredient[]) => {
        setShoppingItems(ings.map(i => ({ grocery_item_id: i.grocery_item_id })))
      })
      setLoaded(true)
    }
  }, [id, recipes, loaded, getRecipeIngredients])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const recipeData = {
      name: name.trim(),
      description: description.trim() || null,
      image_url: null,
      reel_url: reelUrl.trim() || null,
      cooking_ingredients: cookingIngredients.filter(s => s.trim()),
      steps: steps.filter(s => s.trim()),
    }

    const ingData = shoppingItems
      .filter(i => i.grocery_item_id)
      .map(i => ({
        grocery_item_id: i.grocery_item_id,
        quantity: null,
        custom_name: null,
      }))

    if (isEdit && id) {
      await updateRecipe(id, recipeData, ingData)
      if (imageFile) await uploadRecipeImage(imageFile, id)
      navigate(`/recipes/${id}`)
    } else {
      const newRecipe = await createRecipe(recipeData, ingData)
      if (imageFile && newRecipe) await uploadRecipeImage(imageFile, newRecipe.id)
      navigate('/recipes')
    }

    setSaving(false)
  }

  // Cooking ingredients helpers
  const addCookingIng = () => setCookingIngredients([...cookingIngredients, ''])
  const removeCookingIng = (i: number) => setCookingIngredients(cookingIngredients.filter((_, idx) => idx !== i))
  const updateCookingIng = (i: number, val: string) => {
    const next = [...cookingIngredients]
    next[i] = val
    setCookingIngredients(next)
  }

  // Shopping items helpers
  const addShoppingItem = (itemId: string) => {
    if (!shoppingItems.some(s => s.grocery_item_id === itemId)) {
      setShoppingItems([...shoppingItems, { grocery_item_id: itemId }])
    }
    setItemSearch('')
  }
  const removeShoppingItem = (i: number) => setShoppingItems(shoppingItems.filter((_, idx) => idx !== i))

  const filteredItems = itemSearch.trim()
    ? items.filter(item =>
        item.name_he.includes(itemSearch) ||
        (item.name_en && item.name_en.toLowerCase().includes(itemSearch.toLowerCase()))
      ).slice(0, 8)
    : []

  // Steps helpers
  const addStep = () => setSteps([...steps, ''])
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i: number, val: string) => {
    const next = [...steps]
    next[i] = val
    setSteps(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-surface-400 hover:text-surface-100">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold">{isEdit ? 'עריכת מתכון' : 'מתכון חדש'}</h1>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-surface-400 mb-1">שם המתכון</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 focus:outline-none focus:border-primary"
            dir="rtl"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-surface-400 mb-1">תיאור</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 focus:outline-none focus:border-primary resize-none"
            rows={2}
            dir="rtl"
          />
        </div>

        {/* Instagram Reel URL */}
        <div>
          <label className="block text-sm text-surface-400 mb-1">קישור לריל באינסטגרם</label>
          <input
            value={reelUrl}
            onChange={e => setReelUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm text-surface-400 mb-1">תמונה</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-surface-400 file:bg-surface-700 file:text-surface-200 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3 file:cursor-pointer"
          />
        </div>

        {/* Cooking Ingredients (free text — what you need to cook) */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">🥄 מצרכים להכנה</label>
          <p className="text-xs text-surface-500 mb-2">הכמויות שצריך למתכון, לדוגמה: "3 ביצים", "כוס קמח"</p>
          <div className="space-y-2">
            {cookingIngredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={ing}
                  onChange={e => updateCookingIng(i, e.target.value)}
                  placeholder="לדוגמה: 3 ביצים"
                  className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
                  dir="rtl"
                />
                {cookingIngredients.length > 1 && (
                  <button onClick={() => removeCookingIng(i)} className="p-1 text-surface-500 hover:text-danger">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addCookingIng}
            className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
          >
            <Plus size={14} /> הוסף מצרך
          </button>
        </div>

        {/* Shopping Items (linked to grocery items — what to buy) */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">🛒 מוצרים לקנייה</label>
          <p className="text-xs text-surface-500 mb-2">המוצרים שצריך לקנות מהרשימה (לחץ "הוסף מוצרים לרשימה" בעמוד המתכון)</p>

          {shoppingItems.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {shoppingItems.map((si, i) => {
                const item = items.find(it => it.id === si.grocery_item_id)
                return (
                  <span key={i} className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-surface-200 flex items-center gap-1.5">
                    {item?.name_he || '—'}
                    <button onClick={() => removeShoppingItem(i)} className="text-surface-500 hover:text-danger">
                      <X size={14} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          <div className="relative">
            <input
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              placeholder="חפש מוצר להוספה..."
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
              dir="rtl"
            />
            {filteredItems.length > 0 && (
              <div className="absolute top-full mt-1 inset-x-0 bg-surface-700 border border-surface-600 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addShoppingItem(item.id)}
                    className="w-full text-right px-3 py-2 text-sm text-surface-200 hover:bg-surface-600"
                  >
                    {item.name_he}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">📝 שלבי הכנה</label>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-6 h-8 flex items-center justify-center text-sm text-surface-500 flex-shrink-0">
                  {i + 1}.
                </span>
                <textarea
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 resize-none"
                  rows={2}
                  dir="rtl"
                />
                {steps.length > 1 && (
                  <button onClick={() => removeStep(i)} className="p-1 text-surface-500 hover:text-danger mt-1">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
          >
            <Plus size={14} /> הוסף שלב
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-3 text-surface-300 hover:text-surface-100 border border-surface-700 rounded-xl transition-colors"
        >
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'שומר...' : isEdit ? 'עדכן' : 'צור מתכון'}
        </button>
      </div>
    </div>
  )
}
