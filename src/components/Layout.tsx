import { NavLink } from 'react-router-dom'
import { ShoppingCart, ListChecks, ChefHat, LogOut, Download } from 'lucide-react'
import { useAuth, getDiscordUsername, getDiscordAvatar } from '../lib/auth'
import { installPWA } from '../main'
import { useState, type ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const [showInstall, setShowInstall] = useState(true)

  const navItems = [
    { to: '/', icon: ShoppingCart, label: 'מוצרים' },
    { to: '/list', icon: ListChecks, label: 'רשימה' },
    { to: '/recipes', icon: ChefHat, label: 'מתכונים' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">🛒 רשימת קניות</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <>
              {getDiscordAvatar(user) && (
                <img
                  src={getDiscordAvatar(user)!}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              )}
              <span className="text-sm text-surface-300 hidden sm:inline">
                {getDiscordUsername(user)}
              </span>
            </>
          )}
          <button
            onClick={signOut}
            className="p-2 text-surface-400 hover:text-surface-100 transition-colors"
            title="התנתק"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* PWA Install Banner */}
      <div
        id="pwa-install-banner"
        className="bg-primary/20 border-b border-primary/30 px-4 py-2 items-center justify-between"
        style={{ display: showInstall ? 'none' : 'none' }}
      >
        <span className="text-sm">התקן את האפליקציה למסך הבית</span>
        <div className="flex gap-2">
          <button
            onClick={() => { installPWA(); setShowInstall(false) }}
            className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1 rounded-lg"
          >
            <Download size={14} /> התקן
          </button>
          <button
            onClick={() => setShowInstall(false)}
            className="text-sm text-surface-400 px-2"
          >
            לא עכשיו
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-20 px-4 py-4 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-surface-800 border-t border-surface-700 flex justify-around py-2 z-50">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-surface-400 hover:text-surface-200'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
