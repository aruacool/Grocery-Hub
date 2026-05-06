import { LogOut } from 'lucide-react'
import { useAuth, getDiscordUsername } from '../lib/auth'

export function OnboardingPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="bg-surface-800 rounded-2xl p-8 max-w-md w-full text-center border border-surface-700 shadow-2xl">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-xl font-bold mb-2">
          {user ? `שלום ${getDiscordUsername(user)}` : 'שלום'}
        </h1>
        <p className="text-surface-300 text-sm mb-6">
          אתה לא חבר באף רשימה עדיין.
          <br />
          בקש מבעל הרשימה לשלוח לך קישור הזמנה.
        </p>
        <p className="text-surface-500 text-xs mb-6">
          (יצירה והצטרפות לרשימות יתווספו בקרוב)
        </p>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-surface-700 hover:bg-surface-600 text-surface-100 font-medium py-2.5 px-4 rounded-xl transition-colors"
        >
          <LogOut size={16} /> התנתק
        </button>
      </div>
    </div>
  )
}
