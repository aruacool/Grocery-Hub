import { Link } from 'react-router-dom'
import { Plus, ChefHat } from 'lucide-react'
import { useRecipes } from '../hooks/useRecipes'
import { useAuth } from '../lib/auth'

export function RecipesPage() {
  const { recipes, loading } = useRecipes()
  const { isViewer } = useAuth()

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
          <ChefHat size={20} /> מתכונים
        </h1>
        {!isViewer && (
          <Link
            to="/recipes/new"
            className="flex items-center gap-1.5 text-sm bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} /> מתכון חדש
          </Link>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📖</div>
          <div className="text-surface-400">אין מתכונים עדיין</div>
          <div className="text-sm text-surface-500 mt-1">הוסף את המתכון הראשון שלך</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipes/${recipe.id}`}
              className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden hover:border-surface-600 transition-colors"
            >
              <div className="h-40 bg-surface-700 flex items-center justify-center">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ChefHat size={40} className="text-surface-500" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-surface-100">{recipe.name}</h3>
                {recipe.description && (
                  <p className="text-sm text-surface-400 mt-1 line-clamp-2">{recipe.description}</p>
                )}
                <div className="text-xs text-surface-500 mt-2">
                  {recipe.steps?.length || 0} שלבים
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
