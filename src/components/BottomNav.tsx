import {
  ChartColumnBig,
  CirclePlus,
  Cog,
  House,
  NotebookTabs,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: House },
  { to: '/new', label: 'Nuovo', icon: CirclePlus },
  { to: '/logbook', label: 'Logbook', icon: NotebookTabs },
  { to: '/stats', label: 'Statistiche', icon: ChartColumnBig },
  { to: '/settings', label: 'Impostazioni', icon: Cog },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-white/85 px-4 pb-[calc(env(safe-area-inset-bottom)+0.1rem)] pt-2 backdrop-blur-xl">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) =>
                `flex h-12 items-center justify-center rounded-3xl px-2 text-center transition ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/20'
                    : 'bg-white/60 text-slate-600 ring-1 ring-slate-900/5'
                }`
              }
            >
              {({ isActive }) => {
                const Icon = item.icon

                return (
                  <>
                    <Icon
                      className={`size-5 transition ${
                        isActive ? 'stroke-[2.2]' : 'stroke-[1.9]'
                      }`}
                    />
                    <span className="sr-only">{item.label}</span>
                  </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNav
