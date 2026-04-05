import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, X } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'

export function RecipeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, createRecipe, updateRecipe, uploadRecipeImage } = useRecipes()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reelUrl, setReelUrl] = useState('')
  const [steps, setSteps] = useState<string[]>([''])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const isEdit = !!id
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!id || loaded) return
    const recipe = recipes.find(r => r.id === id)
    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || '')
      setReelUrl(recipe.reel_url || '')
      setSteps(recipe.steps?.length ? recipe.steps : [''])
      setLoaded(true)
    }
  }, [id, recipes, loaded])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const recipeData = {
      name: name.trim(),
      description: description.trim() || null,
      image_url: null,
      reel_url: reelUrl.trim() || null,
      steps: steps.filter(s => s.trim()),
    }

    if (isEdit && id) {
      await updateRecipe(id, recipeData)
      if (imageFile) await uploadRecipeImage(imageFile, id)
      navigate(`/recipes/${id}`)
    } else {
      const newRecipe = await createRecipe(recipeData, [])
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
