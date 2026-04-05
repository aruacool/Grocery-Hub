import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { GroceryItem, Category } from '../types/database'

export function useGroceryItems() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
    if (data) setCategories(data)
  }, [])

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('grocery_items')
      .select('*, category:categories(*)')
      .order('use_count', { ascending: false })
    if (data) setItems(data as GroceryItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [fetchCategories, fetchItems])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('grocery-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_items' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setItems(prev =>
              prev.map(item =>
                item.id === (payload.new as GroceryItem).id
                  ? { ...item, ...(payload.new as Partial<GroceryItem>) }
                  : item
              )
            )
          } else if (payload.eventType === 'INSERT') {
            // Refetch to get category join
            fetchItems()
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== (payload.old as GroceryItem).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems])

  const toggleNeeded = async (item: GroceryItem) => {
    const newNeeded = !item.is_needed
    const updates: Record<string, unknown> = { is_needed: newNeeded }

    if (!newNeeded) {
      // "Got it" — increment use_count and log purchase
      updates.use_count = item.use_count + 1
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('purchase_log').insert({
          item_id: item.id,
          purchased_by: user.id,
        })
      }
    }

    await supabase.from('grocery_items').update(updates).eq('id', item.id)
  }

  const toggleFavorite = async (item: GroceryItem) => {
    await supabase
      .from('grocery_items')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', item.id)
  }

  const updateItem = async (id: string, updates: Partial<GroceryItem>) => {
    await supabase.from('grocery_items').update(updates).eq('id', id)
    await fetchItems()
  }

  const addItem = async (item: Omit<GroceryItem, 'id' | 'created_at' | 'use_count'>) => {
    await supabase.from('grocery_items').insert({ ...item, use_count: 0 })
    await fetchItems()
  }

  const deleteItem = async (id: string) => {
    await supabase.from('grocery_items').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const uploadImage = async (file: File, itemId: string) => {
    const ext = file.name.split('.').pop()
    const path = `${itemId}.${ext}`
    const { error } = await supabase.storage
      .from('item-images')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('item-images')
      .getPublicUrl(path)
    await updateItem(itemId, { image_url: publicUrl })
    return publicUrl
  }

  return {
    items,
    categories,
    loading,
    toggleNeeded,
    toggleFavorite,
    updateItem,
    addItem,
    deleteItem,
    uploadImage,
    refetch: fetchItems,
  }
}
