import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateAverages } from '@/lib/utils'
import { Trophy, Crown, Medal, Sparkles } from 'lucide-react'
import LiveIndicator from '@/components/ui/LiveIndicator'

export default function PublicLeaderboard() {
  const [rankings, setRankings] = useState([])
  const [roundName, setRoundName] = useState('Main Round')

  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime updates
    const scoresSubscription = supabase
      .channel('public-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        fetchData()
      })
      .subscribe()

    const contestantsSubscription = supabase
      .channel('public-contestants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      scoresSubscription.unsubscribe()
      contestantsSubscription.unsubscribe()
    }
  }, [])

  const fetchData = async () => {
    const [contestantsRes, scoresRes, judgesRes, settingsRes] = await Promise.all([
      supabase.from('contestants').select('*').order('number'),
      supabase.from('scores').select('*'),
      supabase.from('judges').select('*').eq('active', true),
      supabase.from('settings').select('*').eq('key', 'round_name').single()
    ])

    const contestants = contestantsRes.data || []
    const scores = scoresRes.data || []
    const judges = judgesRes.data || []

    if (settingsRes.data) {
      setRoundName(settingsRes.data.value || 'Main Round')
    }

    const results = contestants.map(contestant => {
      const contestantScores = scores.filter(s => s.contestant_id === contestant.id)
      const averages = calculateAverages(contestantScores, judges.length)
      
      return {
        ...contestant,
        averages,
        totalAverage: parseFloat(averages.total || 0)
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
            {roundName}
          </h1>
          <Sparkles className="text-yellow-400 animate-pulse" size={40} />
        </div>
        <p className="text-2xl text-gray-300">Live Rankings</p>
      </div>

      {/* Top 3 Podium */}
      {rankings.length >= 3 && (
        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex items-end justify-center gap-6">
            {/* 2nd Place */}
            <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-lg rounded-2xl p-6 border-2 border-gray-400 shadow-2xl">
                {rankings[1].photo_url && (
                  <img
                    src={rankings[1].photo_url}
                    alt={rankings[1].name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-gray-400"
                  />
                )}
                <div className="mb-3">{getRankIcon(2)}</div>
                <div className="text-4xl font-bold mb-2 text-white">{rankings[1].name}</div>
                <div className="text-2xl text-gray-400 mb-2">No. {rankings[1].number}</div>
                <div className="text-5xl font-bold text-yellow-400">{rankings[1].totalAverage.toFixed(2)}</div>
                <div className="text-sm text-gray-400 mt-2">2nd Place</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '0s' }}>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 backdrop-blur-lg rounded-2xl p-8 border-4 border-yellow-400 shadow-2xl transform scale-110">
                {rankings[0].photo_url && (
                  <img
                    src={rankings[0].photo_url}
                    alt={rankings[0].name}
                    className="w-40 h-40 rounded-full mx-auto mb-4 object-cover border-4 border-white ring-4 ring-yellow-300"
                  />
                )}
                <div className="mb-3 animate-bounce">{getRankIcon(1)}</div>
                <div className="text-5xl font-bold mb-2 text-black">{rankings[0].name}</div>
                <div className="text-3xl text-black/80 mb-3">No. {rankings[0].number}</div>
                <div className="text-6xl font-bold text-black animate-pulse">{rankings[0].totalAverage.toFixed(2)}</div>
                <div className="text-lg text-black mt-3 font-bold">🏆 CHAMPION 🏆</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-700 shadow-2xl">
                {rankings[2].photo_url && (
                  <img
                    src={rankings[2].photo_url}
                    alt={rankings[2].name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-yellow-700"
                  />
                )}
                <div className="mb-3">{getRankIcon(3)}</div>
                <div className="text-4xl font-bold mb-2 text-white">{rankings[2].name}</div>
                <div className="text-2xl text-yellow-700 mb-2">No. {rankings[2].number}</div>
                <div className="text-5xl font-bold text-yellow-400">{rankings[2].totalAverage.toFixed(2)}</div>
                <div className="text-sm text-yellow-700 mt-2">3rd Place</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-black backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-yellow-600/30">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-yellow-400" size={32} />
            <h2 className="text-3xl font-bold text-white">Complete Rankings</h2>
          </div>
          
          {rankings.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-yellow-400/30 mb-4 opacity-50" />
              <p className="text-xl text-gray-400">Waiting for scores...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankings.map((contestant, index) => (
                <div
                  key={contestant.id}
                  className="bg-black/50 rounded-xl p-4 flex items-center gap-6 hover:bg-black/70 transition-all animate-slide-in border border-gray-800 hover:border-yellow-600/50"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankStyle(contestant.rank)} flex items-center justify-center ${contestant.rank === 2 ? 'text-black' : 'text-white'} font-bold text-2xl shadow-lg`}>
                    {contestant.rank}
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
                    <div className="text-gray-400">Contestant No. {contestant.number}</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">Average Score</div>
                    <div className="text-4xl font-bold text-yellow-400">{contestant.totalAverage.toFixed(2)}</div>
                  </div>
                  
                  {contestant.rank <= 3 && (
                    <div className="ml-4">
                      {getRankIcon(contestant.rank)}
                    </div>
                  )}
                </div>
              ))}
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
