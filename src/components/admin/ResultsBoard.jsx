import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { computeCompetitionStandings } from '@/lib/scoring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Trophy, TrendingUp, Users, Award, Lock, Unlock, Download, ExternalLink, Eye, X } from 'lucide-react'
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
  const [judgesScoresOpen, setJudgesScoresOpen] = useState(false)
  const [selectedContestantForScores, setSelectedContestantForScores] = useState(null)
  const [judgesScoresData, setJudgesScoresData] = useState([])
  const debounceTimer = useRef(null)

  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime updates with debouncing
    const scoresSubscription = supabase
      .channel('results-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores' }, () => {
        // Debounce: clear existing timer and set a new one
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          fetchData()
        }, 500) // Wait 500ms after last change before fetching
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
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          fetchData()
        }, 500)
      })
      .subscribe()

    return () => {
      clearTimeout(debounceTimer.current)
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
    console.log('🔄 ResultsBoard.fetchData() called')
    
    // Fetch scores with pagination to bypass 1000-row limit
    let allScores = []
    let offset = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const scoresRes = await supabase
        .from('contestant_scores')
        .select('*')
        .range(offset, offset + pageSize - 1)
      
      if (scoresRes.error) {
        console.error('Error fetching scores at offset', offset, ':', scoresRes.error)
        break
      }
      
      if (!scoresRes.data || scoresRes.data.length === 0) {
        hasMore = false
        break
      }
      
      allScores = [...allScores, ...scoresRes.data]
      console.log(`📊 Fetched batch at offset ${offset}: ${scoresRes.data.length} scores (total: ${allScores.length})`)
      
      if (scoresRes.data.length < pageSize) {
        hasMore = false
      } else {
        offset += pageSize
      }
    }
    
    const [contestantsRes, categoriesRes, roundsRes, judgesRes, roundAssignmentsRes, categoryAssignmentsRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('categories').select('*, criteria(*)').order('order_index'),
      supabase.from('rounds').select('*').order('order_index'),
      supabase.from('judges').select('*').eq('active', true),
      supabase.from('round_judges').select('round_id, judge_id'),
      supabase.from('category_judges').select('category_id, judge_id')
    ])

    console.log('📊 Total scores fetched:', allScores.length)

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
    setScores(allScores)
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

  const fetchJudgesScoresForContestant = async (contestantId) => {
    if (!contestantId) return
    
    const { data, error } = await supabase
      .from('contestant_scores')
      .select('*')
      .eq('contestant_id', contestantId)
      .order('judge_id')

    if (error) {
      console.error('Error fetching judges scores:', error)
      return
    }

    setJudgesScoresData(data || [])
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

  const exportDetailedScores = () => {
    // Create detailed CSV with all individual scores
    const headers = ['Judge ID', 'Judge Name', 'Contestant No.', 'Contestant Name', 'Category', 'Criterion', 'Score', 'Max Points', 'Percentage', 'Submission Date']
    
    const rows = []
    
    // Build rows from scores data
    scores.forEach(score => {
      const judge = judges.find(j => String(j.id) === String(score.judge_id))
      const contestant = contestants.find(c => String(c.id) === String(score.contestant_id))
      
      let category = null
      let criterion = null
      
      // Find category and criterion
      categories.forEach(cat => {
        cat.criteria?.forEach(crit => {
          if (String(crit.id) === String(score.criterion_id)) {
            category = cat
            criterion = crit
          }
        })
      })

      if (judge && contestant && criterion && category) {
        const percentage = ((parseFloat(score.score) / (criterion.max_points || 1)) * 100).toFixed(2)
        rows.push([
          judge.id,
          judge.name || 'N/A',
          contestant.number,
          contestant.name,
          category.name,
          criterion.name,
          parseFloat(score.score).toFixed(2),
          criterion.max_points,
          percentage,
          new Date(score.created_at || Date.now()).toLocaleString()
        ])
      }
    })

    // Sort by judge, then contestant, then category
    rows.sort((a, b) => {
      if (a[0] !== b[0]) return String(a[0]).localeCompare(String(b[0]))
      if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]))
      return String(a[4]).localeCompare(String(b[4]))
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `judge-scores-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${rows.length} individual scores!`)
  }

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-500'
    if (rank === 3) return 'from-orange-400 to-orange-600'
    return 'from-blue-400 to-blue-600'
  }

  // Calculate overall completion percentage
  // For category-specific judge assignments, count actual judges per category
  let totalExpectedScores = 0
  
  if (judges.length > 0 && contestants.length > 0 && categories.length > 0) {
    // Calculate expected scores considering category-specific judge assignments
    categories.forEach(category => {
      const categoryId = String(category.id)
      const categoryJudges = categoryAssignments.filter(ca => String(ca.category_id) === categoryId)
      const judgeCountForCategory = categoryJudges.length > 0 ? categoryJudges.length : judges.length
      const criteriaCount = category.criteria?.length || 0
      totalExpectedScores += judgeCountForCategory * contestants.length * criteriaCount
    })
  }
  
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

        <Button onClick={exportDetailedScores} variant="outline" size="lg" disabled={scores.length === 0}>
          <Download className="mr-2" size={20} />
          Export Judge Scores
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
                    <tr 
                      key={entry.contestant.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedContestantForScores(entry.contestant)
                        fetchJudgesScoresForContestant(entry.contestant.id)
                        setJudgesScoresOpen(true)
                      }}
                    >
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

      {/* Judges Scores Modal */}
      {judgesScoresOpen && selectedContestantForScores && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setJudgesScoresOpen(false)}
        >
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border-0" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye size={28} />
                <div>
                  <CardTitle className="text-white">Judges' Scores Details</CardTitle>
                  <p className="text-sm text-purple-100 mt-1">{selectedContestantForScores?.name} (#{selectedContestantForScores?.number})</p>
                </div>
              </div>
              <button
                onClick={() => setJudgesScoresOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {judgesScoresData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Eye size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-lg">No scores from judges yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const groupedByJudge = {}
                    judgesScoresData.forEach(score => {
                      const judgeId = String(score.judge_id)
                      if (!groupedByJudge[judgeId]) {
                        groupedByJudge[judgeId] = []
                      }
                      groupedByJudge[judgeId].push(score)
                    })

                    return Object.entries(groupedByJudge).map(([judgeId, judgeScores]) => {
                      const judge = judges.find(j => String(j.id) === judgeId)
                      const judgeTotal = judgeScores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
                      
                      return (
                        <div key={judgeId} className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-purple-300 transition-colors">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                {judge?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{judge?.name || `Judge ${judgeId}`}</h4>
                                <p className="text-xs text-gray-600">Total: <span className="text-purple-600 font-bold">{judgeTotal.toFixed(2)}</span></p>
                              </div>
                            </div>
                          </div>

                          {/* Category breakdown */}
                          <div className="space-y-3">
                            {categories.map(category => {
                              const categoryScores = judgeScores.filter(score => {
                                const criterion = category.criteria?.find(c => String(c.id) === String(score.criterion_id))
                                return criterion !== undefined
                              })
                              
                              const categoryTotal = categoryScores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
                              const categoryMax = category.criteria?.reduce((sum, c) => sum + c.max_points, 0) || 100
                              const categoryPercentage = categoryMax > 0 ? (categoryTotal / categoryMax) * 100 : 0

                              return (
                                <div key={category.id} className="bg-white rounded p-3 border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-700">{category.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-600 font-bold">{categoryTotal.toFixed(1)}</span>
                                      <span className="text-gray-500 text-sm">/ {categoryMax}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                                      style={{ width: `${categoryPercentage}%` }}
                                    />
                                  </div>
                                  
                                  {/* Individual criteria */}
                                  <div className="mt-3 space-y-1 text-xs">
                                    {category.criteria?.map(criterion => {
                                      const score = categoryScores.find(s => String(s.criterion_id) === String(criterion.id))
                                      return (
                                        <div key={criterion.id} className="flex justify-between text-gray-600">
                                          <span>{criterion.name}:</span>
                                          <span className="font-semibold text-gray-800">{score ? parseFloat(score.score).toFixed(1) : '—'} / {criterion.max_points}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
