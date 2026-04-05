export interface Category {
  id: string
  name_he: string
  name_en: string
  sort_order: number
  icon: string
}

export interface GroceryItem {
  id: string
  name_he: string
  name_en: string | null
  category_id: string
  image_url: string | null
  is_needed: boolean
  is_favorite: boolean
  use_count: number
  notes: string | null
  created_at: string
  track_depletion?: boolean
  category?: Category
}

export interface PurchaseLog {
  id: string
  item_id: string
  purchased_by: string
  purchased_at: string
}

export interface Recipe {
  id: string
  name: string
  description: string | null
  image_url: string | null
  reel_url: string | null
  steps: string[]
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  grocery_item_id: string | null
  quantity: string | null
  custom_name: string | null
  grocery_item?: GroceryItem
}

export interface DismissedSuggestion {
  id: string
  item_id: string
  dismissed_at: string
  expires_at: string
}

export interface DepletionSuggestion {
  item: GroceryItem
  lastPurchased: Date
  avgIntervalDays: number
  estimatedNextDate: Date
}
