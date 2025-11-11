import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Lock, Unlock, Trophy, TrendingUp, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { computeCompetitionStandings } from '@/lib/scoring'

export default function AdminLeaderboardDynamic() {
  const [contestants, setContestants] = useState([])
  const [categories, setCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [roundAssignments, setRoundAssignments] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [standings, setStandings] = useState({ overall: { rankings: [], byGender: {} }, rounds: [] })
  const [selectedRoundId, setSelectedRoundId] = useState('overall')
  const [selectedGender, setSelectedGender] = useState('all')

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
    if (!contestants.length || !categories.length) return
    const assignmentsMap = roundAssignments.reduce((acc, record) => {
      const roundId = record.round_id ? String(record.round_id) : null
      const judgeId = record.judge_id ? String(record.judge_id) : null
      if (!roundId || !judgeId) return acc
      if (!acc[roundId]) {
        acc[roundId] = new Set()
      }
      acc[roundId].add(judgeId)
      return acc
    }, {})
    const normalizedAssignments = Object.entries(assignmentsMap).reduce((result, [roundId, judgeSet]) => {
      result[roundId] = Array.from(judgeSet)
      return result
    }, {})
    const computed = computeCompetitionStandings({
      contestants,
      categories,
      scores,
      rounds,
      judges,
      roundJudgeAssignments: normalizedAssignments
    })
    setStandings(computed)
  }, [contestants, categories, scores, rounds, judges, roundAssignments])

  const fetchData = async () => {
    const [contestantsRes, scoresRes, judgesRes, categoriesRes, roundsRes, roundAssignmentsRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('contestant_scores').select('*'),
      supabase.from('judges').select('*').eq('active', true),
      supabase
        .from('categories')
        .select('*, round:rounds(*), criteria(*)')
        .order('order_index'),
      supabase.from('rounds').select('*').order('order_index'),
      supabase.from('round_judges').select('round_id, judge_id')
    ])

    const contestantsData = contestantsRes.data || []
    const categoriesData = categoriesRes.data || []
    const roundsData = roundsRes.data || []

    setContestants(contestantsData)
    setScores(scoresRes.data || [])
    setJudges(judgesRes.data || [])
    setCategories(categoriesData)
    setRounds(roundsData)
    setRoundAssignments(roundAssignmentsRes.data || [])

    if (selectedRoundId !== 'overall' && !roundsData.some((round) => round.id === selectedRoundId)) {
      setSelectedRoundId('overall')
    }

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

  const activeRound = useMemo(() => {
    if (selectedRoundId === 'overall') return null
    return rounds.find((round) => round.id === selectedRoundId) || null
  }, [rounds, selectedRoundId])

  const activeCategories = useMemo(() => {
    if (!categories.length) return []
    if (!activeRound) return categories
    return categories.filter((category) => {
      const roundId = category.round_id || category.round?.id
      return roundId === activeRound.id
    })
  }, [categories, activeRound])

  const displayRankings = useMemo(() => {
    if (selectedRoundId === 'overall') {
      if (selectedGender === 'all') {
        return standings.overall.rankings || []
      }
      return standings.overall.byGender?.[selectedGender] || []
    }

    const roundData = standings.rounds.find((entry) => entry.round.id === selectedRoundId)
    if (!roundData) return []

    if (selectedGender === 'all') {
      return roundData.rankings || []
    }

    return roundData.byGender?.[selectedGender] || []
  }, [standings, selectedRoundId, selectedGender])

  const displayedContestantCount = useMemo(() => displayRankings.length, [displayRankings])

  const averageCompletion = useMemo(() => {
    if (!displayRankings.length) return 0
    const total = displayRankings.reduce((sum, entry) => sum + (parseFloat(entry.completionRate) || 0), 0)
    return Math.round(total / displayRankings.length)
  }, [displayRankings])

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
    if (!displayRankings.length) {
      toast.error('No data available to export')
      return
    }

    const headers = ['Rank', 'Number', 'Name', 'Gender', ...activeCategories.map((c) => c.name), 'Total Score', 'Completion']
    const rows = displayRankings.map((entry, index) => {
      const contestant = entry.contestant || {}
      const categoryLookups = entry.categoryBreakdown?.reduce((map, category) => {
        map[category.id] = category
        return map
      }, {}) || {}

      return [
        entry.overallRank || index + 1,
        contestant.number,
        contestant.name,
        contestant.sex || contestant.gender || 'N/A',
        ...activeCategories.map((category) =>
          categoryLookups[category.id]
            ? categoryLookups[category.id].weighted.toFixed(2)
            : '0.00'
        ),
        entry.totalWeightedScore.toFixed(2),
        `${entry.completionRate || 0}%`
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = selectedRoundId === 'overall'
      ? 'overall'
      : activeRound?.name?.toLowerCase().replace(/\s+/g, '-') || 'round'
    const genderLabel = selectedGender === 'all' ? 'all-genders' : selectedGender
    a.download = `results_${label}_${genderLabel}_${new Date().toISOString().split('T')[0]}.csv`
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

        {/* View Controls */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Round View</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedRoundId === 'overall' ? 'default' : 'outline'}
                  onClick={() => setSelectedRoundId('overall')}
                  size="sm"
                >
                  Overall Leaderboard
                </Button>
                {rounds.map((round) => (
                  <Button
                    key={round.id}
                    variant={selectedRoundId === round.id ? 'default' : 'outline'}
                    onClick={() => setSelectedRoundId(round.id)}
                    size="sm"
                  >
                    {round.name || `Round ${round.order_index}`}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2 text-right md:text-left">Gender Filter</p>
              <div className="flex gap-2">
                <Button
                  variant={selectedGender === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedGender('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={selectedGender === 'male' ? 'default' : 'outline'}
                  onClick={() => setSelectedGender('male')}
                  size="sm"
                >
                  Male
                </Button>
                <Button
                  variant={selectedGender === 'female' ? 'default' : 'outline'}
                  onClick={() => setSelectedGender('female')}
                  size="sm"
                >
                  Female
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <div className="text-3xl font-bold text-primary">{displayedContestantCount}</div>
                    <div className="text-sm text-muted-foreground mt-1">In View</div>
                  </div>
                  <div className="text-left text-xs text-muted-foreground">
                    <p>Total Registered: {contestants.length}</p>
                    <p>Male: {contestants.filter((c) => (c.sex || '').toLowerCase().startsWith('m')).length}</p>
                    <p>Female: {contestants.filter((c) => (c.sex || '').toLowerCase().startsWith('f')).length}</p>
                  </div>
                </div>
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
                <div className="text-3xl font-bold text-primary">{averageCompletion}%</div>
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
            {displayRankings.length === 0 ? (
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
                      {activeCategories.map((category) => (
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
                    {displayRankings.map((entry) => {
                      const contestant = entry.contestant || {}
                      const categoryLookup = entry.categoryBreakdown?.reduce((acc, category) => {
                        acc[category.id] = category
                        return acc
                      }, {}) || {}

                      return (
                        <tr key={contestant.id} className="border-b border-border hover:bg-secondary/50">
                        <td className="p-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankColor(entry.overallRank)} flex items-center justify-center text-white font-bold text-lg`}>
                            {entry.overallRank}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold">
                            {contestant.number}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          <div>{contestant.name}</div>
                          <div className="text-xs text-muted-foreground">{contestant.sex || contestant.gender}</div>
                        </td>
                        {activeCategories.map((category) => {
                          const categoryScore = categoryLookup[category.id]
                          return (
                            <td key={category.id} className="text-center p-4">
                              <div className="text-foreground font-medium">
                                {categoryScore ? categoryScore.weighted.toFixed(2) : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {categoryScore ? `${categoryScore.normalized.toFixed(1)}/100` : '-'}
                              </div>
                            </td>
                          )
                        })}
                        <td className="text-center p-4">
                          <span className="text-lg font-bold text-primary">
                            {entry.totalWeightedScore.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-sm font-bold text-foreground">{entry.completionRate}%</div>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
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
