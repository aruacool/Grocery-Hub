import { useEffect, useState, useCallback } from 'react'
import { Copy, Trash2, Plus, Users, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface Member {
  user_id: string
  role: string
  joined_at: string
  display_name: string
  avatar_url: string | null
}

interface Invite {
  id: string
  code: string
  uses: number
  max_uses: number | null
  expires_at: string | null
  created_at: string
}

interface Instance {
  id: string
  name: string
  owner_id: string
}

function generateCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10).toUpperCase()
}

export function InstanceSettingsPage() {
  const { user, membership } = useAuth()
  const [instance, setInstance] = useState<Instance | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const instanceId = membership?.instanceId
  const isOwner = !!instance && !!user && instance.owner_id === user.id

  const loadAll = useCallback(async () => {
    if (!instanceId) return
    const [{ data: inst }, { data: mems }, { data: invs }] = await Promise.all([
      supabase.from('instances').select('id, name, owner_id').eq('id', instanceId).single(),
      supabase.rpc('list_instance_members', { p_instance_id: instanceId }),
      supabase.from('instance_invites').select('*').eq('instance_id', instanceId).order('created_at', { ascending: false }),
    ])
    if (inst) {
      setInstance(inst as Instance)
      setNameDraft(inst.name)
    }
    if (mems) setMembers(mems as Member[])
    if (invs) setInvites(invs as Invite[])
  }, [instanceId])

  useEffect(() => { loadAll() }, [loadAll])

  const saveName = async () => {
    if (!instance || !nameDraft.trim()) return
    await supabase.from('instances').update({ name: nameDraft.trim() }).eq('id', instance.id)
    setEditingName(false)
    loadAll()
  }

  const createInvite = async () => {
    if (!instanceId || !user) return
    const code = generateCode()
    await supabase.from('instance_invites').insert({
      instance_id: instanceId,
      code,
      created_by: user.id,
    })
    loadAll()
  }

  const revokeInvite = async (id: string) => {
    await supabase.from('instance_invites').delete().eq('id', id)
    loadAll()
  }

  const copyLink = async (code: string) => {
    const url = `${window.location.origin}/join/${code}`
    await navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">הגדרות רשימה</h1>

      {/* Instance name */}
      <section className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="text-xs text-surface-400 mb-2">שם הרשימה</div>
        {!editingName && (
          <div className="flex items-center justify-between">
            <span className="font-medium">{instance?.name ?? '...'}</span>
            {isOwner && (
              <button
                onClick={() => setEditingName(true)}
                className="text-surface-400 hover:text-surface-100 p-1.5"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        )}
        {editingName && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              className="flex-1 bg-surface-900 border border-surface-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
              autoFocus
            />
            <button onClick={saveName} className="text-primary p-1.5 hover:bg-primary/10 rounded-lg">
              <Check size={16} />
            </button>
            <button onClick={() => { setEditingName(false); setNameDraft(instance?.name ?? '') }} className="text-surface-400 p-1.5">
              <X size={16} />
            </button>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-2 mb-3 text-xs text-surface-400">
          <Users size={14} /> חברים ({members.length})
        </div>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-3">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs">
                  {m.display_name?.[0] ?? '?'}
                </div>
              )}
              <span className="flex-1 text-sm truncate">{m.display_name}</span>
              <span className="text-xs bg-surface-700 text-surface-400 px-2 py-0.5 rounded-full">
                {m.role === 'owner' ? 'בעלים' : m.role === 'editor' ? 'עורך' : 'צופה'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Invites — owner only */}
      {isOwner && (
        <section className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-surface-400">קודי הזמנה</div>
            <button
              onClick={createInvite}
              className="flex items-center gap-1.5 text-sm text-primary hover:bg-primary/10 px-3 py-1 rounded-lg"
            >
              <Plus size={14} /> צור קוד
            </button>
          </div>

          {invites.length === 0 && (
            <div className="text-sm text-surface-500 text-center py-3">
              אין קודים פעילים. צור אחד כדי להזמין מישהו.
            </div>
          )}

          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-2 bg-surface-900 rounded-lg p-2.5">
                <span dir="ltr" className="font-mono text-sm flex-1">{inv.code}</span>
                <span className="text-xs text-surface-500">
                  {inv.uses}{inv.max_uses ? `/${inv.max_uses}` : ''}
                </span>
                <button
                  onClick={() => copyLink(inv.code)}
                  className="text-surface-400 hover:text-primary p-1.5"
                  title="העתק קישור"
                >
                  {copied === inv.code ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="text-surface-400 hover:text-error p-1.5"
                  title="בטל"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
