import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Trophy, UserCheck, BarChart3, TrendingUp, Clock, Edit3 } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    judges: 0,
    activeJudges: 0,
    contestants: 0,
    totalScores: 0,
    completionRate: 0
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchStats()
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        fetchStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judges' }, () => {
        fetchStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants' }, () => {
        fetchStats()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  const fetchStats = async () => {
    const [judgesRes, contestantsRes, scoresRes] = await Promise.all([
      supabase.from('judges').select('*'),
      supabase.from('contestants').select('*'),
      supabase.from('scores').select('*, judges(name), contestants(name, number)').order('created_at', { ascending: false }).limit(5)
    ])

    const judges = judgesRes.data || []
    const contestants = contestantsRes.data || []
    const scores = scoresRes.data || []
    
    const activeJudges = judges.filter(j => j.active).length
    const totalPossibleScores = activeJudges * contestants.length
    const completionRate = totalPossibleScores > 0 
      ? Math.round((scores.length / totalPossibleScores) * 100)
      : 0

    setStats({
      judges: judges.length,
      activeJudges,
      contestants: contestants.length,
      totalScores: scores.length,
      completionRate
    })

    setRecentActivity(scoresRes.data || [])
  }

  const quickActions = [
    {
      title: 'Competition Editor',
      description: 'Customize categories and criteria',
      icon: Edit3,
      path: '/admin/competition',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      title: 'Manage Contestants',
      description: 'Add, edit, or remove contestants',
      icon: Users,
      path: '/admin/contestants',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Manage Judges',
      description: 'Add judges and manage their access',
      icon: UserCheck,
      path: '/admin/judges',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Live Scoreboard',
      description: 'Real-time scores and rankings',
      icon: TrendingUp,
      path: '/admin/leaderboard',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Public Display',
      description: 'Project leaderboard for audience',
      icon: Trophy,
      path: '/leaderboard',
      color: 'from-yellow-500 to-orange-500',
      external: true
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Back!</h2>
        <p className="text-muted-foreground">Here's what's happening with your tabulation system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Judges</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.activeJudges}</p>
                <p className="text-xs text-muted-foreground mt-1">of {stats.judges} total</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <UserCheck className="text-primary" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contestants</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.contestants}</p>
                <p className="text-xs text-muted-foreground mt-1">registered</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="text-primary" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scores Submitted</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.totalScores}</p>
                <p className="text-xs text-muted-foreground mt-1">total submissions</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="text-primary" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">of expected scores</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="text-primary" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            const Component = action.external ? 'a' : Link
            const props = action.external 
              ? { href: action.path, target: '_blank', rel: 'noopener noreferrer' }
              : { to: action.path }

            return (
              <Component key={action.path} {...props}>
                <Card className="bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1">{action.title}</h4>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Component>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock size={20} className="text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((score, index) => (
                <div key={score.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-xs flex-shrink-0 shadow-lg shadow-yellow-500/20">
                    {score.contestants?.number || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      <span className="font-bold text-primary">{score.judges?.name || 'Judge'}</span> scored{' '}
                      <span className="font-bold">{score.contestants?.name || 'Contestant'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-bold text-primary">{score.total}</span>
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(score.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
