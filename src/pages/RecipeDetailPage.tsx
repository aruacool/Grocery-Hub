import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Pencil, Trash2, ShoppingCart } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useAuth } from '../lib/auth'
import { InstagramEmbed } from '../components/InstagramEmbed'
import type { Recipe, RecipeIngredient } from '../types/database'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recipes, getRecipeIngredients, deleteRecipe, cookRecipe } = useRecipes()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [shoppingItems, setShoppingItems] = useState<RecipeIngredient[]>([])
  const [cookResult, setCookResult] = useState<string[] | null>(null)
  const { isViewer } = useAuth()
  const [cooking, setCooking] = useState(false)

  useEffect(() => {
    const r = recipes.find(r => r.id === id)
    if (r) {
      setRecipe(r)
      getRecipeIngredients(r.id).then(setShoppingItems)
    }
  }, [id, recipes, getRecipeIngredients])

  const handleDelete = async () => {
    if (!recipe || !confirm('למחוק את המתכון?')) return
    await deleteRecipe(recipe.id)
    navigate('/recipes')
  }

  const handleCook = async () => {
    if (!recipe) return
    setCooking(true)
    const added = await cookRecipe(recipe.id)
    setCookResult(added)
    setCooking(false)
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/recipes')} className="text-surface-400 hover:text-surface-100">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">{recipe.name}</h1>
        {!isViewer && (
          <>
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="p-2 text-surface-400 hover:text-surface-100"
            >
              <Pencil size={18} />
            </Link>
            <button onClick={handleDelete} className="p-2 text-danger hover:text-red-400">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>

      {/* Image */}
      {recipe.image_url && (
        <img src={recipe.image_url} alt="" className="w-full h-56 object-cover rounded-xl" />
      )}

      {/* Instagram Reel */}
      {recipe.reel_url && <InstagramEmbed url={recipe.reel_url} />}

      {/* Description */}
      {recipe.description && (
        <p className="text-surface-300">{recipe.description}</p>
      )}

      {/* Cooking Ingredients (display only — what you need to cook) */}
      {recipe.cooking_ingredients && recipe.cooking_ingredients.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3">🥄 מצרכים להכנה</h2>
          <div className="space-y-1.5">
            {recipe.cooking_ingredients.map((ing, i) => (
              <div key={i} className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 text-surface-200 text-sm">
                {ing}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shopping Items — add to grocery list */}
      {shoppingItems.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3">🛒 מוצרים לקנייה</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {shoppingItems.map(item => (
              <span key={item.id} className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-surface-200">
                {item.grocery_item?.name_he || item.custom_name || '—'}
              </span>
            ))}
          </div>
          {!isViewer && (
            <button
              onClick={handleCook}
              disabled={cooking}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={18} />
              {cooking ? 'מוסיף לרשימה...' : 'הוסף מוצרים לרשימת הקניות'}
            </button>
          )}

          {cookResult && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-sm mt-3">
              {cookResult.length === 0 ? (
                <span className="text-surface-300">כל המוצרים כבר ברשימה!</span>
              ) : (
                <>
                  <span className="text-accent font-medium">נוספו {cookResult.length} פריטים:</span>
                  <span className="text-surface-300 mr-2">{cookResult.join(', ')}</span>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* Steps */}
      {recipe.steps && recipe.steps.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-surface-300 mb-3">📝 שלבי הכנה</h2>
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
