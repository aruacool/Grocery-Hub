import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import type { Recipe } from '../types/database'

function getInstagramEmbedUrl(url: string): string | null {
  // Convert instagram.com/reel/XXX or /p/XXX to embed URL
  const match = url.match(/instagram\.com\/(reel|p)\/([\w-]+)/)
  if (match) {
    return `https://www.instagram.com/${match[1]}/${match[2]}/embed`
  }
  return null
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, deleteRecipe } = useRecipes()
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    const r = recipes.find(r => r.id === id)
    if (r) setRecipe(r)
  }, [id, recipes])

  const handleDelete = async () => {
    if (!recipe || !confirm('למחוק את המתכון?')) return
    await deleteRecipe(recipe.id)
    navigate('/recipes')
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const embedUrl = recipe.reel_url ? getInstagramEmbedUrl(recipe.reel_url) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/recipes')} className="text-surface-400 hover:text-surface-100">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">{recipe.name}</h1>
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="p-2 text-surface-400 hover:text-surface-100"
        >
          <Pencil size={18} />
        </Link>
        <button onClick={handleDelete} className="p-2 text-danger hover:text-red-400">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Image */}
      {recipe.image_url && (
        <img src={recipe.image_url} alt="" className="w-full h-56 object-cover rounded-xl" />
      )}

      {/* Instagram Reel */}
      {embedUrl && (
        <div className="rounded-xl overflow-hidden border border-surface-700">
          <iframe
            src={embedUrl}
            className="w-full"
            style={{ minHeight: '500px' }}
            frameBorder="0"
            scrolling="no"
            allowTransparency
            allow="encrypted-media"
          />
        </div>
      )}

      {/* Description */}
      {recipe.description && (
        <p className="text-surface-300">{recipe.description}</p>
      )}

      {/* Steps */}
      {recipe.steps && recipe.steps.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3">שלבי הכנה</h2>
          <div className="space-y-3">
            {recipe.steps.map((step, i) => (
              <div key={i} className="bg-surface-800 border border-surface-700 rounded-lg p-4 flex gap-3">
                <span className="w-7 h-7 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-surface-200 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
