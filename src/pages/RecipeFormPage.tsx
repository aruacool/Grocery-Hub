import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, X, GripVertical } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useGroceryItems } from '../hooks/useGroceryItems'
import type { RecipeIngredient } from '../types/database'

interface IngredientRow {
  grocery_item_id: string | null
  quantity: string
  custom_name: string
}

export function RecipeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, getRecipeIngredients, createRecipe, updateRecipe, uploadRecipeImage } = useRecipes()
  const { items } = useGroceryItems()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<string[]>([''])
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [itemSearch, setItemSearch] = useState('')

  const isEdit = !!id

  useEffect(() => {
    if (!id) return
    const recipe = recipes.find(r => r.id === id)
    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || '')
      setSteps(recipe.steps?.length ? recipe.steps : [''])
      getRecipeIngredients(recipe.id).then((ings: RecipeIngredient[]) => {
        setIngredients(ings.map(i => ({
          grocery_item_id: i.grocery_item_id,
          quantity: i.quantity || '',
          custom_name: i.custom_name || '',
        })))
      })
    }
  }, [id, recipes, getRecipeIngredients])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const recipeData = {
      name: name.trim(),
      description: description.trim() || null,
      image_url: null,
      steps: steps.filter(s => s.trim()),
    }

    const ingData = ingredients
      .filter(i => i.grocery_item_id || i.custom_name.trim())
      .map(i => ({
        grocery_item_id: i.grocery_item_id,
        quantity: i.quantity.trim() || null,
        custom_name: i.custom_name.trim() || null,
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

  const addStep = () => setSteps([...steps, ''])
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i: number, val: string) => {
    const next = [...steps]
    next[i] = val
    setSteps(next)
  }

  const addIngredient = (itemId?: string) => {
    setIngredients([...ingredients, {
      grocery_item_id: itemId || null,
      quantity: '',
      custom_name: '',
    }])
    setItemSearch('')
  }

  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i))
  const updateIngredient = (i: number, field: keyof IngredientRow, val: string) => {
    const next = [...ingredients]
    next[i] = { ...next[i], [field]: field === 'grocery_item_id' ? val : val }
    setIngredients(next)
  }

  const filteredItems = items.filter(item =>
    item.name_he.includes(itemSearch) ||
    (item.name_en && item.name_en.toLowerCase().includes(itemSearch.toLowerCase()))
  ).slice(0, 8)

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

        {/* Ingredients */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">מצרכים</label>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical size={14} className="text-surface-600 flex-shrink-0" />
                <select
                  value={ing.grocery_item_id || ''}
                  onChange={e => updateIngredient(i, 'grocery_item_id', e.target.value || '')}
                  className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
                >
                  <option value="">מצרך מותאם אישית</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name_he}</option>
                  ))}
                </select>
                {!ing.grocery_item_id && (
                  <input
                    value={ing.custom_name}
                    onChange={e => updateIngredient(i, 'custom_name', e.target.value)}
                    placeholder="שם מצרך"
                    className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
                    dir="rtl"
                  />
                )}
                <input
                  value={ing.quantity}
                  onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                  placeholder="כמות"
                  className="w-24 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
                  dir="rtl"
                />
                <button onClick={() => removeIngredient(i)} className="p-1 text-surface-500 hover:text-danger">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Quick search to add ingredient */}
          <div className="mt-2 relative">
            <input
              value={itemSearch}
              onChange={e => setItemSearch(e.target.value)}
              placeholder="חפש מוצר להוספה..."
              className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100"
              dir="rtl"
            />
            {itemSearch && filteredItems.length > 0 && (
              <div className="absolute top-full mt-1 inset-x-0 bg-surface-700 border border-surface-600 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addIngredient(item.id)}
                    className="w-full text-right px-3 py-2 text-sm text-surface-200 hover:bg-surface-600"
                  >
                    {item.name_he}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => addIngredient()}
            className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
          >
            <Plus size={14} /> הוסף מצרך מותאם אישית
          </button>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-sm text-surface-400 mb-2">שלבי הכנה</label>
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
