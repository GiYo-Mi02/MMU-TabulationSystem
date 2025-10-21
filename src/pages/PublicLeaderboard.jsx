import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Crown, Medal, Sparkles } from 'lucide-react'
import LiveIndicator from '@/components/ui/LiveIndicator'
import { computeCompetitionStandings } from '@/lib/scoring'

export default function PublicLeaderboard() {
  const [contestants, setContestants] = useState([])
  const [categories, setCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [scores, setScores] = useState([])
  const [judges, setJudges] = useState([])
  const [standings, setStandings] = useState({ overall: { rankings: [], byGender: {} }, rounds: [] })
  const [selectedRoundId, setSelectedRoundId] = useState('overall')
  const [selectedGender, setSelectedGender] = useState('all')

  useEffect(() => {
    fetchData()

    const scoresSubscription = supabase
      .channel('public-contestant-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestant_scores' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      scoresSubscription.unsubscribe()
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
  }, [contestants, categories, rounds, scores, judges])

  const fetchData = async () => {
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
  }

  const activeRound = useMemo(() => {
    if (selectedRoundId === 'overall') return null
    return rounds.find((round) => round.id === selectedRoundId) || null
  }, [rounds, selectedRoundId])

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

  const topThree = useMemo(() => displayRankings.slice(0, 3), [displayRankings])

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={48} />
    if (rank === 2) return <Medal className="text-white" size={40} />
    if (rank === 3) return <Medal className="text-yellow-600" size={40} />
    return null
  }

  const getRankStyle = (rank) => {
    if (rank === 1) return 'from-yellow-400 via-yellow-500 to-yellow-600 scale-110'
    if (rank === 2) return 'from-gray-200 via-white to-gray-300 text-black scale-105'
    if (rank === 3) return 'from-yellow-700 via-yellow-800 to-yellow-900'
    return 'from-gray-700 via-gray-800 to-gray-900'
  }

  const getRoundLabel = () => {
    if (selectedRoundId === 'overall') return 'Overall Leaderboard'
    if (activeRound?.name) return activeRound.name
    if (activeRound?.order_index) return `Round ${activeRound.order_index}`
    return 'Leaderboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-8">
      {/* Live Indicator - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <LiveIndicator />
      </div>

      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="text-yellow-400 animate-pulse" size={40} />
          <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            {getRoundLabel()}
          </h1>
          <Sparkles className="text-yellow-400 animate-pulse" size={40} />
        </div>
        <p className="text-2xl text-gray-300">Live Rankings • {selectedGender === 'all' ? 'All Contestants' : selectedGender === 'male' ? 'Male Division' : 'Female Division'}</p>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-black/40 border border-yellow-600/20 rounded-2xl p-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRoundId('overall')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedRoundId === 'overall' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              Overall
            </button>
            {rounds.map((round) => (
              <button
                key={round.id}
                onClick={() => setSelectedRoundId(round.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedRoundId === round.id ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
              >
                {round.name || `Round ${round.order_index}`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedGender('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedGender === 'all' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedGender('male')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedGender === 'male' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              Male
            </button>
            <button
              onClick={() => setSelectedGender('female')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedGender === 'female' ? 'bg-yellow-500 text-black shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {topThree.length === 3 && (
        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-center gap-6">
            {topThree.map((entry, index) => {
              const rank = entry.overallRank || index + 1
              const contestant = entry.contestant || {}
              const containerStyles =
                rank === 1
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-4 border-yellow-400 shadow-2xl transform scale-110'
                  : rank === 2
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-500 shadow-xl'
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-700 shadow-xl'
              const delay = rank === 1 ? '0s' : rank === 2 ? '0.2s' : '0.4s'

              return (
                <div key={contestant.id} className={`flex-1 text-center animate-slide-up`} style={{ animationDelay: delay }}>
                  <div className={`${containerStyles} backdrop-blur-lg rounded-2xl p-6 md:p-8`}
                  >
                    {contestant.photo_url && (
                      <img
                        src={contestant.photo_url}
                        alt={contestant.name}
                        className={`mx-auto mb-4 object-cover rounded-full ${rank === 1 ? 'w-40 h-40 border-4 border-white ring-4 ring-yellow-300' : 'w-32 h-32 border-4 border-yellow-500/40'}`}
                      />
                    )}
                    <div className={`mb-3 ${rank === 1 ? 'animate-bounce' : ''}`}>{getRankIcon(rank)}</div>
                    <div className={`font-bold ${rank === 1 ? 'text-5xl text-black' : 'text-4xl text-white'} mb-2`}>{contestant.name}</div>
                    <div className={`${rank === 1 ? 'text-2xl text-black/80' : 'text-2xl text-gray-300'} mb-2`}>No. {contestant.number}</div>
                    <div className={`${rank === 1 ? 'text-6xl text-black animate-pulse' : 'text-5xl text-yellow-400'} font-bold`}>{entry.totalWeightedScore.toFixed(2)}</div>
                    <div className={`${rank === 1 ? 'text-black mt-3 font-bold' : 'text-sm text-gray-400 mt-2'}`}>
                      {rank === 1 ? '🏆 CHAMPION 🏆' : `${rank === 2 ? '2nd' : '3rd'} Place`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-black backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-yellow-600/30">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-400" size={32} />
              <h2 className="text-3xl font-bold text-white">Complete Rankings</h2>
            </div>
            {activeRound && (
              <div className="text-sm text-gray-300">
                <span className="font-semibold text-yellow-400">Round Goal:</span>{' '}
                Top {activeRound.advance_per_gender || activeRound.max_per_gender || 'Performers'} per gender advance
              </div>
            )}
          </div>
          
          {displayRankings.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-yellow-400/30 mb-4 opacity-50" />
              <p className="text-xl text-gray-400">Waiting for scores...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayRankings.map((entry, index) => {
                const contestant = entry.contestant || {}
                const rank = entry.overallRank || index + 1
                return (
                  <div
                    key={`${contestant.id}-${rank}`}
                    className={`bg-black/50 rounded-xl p-4 flex items-center gap-6 hover:bg-black/70 transition-all animate-slide-in border ${entry.isHighlighted ? 'border-yellow-400' : 'border-gray-800 hover:border-yellow-600/50'}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankStyle(rank)} flex items-center justify-center ${rank === 2 ? 'text-black' : 'text-white'} font-bold text-2xl shadow-lg`}>
                      {rank}
                    </div>
                    
                    {contestant.photo_url && (
                      <img
                        src={contestant.photo_url}
                        alt={contestant.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-yellow-600/50"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-white">{contestant.name}</div>
                      <div className="text-gray-400 flex gap-4 text-sm">
                        <span>Contestant No. {contestant.number}</span>
                        <span>{contestant.sex || contestant.gender}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Weighted Score</div>
                      <div className="text-4xl font-bold text-yellow-400">{entry.totalWeightedScore.toFixed(2)}</div>
                    </div>
                    
                    {rank <= 3 && (
                      <div className="ml-4">
                        {getRankIcon(rank)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center mt-8 text-gray-400">
        <div className="inline-flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Live Updates Active</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
