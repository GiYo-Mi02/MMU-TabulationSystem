import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Trophy, 
  Settings, 
  Menu, 
  X,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Edit3,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LiveIndicator from '@/components/ui/LiveIndicator'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTheme } from '@/contexts/ThemeContext'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Competition Editor', href: '/admin/competition', icon: Edit3 },
  { name: 'Contestants', href: '/admin/contestants', icon: Users },
  { name: 'Judges', href: '/admin/judges', icon: UserCheck },
  { name: 'Live Scoreboard', href: '/admin/leaderboard', icon: TrendingUp },
  { name: 'Results', href: '/admin/results', icon: Trophy },
  { name: 'Assistance', href: '/admin/assistance', icon: Bell },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  // Fetch pending assistance requests count
  const fetchPendingCount = async () => {
    const { data, error } = await supabase
      .from('assistance_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
    
    if (!error && data) {
      setPendingCount(data.length)
    }
  }

  useEffect(() => {
    fetchPendingCount()

    // Subscribe to assistance requests for real-time notifications
    const subscription = supabase
      .channel('admin-assistance-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assistance_requests'
      }, (payload) => {
        console.log('Assistance request change:', payload)
        
        // Show toast notification for new requests
        if (payload.eventType === 'INSERT') {
          const audio = new Audio('/notification.mp3')
          audio.play().catch(e => console.log('Could not play sound:', e))
          
          toast.error(`🚨 ${payload.new.judge_name} needs assistance!`, {
            duration: 10000,
            position: 'top-center',
            style: {
              background: '#991b1b',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
            }
          })
        }
        
        // Update count
        fetchPendingCount()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-104 bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground">MMU Tabulation System</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href || 
              (item.href !== '/admin' && location.pathname.startsWith(item.href))
            const isAssistance = item.name === 'Assistance'
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                {isAssistance && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Assistance Panel (Minimized) */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="text-primary flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-1">Need Help?</h4>
                <p className="text-xs text-muted-foreground">
                  Access quick guides and support
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border sticky top-0 z-30">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-secondary rounded-lg text-muted-foreground"
            >
              <Menu size={24} />
            </button>

            {/* Page title */}
            <div className="flex-1 lg:flex-none">
              <h1 className="text-xl font-semibold text-foreground">
                {navigation.find(item => 
                  location.pathname === item.href || 
                  (item.href !== '/admin' && location.pathname.startsWith(item.href))
                )?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2">
              {/* Live Indicator */}
              <LiveIndicator />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Assistance Notifications */}
              <Link 
                to="/admin/assistance"
                className="p-2 hover:bg-secondary rounded-lg relative group"
                title="Assistance Requests"
              >
                <Bell size={20} className={cn(
                  "transition-colors",
                  pendingCount > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"
                )} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* Admin profile */}
              <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary rounded-lg cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-lg shadow-yellow-500/20">
                  A
                </div>
                <span className="hidden md:inline text-sm font-medium text-foreground">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
