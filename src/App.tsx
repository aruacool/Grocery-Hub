import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { isMissingEnv } from './lib/supabase'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { GroceryListPage } from './pages/GroceryListPage'
import { CurrentListPage } from './pages/CurrentListPage'
import { RecipesPage } from './pages/RecipesPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeFormPage } from './pages/RecipeFormPage'

function App() {
  if (isMissingEnv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
        <div className="bg-surface-800 rounded-2xl p-8 max-w-md w-full text-center border border-surface-700">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-xl font-bold mb-3">Grocery Hub</h1>
          <p className="text-surface-400 text-sm mb-4">
            Set up your environment variables to get started:
          </p>
          <div className="bg-surface-900 rounded-lg p-4 text-left text-sm font-mono text-surface-300" dir="ltr">
            <div>VITE_SUPABASE_URL=...</div>
            <div>VITE_SUPABASE_ANON_KEY=...</div>
          </div>
          <p className="text-surface-500 text-xs mt-4">
            Create a <code className="text-surface-300">.env</code> file in the project root. See README.md for full setup instructions.
          </p>
        </div>
      </div>
    )
  }

  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<GroceryListPage />} />
        <Route path="/list" element={<CurrentListPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/new" element={<RecipeFormPage />} />
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
