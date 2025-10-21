import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Crown, Medal } from 'lucide-react'

export default function RankingPage() {
  const [contestants, setContestants] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Subscribe to real-time updates
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

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select(`
          *,
          criteria (*)
        `)
        .order('order_index')

      if (categoriesData) {
        categoriesData.forEach(cat => {
          if (cat.criteria) {
            cat.criteria.sort((a, b) => a.order_index - b.order_index)
          }
        })
        setCategories(categoriesData)
      }

      // Fetch contestants
      const { data: contestantsData } = await supabase
        .from('contestants')
        .select('*')
        .order('number')

      // Fetch all scores
      const { data: scoresData } = await supabase
        .from('contestant_scores')
        .select('*')

      if (contestantsData && scoresData && categoriesData) {
        // Calculate final scores for each contestant
        const contestantsWithScores = contestantsData.map(contestant => {
          let totalScore = 0

          categoriesData.forEach(category => {
            const categoryScores = scoresData.filter(s => 
              s.contestant_id === contestant.id &&
              category.criteria?.some(c => c.id === s.criterion_id)
            )

            const categoryTotal = categoryScores.reduce((sum, s) => sum + s.score, 0)
            const categoryMax = category.criteria?.reduce((sum, c) => sum + c.max_points, 0) || 100
            const normalized = (categoryTotal / categoryMax) * 100
            totalScore += normalized * (category.percentage / 100)
          })

          return {
            ...contestant,
            finalScore: totalScore
          }
        })

        // Sort by score and add rank
        const sorted = contestantsWithScores
          .filter(c => c.finalScore > 0)
          .sort((a, b) => b.finalScore - a.finalScore)
          .map((c, index) => ({
            ...c,
            rank: index + 1
          }))

        setContestants(sorted)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-black to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Rankings...</p>
        </div>
      </div>
    )
  }

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Crown className="w-12 h-12 text-yellow-400" />
      case 2:
        return <Medal className="w-12 h-12 text-gray-300" />
      case 3:
        return <Medal className="w-12 h-12 text-orange-400" />
      default:
        return <Trophy className="w-10 h-10 text-gray-500" />
    }
  }

  const getRankColor = (rank) => {
    switch(rank) {
      case 1:
        return 'from-yellow-600 to-yellow-400 shadow-yellow-500/50'
      case 2:
        return 'from-gray-400 to-gray-300 shadow-gray-400/50'
      case 3:
        return 'from-orange-500 to-orange-400 shadow-orange-500/50'
      default:
        return 'from-gray-700 to-gray-600 shadow-gray-700/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-black p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 mb-4">
          🏆 LIVE RANKINGS 🏆
        </h1>
        <p className="text-2xl text-gray-300">Current Competition Standings</p>
      </div>

      {contestants.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-24 h-24 text-gray-600 mx-auto mb-4" />
          <p className="text-2xl text-gray-400">No scores available yet</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          {contestants.map((contestant) => (
            <div
              key={contestant.id}
              className={`bg-gradient-to-r ${getRankColor(contestant.rank)} rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-all duration-300`}
            >
              <div className="flex items-center gap-6">
                {/* Rank Badge */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  {getRankIcon(contestant.rank)}
                </div>

                {/* Rank Number */}
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                  <span className={`text-4xl font-bold ${contestant.rank <= 3 ? 'text-white' : 'text-gray-300'}`}>
                    #{contestant.rank}
                  </span>
                </div>

                {/* Photo */}
                {contestant.photo_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={contestant.photo_url}
                      alt={contestant.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  </div>
                )}

                {/* Contestant Info */}
                <div className="flex-1">
                  <h3 className={`text-3xl font-bold mb-1 ${contestant.rank <= 3 ? 'text-white' : 'text-gray-100'}`}>
                    {contestant.name}
                  </h3>
                  <p className={`text-lg ${contestant.rank <= 3 ? 'text-white/80' : 'text-gray-200'}`}>
                    Contestant #{contestant.number} • {contestant.college || 'No College'}
                  </p>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-5xl font-bold ${contestant.rank <= 3 ? 'text-white' : 'text-gray-100'}`}>
                    {contestant.finalScore.toFixed(2)}
                  </div>
                  <div className={`text-sm ${contestant.rank <= 3 ? 'text-white/70' : 'text-gray-300'}`}>
                    POINTS
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 text-gray-400 text-sm">
        <p>Rankings update in real-time • Powered by Tabulation System</p>
      </div>
    </div>
  )
}
