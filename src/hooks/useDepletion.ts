import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { GroceryItem, DepletionSuggestion } from '../types/database'

const MIN_HISTORY_DAYS = 30
const MIN_PURCHASES = 2
const ALERT_DAYS_BEFORE = 3

export function useDepletion(items: GroceryItem[]) {
  const [suggestions, setSuggestions] = useState<DepletionSuggestion[]>([])
  const [trackingItems, setTrackingItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const calculate = useCallback(async () => {
    if (items.length === 0) {
      setLoading(false)
      return
    }

    // Get all purchase logs
    const { data: logs } = await supabase
      .from('purchase_log')
      .select('*')
      .order('purchased_at', { ascending: true })

    // Get dismissed suggestions
    const { data: dismissed } = await supabase
      .from('dismissed_suggestions')
      .select('item_id')
      .gt('expires_at', new Date().toISOString())

    const dismissedIds = new Set(dismissed?.map(d => d.item_id) || [])

    if (!logs || logs.length === 0) {
      setLoading(false)
      return
    }

    // Group logs by item
    const logsByItem = new Map<string, Date[]>()
    for (const log of logs) {
      const dates = logsByItem.get(log.item_id) || []
      dates.push(new Date(log.purchased_at))
      logsByItem.set(log.item_id, dates)
    }

    const tracking = new Set<string>()
    const newSuggestions: DepletionSuggestion[] = []
    const now = new Date()

    for (const item of items) {
      if (item.track_depletion === false) continue
      const dates = logsByItem.get(item.id)
      if (!dates || dates.length < MIN_PURCHASES) continue

      const firstDate = dates[0]
      const daysSinceFirst = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)

      tracking.add(item.id)

      if (daysSinceFirst < MIN_HISTORY_DAYS) continue

      // Calculate average interval
      let totalInterval = 0
      for (let i = 1; i < dates.length; i++) {
        totalInterval += (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      }
      const avgInterval = totalInterval / (dates.length - 1)
      const lastPurchased = dates[dates.length - 1]
      const estimatedNextDate = new Date(lastPurchased.getTime() + avgInterval * 24 * 60 * 60 * 1000)

      // Check if running low
      const daysUntilNeeded = (estimatedNextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (daysUntilNeeded <= ALERT_DAYS_BEFORE && !item.is_needed && !dismissedIds.has(item.id)) {
        newSuggestions.push({
          item,
          lastPurchased,
          avgIntervalDays: Math.round(avgInterval),
          estimatedNextDate,
        })
      }
    }

    setTrackingItems(tracking)
    setSuggestions(newSuggestions)
    setLoading(false)
  }, [items])

  useEffect(() => {
    calculate()
  }, [calculate])

  const dismissSuggestion = async (itemId: string) => {
    const now = new Date()
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    await supabase.from('dismissed_suggestions').insert({
      item_id: itemId,
      dismissed_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    setSuggestions(prev => prev.filter(s => s.item.id !== itemId))
  }

  return { suggestions, trackingItems, loading, dismissSuggestion, refetch: calculate }
}
