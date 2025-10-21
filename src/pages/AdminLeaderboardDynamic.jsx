import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Lock, Unlock, Trophy, TrendingUp, Download } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminLeaderboardDynamic() {
  const [contestants, setContestants] = useState([])
  const [categories, setCategories] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [rankings, setRankings] = useState([])

  useEffect(() => {
    fetchData()
    
    const scoresSubscription = supabase
      .channel('admin-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores' }, () => {
        fetchData()
      })
      .subscribe()

    const settingsSubscription = supabase
      .channel('admin-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings()
      })
      .subscribe()

    return () => {
      scoresSubscription.unsubscribe()
      settingsSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    calculateRankings()
  }, [contestants, scores, judges, categories])

  const fetchData = async () => {
    const [contestantsRes, scoresRes, judgesRes, categoriesRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('contestant_scores').select('*, criteria(*, category:categories(*))'),
      supabase.from('judges').select('*').eq('active', true),
      supabase.from('categories').select('*, criteria(*)').order('order_index')
    ])

    setContestants(contestantsRes.data || [])
    setScores(scoresRes.data || [])
    setJudges(judgesRes.data || [])
    setCategories(categoriesRes.data || [])
    
    await fetchSettings()
  }

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'is_locked')
      .single()

    setIsLocked(data?.value === 'true')
  }

  const calculateRankings = () => {
    const results = contestants.map(contestant => {
      // Get all scores for this contestant
      const contestantScores = scores.filter(s => s.contestant_id === contestant.id)
      
      // Calculate scores by category
      const categoryScores = {}
      let totalWeightedScore = 0
      let totalScoresReceived = 0

      categories.forEach(category => {
        const categoryCriteria = category.criteria || []
        const categoryScoresData = []

        categoryCriteria.forEach(criterion => {
          const criterionScores = contestantScores.filter(s => 
            s.criteria && s.criteria.id === criterion.id
          )
          
          if (criterionScores.length > 0) {
            const avgScore = criterionScores.reduce((sum, s) => sum + parseFloat(s.score), 0) / criterionScores.length
            categoryScoresData.push({
              criterion: criterion.name,
              score: avgScore,
              maxPoints: criterion.max_points
            })
            totalScoresReceived += criterionScores.length
          }
        })

        // Calculate category total
        const categoryTotal = categoryScoresData.reduce((sum, c) => sum + c.score, 0)
        const categoryMaxPoints = categoryCriteria.reduce((sum, c) => sum + c.max_points, 0)
        
        // Normalize to 100 and apply percentage weight
        const normalizedScore = categoryMaxPoints > 0 ? (categoryTotal / categoryMaxPoints) * 100 : 0
        const weightedScore = normalizedScore * (category.percentage / 100)
        
        categoryScores[category.id] = {
          name: category.name,
          total: categoryTotal,
          maxPoints: categoryMaxPoints,
          normalized: normalizedScore,
          weighted: weightedScore,
          percentage: category.percentage,
          criteria: categoryScoresData
        }

        totalWeightedScore += weightedScore
      })

      const expectedScores = judges.length * categories.reduce((sum, cat) => sum + (cat.criteria?.length || 0), 0)
      const completionRate = expectedScores > 0 ? (totalScoresReceived / expectedScores * 100).toFixed(0) : 0

      return {
        ...contestant,
        categoryScores,
        totalWeightedScore,
        totalScoresReceived,
        completionRate
      }
    })

    // Sort by total weighted score (descending)
    results.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
    
    // Add rank
    results.forEach((result, index) => {
      result.rank = index + 1
    })

    setRankings(results)
  }

  const handleToggleLock = async () => {
    const newValue = !isLocked

    const { error } = await supabase
      .from('settings')
      .update({ value: newValue.toString() })
      .eq('key', 'is_locked')

    if (error) {
      toast.error('Failed to update lock status')
      return
    }

    toast.success(newValue ? 'Scoring locked! Judges cannot submit anymore.' : 'Scoring unlocked! Judges can now submit scores.')
  }

  const exportToCSV = () => {
    const headers = ['Rank', 'Number', 'Name', ...categories.map(c => c.name), 'Total Score', 'Completion']
    const rows = rankings.map(r => [
      r.rank,
      r.number,
      r.name,
      ...categories.map(c => r.categoryScores[c.id]?.weighted.toFixed(2) || '0'),
      r.totalWeightedScore.toFixed(2),
      r.completionRate + '%'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-500'
    if (rank === 3) return 'from-orange-400 to-orange-600'
    return 'from-gray-200 to-gray-400'
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Live Scoreboard</h1>
              <p className="text-muted-foreground">Real-time scores and rankings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" onClick={exportToCSV}>
              <Download className="mr-2" size={20} />
              Export CSV
            </Button>
            <Link to="/leaderboard" target="_blank">
              <Button variant="outline" size="lg">
                <Trophy className="mr-2" size={20} />
                Public Display
              </Button>
            </Link>
            <Button
              onClick={handleToggleLock}
              variant={isLocked ? 'destructive' : 'default'}
              size="lg"
            >
              {isLocked ? (
                <>
                  <Lock className="mr-2" size={20} />
                  Unlock Scoring
                </>
              ) : (
                <>
                  <Unlock className="mr-2" size={20} />
                  Lock Scoring
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {isLocked && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Lock size={20} />
            <span className="font-bold">Scoring is currently LOCKED</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{judges.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Active Judges</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{contestants.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Contestants</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{scores.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Scores Submitted</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {rankings.length > 0
                    ? Math.round(rankings.reduce((sum, r) => sum + parseFloat(r.completionRate), 0) / rankings.length)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg Completion</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp size={24} />
              Live Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankings.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No scores yet. Waiting for judges to submit scores.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-bold text-primary">Rank</th>
                      <th className="text-left p-4 font-bold text-primary">No.</th>
                      <th className="text-left p-4 font-bold text-primary">Contestant</th>
                      {categories.map(category => (
                        <th key={category.id} className="text-center p-4 font-bold text-primary">
                          {category.name}
                          <span className="block text-xs font-normal text-muted-foreground">
                            ({category.percentage}%)
                          </span>
                        </th>
                      ))}
                      <th className="text-center p-4 font-bold text-primary">Total</th>
                      <th className="text-center p-4 font-bold text-primary">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((contestant) => (
                      <tr key={contestant.id} className="border-b border-border hover:bg-secondary/50">
                        <td className="p-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankColor(contestant.rank)} flex items-center justify-center text-white font-bold text-lg`}>
                            {contestant.rank}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold">
                            {contestant.number}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-foreground">{contestant.name}</td>
                        {categories.map(category => {
                          const categoryScore = contestant.categoryScores[category.id]
                          return (
                            <td key={category.id} className="text-center p-4">
                              <div className="text-foreground font-medium">
                                {categoryScore?.weighted.toFixed(2) || '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {categoryScore ? `${categoryScore.normalized.toFixed(1)}/100` : '-'}
                              </div>
                            </td>
                          )
                        })}
                        <td className="text-center p-4">
                          <span className="text-lg font-bold text-primary">
                            {contestant.totalWeightedScore.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-sm font-bold text-foreground">{contestant.completionRate}%</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
