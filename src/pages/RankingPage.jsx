import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Crown, Medal } from 'lucide-react'
import { computeCompetitionStandings } from '@/lib/scoring'

export default function RankingPage() {
  const [contestants, setContestants] = useState([])
  const [categories, setCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [standings, setStandings] = useState({ overall: { rankings: [], byGender: {} }, rounds: [] })
  const [selectedRoundId, setSelectedRoundId] = useState('overall')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('ranking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!contestants.length || !categories.length) return
    const computed = computeCompetitionStandings({
      contestants,
      categories,
      rounds,
      scores,
      judges
    })
    setStandings(computed)
    setLoading(false)
  }, [contestants, categories, rounds, scores, judges])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [contestantsRes, categoriesRes, roundsRes, scoresRes, judgesRes] = await Promise.all([
        supabase.from('contestants').select('*').order('number'),
        supabase
          .from('categories')
          .select('*, round:rounds(*), criteria(*)')
          .order('order_index'),
        supabase.from('rounds').select('*').order('order_index'),
        supabase.from('contestant_scores').select('*'),
        supabase.from('judges').select('*').eq('active', true)
      ])

      setContestants(contestantsRes.data || [])
      setCategories(categoriesRes.data || [])
      setRounds(roundsRes.data || [])
      setScores(scoresRes.data || [])
      setJudges(judgesRes.data || [])

      if (selectedRoundId !== 'overall' && !roundsRes.data?.some((round) => round.id === selectedRoundId)) {
        setSelectedRoundId('overall')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const activeRound = useMemo(() => {
    if (selectedRoundId === 'overall') return null
    return rounds.find((round) => round.id === selectedRoundId) || null
  }, [rounds, selectedRoundId])

  const roundStandings = useMemo(() => {
    if (selectedRoundId === 'overall') {
      return standings.overall.byGender || { male: [], female: [], other: [] }
    }

    const roundData = standings.rounds.find((entry) => entry.round.id === selectedRoundId)
    if (!roundData) return { male: [], female: [], other: [] }
    return roundData.byGender || { male: [], female: [], other: [] }
  }, [standings, selectedRoundId])

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-10 h-10 text-yellow-400" />
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300" />
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400" />
    return <Trophy className="w-8 h-8 text-yellow-500/60" />
  }

  const getRoundLabel = () => {
    if (selectedRoundId === 'overall') return 'Overall Standings'
    if (activeRound?.name) return activeRound.name
    return `Round ${activeRound?.order_index || ''}`
  }

  const renderColumn = (title, entries) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="bg-black/40 border border-yellow-600/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
          <div className="text-gray-400 text-sm">No contestants available.</div>
        </div>
      )
    }

    return (
      <div className="bg-black/40 border border-yellow-600/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const contestant = entry.contestant || {}
            const rank = entry.genderRank || entry.overallRank || index + 1
            return (
              <div
                key={`${contestant.id}-${rank}`}
                className={`flex items-center gap-4 p-4 rounded-xl transition ${entry.isHighlighted ? 'bg-yellow-500/10 border border-yellow-400/40' : 'bg-black/40 border border-transparent hover:border-yellow-500/30'}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                    {rank}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getRankIcon(rank)}
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-white">{contestant.name}</div>
                  <div className="text-sm text-gray-400 flex gap-3">
                    <span>No. {contestant.number}</span>
                    <span>{contestant.college || contestant.sex || 'Contestant'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">{entry.totalWeightedScore.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Weighted Score</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Rankings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8 text-white">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mb-4">
          Competition Leaderboards
        </h1>
        <p className="text-gray-300 text-lg">Track standings by round and gender with live updates.</p>
      </div>

      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setSelectedRoundId('overall')}
            className={`px-5 py-3 rounded-xl text-sm font-semibold transition ${selectedRoundId === 'overall' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            Overall Standings
          </button>
          {rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setSelectedRoundId(round.id)}
              className={`px-5 py-3 rounded-xl text-sm font-semibold transition ${selectedRoundId === round.id ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              {round.name || `Round ${round.order_index}`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-black/40 border border-yellow-600/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-yellow-400">{getRoundLabel()}</h2>
              {activeRound && (
                <p className="text-gray-300 text-sm mt-1">
                  Target progression: top {activeRound.advance_per_gender || activeRound.max_per_gender || 'performers'} per gender advance
                </p>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {contestants.length} total contestants • {judges.length} judges submitting scores
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderColumn('Male Division', roundStandings.male)}
            {renderColumn('Female Division', roundStandings.female)}
          </div>

          {roundStandings.other && roundStandings.other.length > 0 && (
            <div className="mt-6">
              {renderColumn('Other Division', roundStandings.other)}
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-12 text-gray-400 text-sm">
        Live rankings auto-refresh with every judge submission.
      </div>
    </div>
  )
}
