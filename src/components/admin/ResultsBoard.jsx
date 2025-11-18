import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { computeCompetitionStandings } from '@/lib/scoring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Trophy, TrendingUp, Users, Award, Lock, Unlock, Download, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ResultsBoard() {
  const [contestants, setContestants] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [categories, setCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [roundAssignments, setRoundAssignments] = useState([])
  const [categoryAssignments, setCategoryAssignments] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [standings, setStandings] = useState({ overall: { rankings: [], byGender: {} }, rounds: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime updates
    const scoresSubscription = supabase
      .channel('results-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores' }, () => {
        fetchData()
      })
      .subscribe()

    const settingsSubscription = supabase
      .channel('results-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings()
      })
      .subscribe()

    const categoryJudgesSubscription = supabase
      .channel('results-category-judges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_judges' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      scoresSubscription.unsubscribe()
      settingsSubscription.unsubscribe()
      categoryJudgesSubscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!contestants.length || !categories.length) return
    const roundJudgeTargets = rounds.reduce((acc, round) => {
      if (!round?.id) return acc
      const numeric = Number(round.judge_target)
      if (Number.isFinite(numeric) && numeric > 0) {
        acc[String(round.id)] = numeric
      }
      return acc
    }, {})
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

    const categoryAssignmentsMap = categoryAssignments.reduce((acc, record) => {
      const categoryId = record.category_id ? String(record.category_id) : null
      const judgeId = record.judge_id ? String(record.judge_id) : null
      if (!categoryId || !judgeId) return acc
      if (!acc[categoryId]) {
        acc[categoryId] = new Set()
      }
      acc[categoryId].add(judgeId)
      return acc
    }, {})
    const normalizedCategoryAssignments = Object.entries(categoryAssignmentsMap).reduce((result, [categoryId, judgeSet]) => {
      result[categoryId] = Array.from(judgeSet)
      return result
    }, {})

    const computed = computeCompetitionStandings({
      contestants,
      categories,
      rounds,
      scores,
      judges,
      roundJudgeTargets,
      roundJudgeAssignments: normalizedAssignments,
      categoryJudgeAssignments: normalizedCategoryAssignments
    })
    setStandings(computed)
  }, [contestants, scores, judges, categories, rounds, roundAssignments, categoryAssignments])

  const fetchData = async () => {
    setLoading(true)
    const [contestantsRes, categoriesRes, roundsRes, scoresRes, judgesRes, roundAssignmentsRes, categoryAssignmentsRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('categories').select('*, criteria(*)').order('order_index'),
      supabase.from('rounds').select('*').order('order_index'),
      supabase.from('contestant_scores').select('*'),
      supabase.from('judges').select('*').eq('active', true),
      supabase.from('round_judges').select('round_id, judge_id'),
      supabase.from('category_judges').select('category_id, judge_id')
    ])

    setContestants(contestantsRes.data || [])
    setCategories(categoriesRes.data || [])
    const normalizedRounds = (roundsRes.data || []).map((round) => ({
      ...round,
      judge_target:
        round.judge_target === null || round.judge_target === undefined
          ? null
          : Number(round.judge_target)
    }))
    setRounds(normalizedRounds)
    setScores(scoresRes.data || [])
    setJudges(judgesRes.data || [])
    setRoundAssignments(roundAssignmentsRes.data || [])
    setCategoryAssignments(categoryAssignmentsRes.data || [])
    setLoading(false)
    
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

  const exportResults = () => {
    // Create CSV content
    const headers = ['Rank', 'No.', 'Contestant', 'Score', 'Completion Rate', 'Submission Count']
    const rows = standings.overall.rankings.map((r, idx) => [
      idx + 1,
      r.contestant.number,
      r.contestant.name,
      r.totalWeightedScore.toFixed(2),
      `${r.completionRate}%`,
      r.totalScoresReceived
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Results exported successfully!')
  }

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-500'
    if (rank === 3) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  // Calculate overall completion percentage
  const totalExpectedScores = judges.length > 0 && contestants.length > 0
    ? judges.length * contestants.length * categories.reduce((sum, cat) => sum + (cat.criteria?.length || 0), 0)
    : 0
  const completionPercentage = totalExpectedScores > 0
    ? Math.round((scores.length / totalExpectedScores) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-red-600" size={20} />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900">Scoring is Locked</h4>
            <p className="text-sm text-red-700">Judges cannot submit or update scores</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Judges</p>
                <p className="text-3xl font-bold text-blue-600">{judges.length}</p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contestants</p>
                <p className="text-3xl font-bold text-purple-600">{contestants.length}</p>
              </div>
              <Award className="text-purple-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scores Submitted</p>
                <p className="text-3xl font-bold text-green-600">{scores.length}</p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion</p>
                <p className="text-3xl font-bold text-yellow-600">{completionPercentage}%</p>
              </div>
              <Trophy className="text-yellow-600" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleToggleLock}
          variant={isLocked ? 'destructive' : 'default'}
          size="lg"
        >
          {isLocked ? (
            <>
              <Unlock className="mr-2" size={20} />
              Unlock Scoring
            </>
          ) : (
            <>
              <Lock className="mr-2" size={20} />
              Lock Scoring
            </>
          )}
        </Button>

        <Button onClick={exportResults} variant="outline" size="lg" disabled={standings.overall.rankings.length === 0}>
          <Download className="mr-2" size={20} />
          Export CSV
        </Button>

        <Link to="/leaderboard" target="_blank">
          <Button variant="outline" size="lg">
            <ExternalLink className="mr-2" size={20} />
            Public Display
          </Button>
        </Link>
      </div>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy size={24} className="text-yellow-600" />
            Live Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading results...</p>
            </div>
          ) : standings.overall.rankings.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No scores yet. Waiting for judges to submit scores.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contestant</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Submissions</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completion</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {standings.overall.rankings.map((entry, idx) => (
                    <tr key={entry.contestant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankBadgeColor(idx + 1)} flex items-center justify-center text-white font-bold`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                          {entry.contestant.number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{entry.contestant.name}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-blue-600">
                          {entry.totalWeightedScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{entry.totalScoresReceived}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${entry.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{entry.completionRate}%</span>
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
  )
}
