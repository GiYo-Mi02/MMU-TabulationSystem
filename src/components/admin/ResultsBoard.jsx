import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateAverages } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Trophy, TrendingUp, Users, Award, Lock, Unlock, Download, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ResultsBoard() {
  const [contestants, setContestants] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime updates
    const scoresSubscription = supabase
      .channel('results-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        fetchData()
      })
      .subscribe()

    const settingsSubscription = supabase
      .channel('results-settings')
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
  }, [contestants, scores, judges])

  const fetchData = async () => {
    setLoading(true)
    const [contestantsRes, scoresRes, judgesRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('scores').select('*'),
      supabase.from('judges').select('*').eq('active', true)
    ])

    setContestants(contestantsRes.data || [])
    setScores(scoresRes.data || [])
    setJudges(judgesRes.data || [])
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

  const calculateRankings = () => {
    const results = contestants.map(contestant => {
      const contestantScores = scores.filter(s => s.contestant_id === contestant.id)
      const averages = calculateAverages(contestantScores, judges.length)
      
      return {
        ...contestant,
        averages,
        totalAverage: parseFloat(averages.total || 0),
        scoresReceived: contestantScores.length,
        completionRate: judges.length > 0 ? (contestantScores.length / judges.length * 100).toFixed(0) : 0
      }
    })

    // Sort by total average (descending)
    results.sort((a, b) => b.totalAverage - a.totalAverage)
    
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

  const exportResults = () => {
    // Create CSV content
    const headers = ['Rank', 'No.', 'Contestant', 'Category 1 (60%)', 'Category 2 (20%)', 'Category 3 (20%)', 'Weighted Total', 'Progress']
    const rows = rankings.map(r => [
      r.rank,
      r.number,
      r.name,
      r.averages.cat1_total || '0.00',
      r.averages.cat2_total || '0.00',
      r.averages.cat3_total || '0.00',
      r.averages.weighted_total || '0.00',
      `${r.completionRate}%`
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

  const completionPercentage = judges.length > 0 && contestants.length > 0
    ? Math.round((scores.length / (judges.length * contestants.length)) * 100)
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

        <Button onClick={exportResults} variant="outline" size="lg" disabled={rankings.length === 0}>
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
          ) : rankings.length === 0 ? (
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cat 1<br/><span className="text-[10px] font-normal">(60%)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cat 2<br/><span className="text-[10px] font-normal">(20%)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cat 3<br/><span className="text-[10px] font-normal">(20%)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Weighted Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankings.map((contestant) => (
                    <tr key={contestant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankBadgeColor(contestant.rank)} flex items-center justify-center text-white font-bold`}>
                          {contestant.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                          {contestant.number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{contestant.name}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{contestant.averages.cat1_total || '-'}</td>
                      <td className="px-6 py-4 text-center text-sm">{contestant.averages.cat2_total || '-'}</td>
                      <td className="px-6 py-4 text-center text-sm">{contestant.averages.cat3_total || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-blue-600">
                          {contestant.averages.weighted_total || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${contestant.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                            {contestant.scoresReceived}/{judges.length}
                          </span>
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
