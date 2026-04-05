import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check
  const apiKey = Deno.env.get('GROCERY_API_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/grocery\/?/, '')

  try {
    // GET /list — current needed items
    if (req.method === 'GET' && (path === 'list' || path === '')) {
      const { data } = await supabase
        .from('grocery_items')
        .select('id, name_he, name_en, category:categories(name_he)')
        .eq('is_needed', true)
        .order('use_count', { ascending: false })

      return json({
        items: (data || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          name_he: item.name_he,
          name_en: item.name_en,
          category: (item.category as Record<string, string>)?.name_he || null,
        })),
      })
    }

    // GET /all — all items
    if (req.method === 'GET' && path === 'all') {
      const { data } = await supabase
        .from('grocery_items')
        .select('id, name_he, name_en, is_needed, is_favorite, use_count, category:categories(name_he)')
        .order('use_count', { ascending: false })

      return json({ items: data || [] })
    }

    // POST /update — add/remove items
    if (req.method === 'POST' && path === 'update') {
      const body = await req.json()
      const addNames: string[] = body.add || []
      const removeNames: string[] = body.remove || []
      const results: string[] = []

      for (const name of addNames) {
        const { data: existing } = await supabase
          .from('grocery_items')
          .select('id')
          .ilike('name_he', name)
          .single()

        if (existing) {
          await supabase.from('grocery_items').update({ is_needed: true }).eq('id', existing.id)
          results.push(`Added: ${name}`)
        } else {
          // Create new item in "Other" category
          const { data: otherCat } = await supabase
            .from('categories')
            .select('id')
            .eq('name_en', 'Other')
            .single()

          await supabase.from('grocery_items').insert({
            name_he: name,
            category_id: otherCat?.id,
            is_needed: true,
            use_count: 0,
          })
          results.push(`Created and added: ${name}`)
        }
      }

      for (const name of removeNames) {
        const { data: existing } = await supabase
          .from('grocery_items')
          .select('id')
          .ilike('name_he', name)
          .single()

        if (existing) {
          await supabase.from('grocery_items').update({ is_needed: false }).eq('id', existing.id)
          results.push(`Removed: ${name}`)
        }
      }

      // Return updated list
      const { data: updatedList } = await supabase
        .from('grocery_items')
        .select('id, name_he, name_en, category:categories(name_he)')
        .eq('is_needed', true)

      return json({ results, items: updatedList || [] })
    }

    // POST /recipe — cook a recipe by name
    if (req.method === 'POST' && path === 'recipe') {
      const body = await req.json()
      const recipeName: string = body.recipe_name

      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .ilike('name', recipeName)
        .single()

      if (!recipe) {
        return json({ error: `Recipe "${recipeName}" not found` }, 404)
      }

      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('grocery_item_id, grocery_item:grocery_items(name_he, is_needed)')
        .eq('recipe_id', recipe.id)

      const added: string[] = []
      for (const ing of ingredients || []) {
        if (ing.grocery_item_id) {
          const item = ing.grocery_item as Record<string, unknown>
          if (item && !item.is_needed) {
            await supabase.from('grocery_items').update({ is_needed: true }).eq('id', ing.grocery_item_id)
            added.push(item.name_he as string)
          }
        }
      }

      return json({ recipe_name: recipeName, added_items: added, count: added.length })
    }

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
