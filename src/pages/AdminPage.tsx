import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface AllowedEmail {
  email: string
  added_at: string
  notes: string | null
}

export function AdminPage() {
  const { isSuperAdmin } = useAuth()
  const [emails, setEmails] = useState<AllowedEmail[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email, added_at, notes')
      .order('added_at', { ascending: false })
    if (error) setError(error.message)
    if (data) setEmails(data as AllowedEmail[])
  }, [])

  useEffect(() => {
    if (isSuperAdmin) load()
  }, [isSuperAdmin, load])

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <ShieldCheck size={48} className="mx-auto text-surface-400 mb-4" />
        <p className="text-surface-400">דף זה זמין רק למנהלים.</p>
      </div>
    )
  }

  const addEmail = async () => {
    setError('')
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('כתובת אימייל לא תקינה')
      return
    }
    setSubmitting(true)
    const { error: insertErr } = await supabase
      .from('allowed_emails')
      .insert({ email: trimmed, notes: newNotes.trim() || null })
    setSubmitting(false)
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setNewEmail('')
    setNewNotes('')
    load()
  }

  const removeEmail = async (email: string) => {
    await supabase.from('allowed_emails').delete().eq('email', email)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-primary" />
        <h1 className="text-lg font-bold">ניהול - רשימת מורשים</h1>
      </div>

      <section className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="text-xs text-surface-400 mb-3">הוסף כתובת חדשה</div>
        <div className="space-y-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            dir="ltr"
            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            placeholder="הערות (אופציונלי)"
            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-surface-100 focus:outline-none focus:border-primary"
          />
          <button
            onClick={addEmail}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> הוסף
          </button>
          {error && (
            <div className="text-error text-sm bg-error/10 border border-error/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="text-xs text-surface-400 mb-3">
          רשומים ({emails.length})
        </div>
        {emails.length === 0 && (
          <div className="text-sm text-surface-500 text-center py-3">
            הרשימה ריקה.
          </div>
        )}
        <div className="space-y-2">
          {emails.map(e => (
            <div key={e.email} className="flex items-center gap-2 bg-surface-900 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <div dir="ltr" className="font-mono text-sm truncate">{e.email}</div>
                {e.notes && (
                  <div className="text-xs text-surface-500 truncate">{e.notes}</div>
                )}
              </div>
              <button
                onClick={() => removeEmail(e.email)}
                className="text-surface-400 hover:text-error p-1.5"
                title="הסר"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
