import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Recipe, RecipeIngredient } from '../types/database'

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setRecipes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const getRecipeIngredients = async (recipeId: string): Promise<RecipeIngredient[]> => {
    const { data } = await supabase
      .from('recipe_ingredients')
      .select('*, grocery_item:grocery_items(*)')
      .eq('recipe_id', recipeId)
    return (data || []) as RecipeIngredient[]
  }

  const createRecipe = async (recipe: Omit<Recipe, 'id' | 'created_at'>, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) => {
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select()
      .single()
    if (error || !data) throw error
    if (ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        ingredients.map(ing => ({ ...ing, recipe_id: data.id }))
      )
    }
    await fetchRecipes()
    return data
  }

  const updateRecipe = async (id: string, recipe: Partial<Recipe>, ingredients?: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) => {
    await supabase.from('recipes').update(recipe).eq('id', id)
    if (ingredients) {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      if (ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          ingredients.map(ing => ({ ...ing, recipe_id: id }))
        )
      }
    }
    await fetchRecipes()
  }

  const deleteRecipe = async (id: string) => {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const cookRecipe = async (recipeId: string): Promise<string[]> => {
    const ingredients = await getRecipeIngredients(recipeId)
    const addedItems: string[] = []

    for (const ing of ingredients) {
      if (ing.grocery_item_id) {
        const { data: item } = await supabase
          .from('grocery_items')
          .select('is_needed, name_he')
          .eq('id', ing.grocery_item_id)
          .single()

        if (item && !item.is_needed) {
          await supabase
            .from('grocery_items')
            .update({ is_needed: true })
            .eq('id', ing.grocery_item_id)
          addedItems.push(item.name_he)
        }
      }
    }
    return addedItems
  }

  const uploadRecipeImage = async (file: File, recipeId: string) => {
    const ext = file.name.split('.').pop()
    const path = `recipes/${recipeId}.${ext}`
    await supabase.storage.from('item-images').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(path)
    await supabase.from('recipes').update({ image_url: publicUrl }).eq('id', recipeId)
    return publicUrl
  }

  return {
    recipes,
    loading,
    getRecipeIngredients,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    cookRecipe,
    uploadRecipeImage,
    refetch: fetchRecipes,
  }
}
