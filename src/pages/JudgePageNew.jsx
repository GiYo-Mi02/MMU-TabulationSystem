import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { Menu, BookOpen, HelpCircle, LogOut, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Bell, AlertCircle } from 'lucide-react'

export default function JudgePageNew() {
  const { token } = useParams()
  const [judge, setJudge] = useState(null)
  const [contestants, setContestants] = useState([])
  const [scores, setScores] = useState([])
  const [isLocked, setIsLocked] = useState(false)
  const [selectedContestant, setSelectedContestant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [genderFilter, setGenderFilter] = useState('Male') // Male or Female
  const [currentPage, setCurrentPage] = useState(1)
  const contestantsPerPage = 10
  const [criteriaGuideOpen, setCriteriaGuideOpen] = useState(false)
  const [assistanceOpen, setAssistanceOpen] = useState(false)
  const [assistanceRequested, setAssistanceRequested] = useState(false)
  const [categories, setCategories] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [currentScoresData, setCurrentScoresData] = useState({})
  const [activeRoundId, setActiveRoundId] = useState(null)
  const [activeRoundName, setActiveRoundName] = useState('Current Round')
  const [judgesCount, setJudgesCount] = useState(0)
  const [categoryAssignments, setCategoryAssignments] = useState(new Set())

  useEffect(() => {
    if (rounds.length === 0) return

    if (!activeRoundId) {
      const firstRound = rounds[0]
      if (firstRound) {
        setActiveRoundId(String(firstRound.id))
        setActiveRoundName(firstRound.name || 'Current Round')
      }
      return
    }

    const matchedRound = rounds.find(round => String(round.id) === String(activeRoundId))
    if (matchedRound) {
      setActiveRoundName(matchedRound.name || 'Current Round')
    }
  }, [rounds, activeRoundId])

  useEffect(() => {
    if (!allCategories.length) {
      setCategories([])
      return
    }

    if (!activeRoundId) {
      setCategories(allCategories)
      return
    }

    const filtered = allCategories.filter(
      (category) => String(category.round_id) === String(activeRoundId)
    )

    if (filtered.length > 0) {
      setCategories(filtered)
      return
    }

    const fallbackCategory = allCategories.find((category) => category.round_id)
    if (fallbackCategory) {
      setActiveRoundId(String(fallbackCategory.round_id))
      const fallback = allCategories.filter(
        (category) => String(category.round_id) === String(fallbackCategory.round_id)
      )
      setCategories(fallback)
    } else {
      setCategories(allCategories)
    }
  }, [allCategories, activeRoundId])

  useEffect(() => {
    if (!activeCategory) return
    const categoryExists = categories.some((category) => category.id === activeCategory)
    if (!categoryExists) {
      setActiveCategory(categories[0]?.id || null)
    }
  }, [categories, activeCategory])

  useEffect(() => {
    // Refetch categories when category assignments change
    if (judge) {
      fetchCategories()
    }
  }, [categoryAssignments])

  useEffect(() => {
    fetchJudgeData()
    fetchContestants()
    fetchRounds()
    fetchCategories()
    fetchSettings()
    checkExistingAssistanceRequest()
  fetchJudgeCount()
    
    // Subscribe to scores changes with better channel handling
    const scoresSubscription = supabase
      .channel('judge-scores-realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: '' }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contestant_scores' 
      }, (payload) => {
        console.log('Scores changed:', payload)
        fetchScores()
      })
      .subscribe((status) => {
        console.log('Scores subscription status:', status)
      })

    // Subscribe to categories changes
    const categoriesSubscription = supabase
      .channel('categories-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'categories' 
      }, (payload) => {
        console.log('Categories changed:', payload)
        fetchCategories()
      })
      .subscribe((status) => {
        console.log('Categories subscription status:', status)
      })

    // Subscribe to criteria changes
    const criteriaSubscription = supabase
      .channel('criteria-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'criteria' 
      }, (payload) => {
        console.log('Criteria changed:', payload)
        fetchCategories()
      })
      .subscribe((status) => {
        console.log('Criteria subscription status:', status)
      })

    // Subscribe to settings changes
    const settingsSubscription = supabase
      .channel('settings-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings' 
      }, (payload) => {
        console.log('Settings changed:', payload)
        fetchSettings()
      })
      .subscribe((status) => {
        console.log('Settings subscription status:', status)
      })

    // Subscribe to rounds changes
    const roundsSubscription = supabase
      .channel('rounds-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rounds'
      }, (payload) => {
        console.log('Rounds changed:', payload)
        fetchRounds()
      })
      .subscribe((status) => {
        console.log('Rounds subscription status:', status)
      })

    // Subscribe to judges changes
    const judgesSubscription = supabase
      .channel('judges-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'judges'
      }, (payload) => {
        console.log('Judges changed:', payload)
        fetchJudgeCount()
      })
      .subscribe((status) => {
        console.log('Judges subscription status:', status)
      })

    // Subscribe to contestants changes
    const contestantsSubscription = supabase
      .channel('contestants-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contestants' 
      }, (payload) => {
        console.log('Contestants changed:', payload)
        fetchContestants()
      })
      .subscribe((status) => {
        console.log('Contestants subscription status:', status)
      })

    // Subscribe to assistance requests changes (for this judge)
    let assistanceSubscription = null
    let categoryJudgesSubscription = null
    
    if (judge) {
      console.log('Setting up assistance subscription for judge:', judge.id, judge.name)
      
      assistanceSubscription = supabase
        .channel(`judge-assistance-${judge.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'assistance_requests',
          filter: `judge_id=eq.${judge.id}`
        }, (payload) => {
          console.log('✅ Assistance request updated for this judge:', payload)
          
          if (payload.new.status === 'resolved') {
            // Notify judge that help has arrived
            const audio = new Audio('/notification.mp3')
            audio.play().catch(e => console.log('Could not play sound:', e))
            
            toast.success(`✅ Assistance resolved by ${payload.new.resolved_by}!`, {
              duration: 8000,
              description: 'Event staff has addressed your concern. You can continue scoring.',
            })
            
            // Update the assistance requested state
            setAssistanceRequested(false)
            console.log('✅ Assistance state updated to false')
          } else if (payload.new.status === 'cancelled') {
            // Notify judge that request was cancelled
            toast.info('ℹ️ Your assistance request was cancelled', {
              duration: 5000,
            })
            
            // Update the assistance requested state
            setAssistanceRequested(false)
            console.log('ℹ️ Assistance state updated to false (cancelled)')
          }
        })
        .subscribe((status) => {
          console.log('Assistance subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to assistance updates')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to assistance updates')
          }
        })

      // Subscribe to category judge assignments changes
      categoryJudgesSubscription = supabase
        .channel('category-judges-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'category_judges',
          filter: `judge_id=eq.${judge.id}`
        }, (payload) => {
          console.log('Judge category assignments changed:', payload)
          fetchJudgeCategoryAssignments(judge.id)
        })
        .subscribe((status) => {
          console.log('Category judges subscription status:', status)
        })
    }

    return () => {
      console.log('Cleaning up subscriptions...')
      supabase.removeChannel(scoresSubscription)
      supabase.removeChannel(categoriesSubscription)
      supabase.removeChannel(criteriaSubscription)
      supabase.removeChannel(settingsSubscription)
      supabase.removeChannel(contestantsSubscription)
      if (assistanceSubscription) {
        supabase.removeChannel(assistanceSubscription)
      }
      if (categoryJudgesSubscription) {
        supabase.removeChannel(categoryJudgesSubscription)
      }
      supabase.removeChannel(roundsSubscription)
      supabase.removeChannel(judgesSubscription)
    }
  }, [token, judge?.id])

  useEffect(() => {
    if (judge) {
      fetchScores()
    }
  }, [judge?.id])

  useEffect(() => {
    if (selectedContestant && judge) {
      fetchContestantScores()
    }
  }, [selectedContestant, scores, judge?.id, categories])

  const fetchContestantScores = async () => {
    if (!selectedContestant || !judge) return

    const { data: scoresData } = await supabase
      .from('contestant_scores')
      .select('*')
      .eq('contestant_id', selectedContestant.id)
      .eq('judge_id', judge.id)

    if (scoresData && scoresData.length > 0) {
      const scoresMap = {}
      scoresData.forEach(score => {
        scoresMap[score.criterion_id] = score.score
      })
      setCurrentScoresData(scoresMap)
    } else {
      setCurrentScoresData({})
    }
  }

  const fetchJudgeData = async () => {
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .eq('url_token', token)
      .single()

    if (error || !data) {
      toast.error('Invalid judge link')
      return
    }

    if (!data.active) {
      toast.error('This judge account is deactivated')
      return
    }

    setJudge(data)
    
    // Fetch this judge's category assignments
    await fetchJudgeCategoryAssignments(data.id)
  }

  const fetchJudgeCategoryAssignments = async (judgeId) => {
    const { data, error } = await supabase
      .from('category_judges')
      .select('category_id')
      .eq('judge_id', judgeId)

    if (error) {
      console.error('Failed to load category assignments:', error)
      return
    }

    const assignedCategoryIds = new Set((data || []).map(d => String(d.category_id)))
    setCategoryAssignments(assignedCategoryIds)
  }

  const fetchContestants = async () => {
    const { data } = await supabase
      .from('contestants')
      .select('*')
      .order('number')

    setContestants(data || [])
    
    // Auto-select first contestant of current gender filter
    if (data && data.length > 0 && !selectedContestant) {
      const filteredData = data.filter(c => c.sex === genderFilter)
      if (filteredData.length > 0) {
        setSelectedContestant(filteredData[0])
      }
    }
    setLoading(false)
  }

  const fetchRounds = async () => {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .order('order_index')

    if (error) {
      console.error('Failed to load rounds:', error)
      return
    }

    const normalizedRounds = (data || []).map(round => ({
      ...round,
      id: round.id || round.round_id,
      judge_target:
        round.judge_target === null || round.judge_target === undefined
          ? null
          : Number(round.judge_target)
    }))

    setRounds(normalizedRounds)

    if (!activeRoundId && normalizedRounds.length > 0) {
      setActiveRoundId(String(normalizedRounds[0].id))
    }
  }

  const fetchCategories = async (roundIdOverride = null) => {
    const { data: categoriesData, error } = await supabase
      .from('categories')
      .select(`
        *,
        criteria (*)
      `)
      .order('order_index')

    if (error) {
      console.error('Failed to load categories:', error)
      toast.error('Unable to load categories')
      setCategories([])
      setAllCategories([])
      return
    }

    const normalizedCategories = (categoriesData || []).map((category) => {
      const sortedCriteria = [...(category.criteria || [])].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      )
      const roundId = category.round_id ? String(category.round_id) : null
      return {
        ...category,
        round_id: roundId,
        criteria: sortedCriteria
      }
    })

    // Filter categories based on judge's category assignments
    // If no category assignments exist (fallback), show all categories
    let filteredCategories = normalizedCategories
    if (categoryAssignments.size > 0) {
      filteredCategories = normalizedCategories.filter(cat => 
        categoryAssignments.has(String(cat.id))
      )
    }

    setAllCategories(filteredCategories)

    const overrideRoundId = roundIdOverride ? String(roundIdOverride) : null

    if (overrideRoundId && overrideRoundId !== activeRoundId) {
      setActiveRoundId(overrideRoundId)
    }

    if (!overrideRoundId && !activeRoundId) {
      const roundFromCategories = filteredCategories.find((cat) => cat.round_id)
      if (roundFromCategories?.round_id) {
        const derivedRoundId = String(roundFromCategories.round_id)
        setActiveRoundId(derivedRoundId)
      }
    }
  }

  // Get filtered contestants by gender
  const getFilteredContestants = () => {
    return contestants.filter(c => c.sex === genderFilter)
  }

  const getJudgeTarget = () => {
    const defaultJudgeCount = Math.max(judgesCount, 1)
    if (!activeRoundId) return defaultJudgeCount
    const roundMatch = rounds.find(round => String(round.id) === String(activeRoundId))
    const configured = Number(roundMatch?.judge_target)
    if (Number.isFinite(configured) && configured > 0) {
      return configured
    }
    return defaultJudgeCount
  }

  // Get paginated contestants
  const getPaginatedContestants = () => {
    const filtered = getFilteredContestants()
    const startIndex = (currentPage - 1) * contestantsPerPage
    const endIndex = startIndex + contestantsPerPage
    return filtered.slice(startIndex, endIndex)
  }

  // Calculate total pages
  const getTotalPages = () => {
    const filtered = getFilteredContestants()
    return Math.ceil(filtered.length / contestantsPerPage)
  }

  // Handle gender change
  const handleGenderChange = (gender) => {
    setGenderFilter(gender)
    setCurrentPage(1)
    
    // Auto-select first contestant of new gender
    const filteredContestants = contestants.filter(c => c.sex === gender)
    if (filteredContestants.length > 0) {
      setSelectedContestant(filteredContestants[0])
    }
  }

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const fetchScores = async () => {
    if (!judge) return

    const { data } = await supabase
      .from('contestant_scores')
      .select('*')
      .eq('judge_id', judge.id)

    setScores(data || [])
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['is_locked', 'active_round_id', 'round_name'])

    if (error) {
      console.error('Failed to load settings:', error)
      return
    }

    const settingsMap = {}
    data?.forEach((item) => {
      settingsMap[item.key] = item.value
    })

    setIsLocked(settingsMap.is_locked === 'true')

    const nextRoundId = settingsMap.active_round_id
      ? String(settingsMap.active_round_id).replace(/^"|"$/g, '')
      : null
    const nextRoundName = settingsMap.round_name ? settingsMap.round_name.replace(/^"|"$/g, '') : null

    if (nextRoundId) {
      setActiveRoundId(nextRoundId)
    } else if (rounds.length > 0) {
      setActiveRoundId(String(rounds[0].id))
    }

    if (nextRoundName) {
      setActiveRoundName(nextRoundName)
    }

    // Refresh categories so judges always see the currently active round set by admins.
    fetchCategories(nextRoundId || null)
  }

  const fetchJudgeCount = async () => {
    const { data, error } = await supabase
      .from('judges')
      .select('id, active')

    if (error) {
      console.error('Failed to load judges:', error)
      return
    }

    const activeJudges = (data || []).filter((record) => record.active).length
    setJudgesCount(activeJudges)
  }

  const checkExistingAssistanceRequest = async () => {
    if (!judge) return
    
    try {
      const { data, error } = await supabase
        .from('assistance_requests')
        .select('*')
        .eq('judge_id', judge.id)
        .eq('status', 'pending')

      if (data && data.length > 0) {
        setAssistanceRequested(true)
      }
    } catch (error) {
      // No existing request, which is fine
      console.log('No existing assistance request')
    }
  }

  // Calculate totals dynamically
  const calculateCategoryTotal = (category) => {
    if (!category.criteria) return 0
    return category.criteria.reduce((sum, criterion) => {
      return sum + (parseFloat(currentScoresData[criterion.id]) || 0)
    }, 0)
  }

  const calculateWeightedTotal = () => {
    return categories.reduce((total, category) => {
      const categoryTotal = calculateCategoryTotal(category)
      const categoryMax = category.criteria?.reduce((sum, c) => sum + c.max_points, 0) || 100
      const normalized = (categoryTotal / categoryMax) * 100
      return total + (normalized * (category.percentage / 100))
    }, 0)
  }

  const weightedTotal = calculateWeightedTotal()

  const handleScoreChange = (criterionId, value) => {
    const numValue = parseFloat(value) || 0
    console.log(`Score changed for criterion ${criterionId}:`, numValue)
    setCurrentScoresData(prev => {
      const updated = { ...prev, [criterionId]: numValue }
      console.log('Updated scores data:', updated)
      return updated
    })
  }

  const handleSubmitScore = async () => {
    if (!selectedContestant || !judge || isLocked) {
      console.log('Cannot submit score:', { selectedContestant, judge, isLocked })
      return
    }

    try {
      console.log('Starting score submission...')
      console.log('Current scores data:', currentScoresData)
      console.log('Selected contestant:', selectedContestant.id)
      console.log('Judge:', judge.id)

      // Delete existing scores for this contestant and judge
      const { error: deleteError } = await supabase
        .from('contestant_scores')
        .delete()
        .eq('contestant_id', selectedContestant.id)
        .eq('judge_id', judge.id)

      if (deleteError) {
        console.error('Error deleting old scores:', deleteError)
        throw deleteError
      }

      console.log('Old scores deleted successfully')

      // Insert new scores - include all scores, even zeros
      const scoresToInsert = Object.entries(currentScoresData)
        .map(([criterionId, score]) => ({
          contestant_id: selectedContestant.id,
          judge_id: judge.id,
          criterion_id: criterionId, // Keep as string, don't parse to int
          score: parseFloat(score) || 0
        }))

      console.log('Scores to insert:', scoresToInsert)
      console.log('Sample criterion ID type:', typeof Object.keys(currentScoresData)[0])

      if (scoresToInsert.length > 0) {
        const { data, error } = await supabase
          .from('contestant_scores')
          .insert(scoresToInsert)
          .select()

        if (error) {
          console.error('Error inserting scores:', error)
          throw error
        }

        console.log('Scores inserted successfully:', data)
      } else {
        console.log('No scores to insert')
      }

      toast.success('Score saved successfully!')
      setActiveCategory(null)
      await fetchScores()
      await fetchContestantScores()
    } catch (error) {
      console.error('Error saving score:', error)
      toast.error(`Failed to save score: ${error.message}`)
    }
  }

  const getContestantScore = (contestantId) => {
    // Calculate score from contestant_scores table
    const contestantScores = scores.filter(s => s.contestant_id === contestantId)
    if (contestantScores.length === 0) return null

    // Group by category and calculate weighted total
    let totalScore = 0
    categories.forEach(category => {
      const categoryScores = contestantScores.filter(s => 
        category.criteria?.some(c => c.id === s.criterion_id)
      )
      
      const categoryTotal = categoryScores.reduce((sum, s) => sum + s.score, 0)
      const categoryMax = category.criteria?.reduce((sum, c) => sum + c.max_points, 0) || 100
      const normalized = (categoryTotal / categoryMax) * 100
      totalScore += normalized * (category.percentage / 100)
    })

    return totalScore
  }

  const isContestantScored = (contestantId) => {
    return scores.some(s => s.contestant_id === contestantId)
  }

  if (loading || !judge) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black opacity-90"></div>

      {/* Side Menu - Full on Desktop/Tablet, Burger on Mobile */}
      {/* Desktop/Tablet Side Panel */}
      <div className="hidden lg:flex fixed top-0 right-0 h-full w-16 bg-gray-800 bg-opacity-90 backdrop-blur-sm z-50 flex-col items-center py-6 gap-6 border-l border-gray-700">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
          title="Menu"
        >
          <Menu size={24} />
        </button>
        <button 
          onClick={() => setCriteriaGuideOpen(true)}
          className="p-3 hover:bg-yellow-600 rounded-lg transition-colors"
          title="Criteria Guide"
        >
          <BookOpen size={24} />
        </button>
        <button 
          onClick={() => setAssistanceOpen(true)}
          className="p-3 hover:bg-blue-600 rounded-lg transition-colors"
          title="Get Assistance"
        >
          <HelpCircle size={24} />
        </button>
        <div className="flex-1"></div>
        <button className="p-3 hover:bg-red-600 rounded-lg transition-colors" title="Logout">
          <LogOut size={24} />
        </button>
      </div>

      {/* Mobile Burger Menu Icon - Only visible on mobile, doesn't take up space */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-6 right-4 z-40 p-2 sm:p-3 hover:bg-gray-700 rounded-lg transition-colors"
        title="Menu"
      >
        <Menu size={20} className="sm:w-6 sm:h-6" />
      </button>

      {/* Mobile Menu Dropdown */}
      {sidebarOpen && (
        <div className="lg:hidden fixed top-16 right-2 z-50 bg-gray-800 bg-opacity-95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          <button 
            onClick={() => {
              setCriteriaGuideOpen(true)
              setSidebarOpen(false)
            }}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors border-b border-gray-700 text-left"
            title="Criteria Guide"
          >
            <BookOpen size={20} className="text-yellow-400" />
            <span className="text-sm font-semibold">Criteria Guide</span>
          </button>
          <button 
            onClick={() => {
              setAssistanceOpen(true)
              setSidebarOpen(false)
            }}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            title="Get Assistance"
          >
            <HelpCircle size={20} className="text-blue-400" />
            <span className="text-sm font-semibold">Get Assistance</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:pr-16">
        {/* Header */}
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 bg-gray-800 bg-opacity-50 backdrop-blur-sm border-b border-gray-700">
          <div>
            <h2 className="text-xs text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">MR. AND MS. UNIVERSITY OF MAKATI</h2>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">TABULATION SYSTEM</h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Judges contributing this round: <span className="text-yellow-400 font-semibold">{getJudgeTarget()}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Round</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-400 whitespace-nowrap">{activeRoundName || 'Current Round'}</p>
            </div>
            {isLocked && (
              <div className="bg-red-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold shadow-lg animate-pulse text-sm sm:text-base whitespace-nowrap">
                🔒 SCORING LOCKED
              </div>
            )}
          </div>
        </div>

        {/* Split Layout: Left (Scoring) and Right (Photo) */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Side - Scoring Interface */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 bg-black bg-opacity-40">
            {/* Circular Progress Ring */}
            <div className="relative mb-6 sm:mb-8 cursor-pointer hover:scale-105 transition-transform" onClick={() => !isLocked && categories.length > 0 && setActiveCategory(categories[0].id)}>
              <svg className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#374151"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="#EAB308"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(weightedTotal / 100) * 565.5} 565.5`}
                  strokeLinecap="round"
                  className="transition-all duration-500 progress-glow"
                />
              </svg>
              
              {/* Score Display in Center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest mb-2">(click to score)</div>
                <div className="text-xs sm:text-sm text-gray-300 uppercase tracking-wider mb-1">
                  {categories.length > 0 ? 'OVERALL SCORE' : 'NO CATEGORIES'}
                </div>
                <div className="text-5xl sm:text-6xl lg:text-8xl font-bold text-yellow-400 leading-none">{weightedTotal.toFixed(0)}</div>
                <div className="text-lg sm:text-xl lg:text-2xl text-gray-400 mt-1 sm:mt-2">/100</div>
              </div>
            </div>

            {/* Score Slider */}
            <div className="w-48 sm:w-56 lg:w-64 mb-8 sm:mb-12">
              <input
                type="range"
                min="0"
                max="100"
                value={weightedTotal}
                readOnly
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-yellow"
              />
            </div>

            {/* Category Buttons */}
            {!isLocked && selectedContestant && categories.length > 0 && (
              <div className="flex gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8 flex-wrap justify-center px-2">
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-yellow-400 text-gray-900 rounded-full font-bold text-xs sm:text-sm lg:text-sm hover:bg-yellow-300 transition-all shadow-xl hover:scale-105"
                  >
                    {category.name} ({category.percentage}%)
                  </button>
                ))}
              </div>
            )}

            {/* Contestant Name */}
            <div className="text-center px-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">{selectedContestant?.name?.toUpperCase() || 'NO CONTESTANT'}</h2>
              <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
                {selectedContestant?.age && selectedContestant?.sex 
                  ? `${selectedContestant.sex}, ${selectedContestant.age} years old`
                  : selectedContestant?.number 
                  ? `Candidate #${selectedContestant.number}` 
                  : ''}
              </p>
            </div>
          </div>

          {/* Right Side - Contestant Photo */}
          <div className="w-full lg:w-1/2 relative flex items-center justify-center bg-gray-900 overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-auto">
            {selectedContestant?.photo_url ? (
              <div className="w-1/2 sm:w-2/3 lg:w-1/2 h-auto max-h-[40vh] sm:max-h-[50vh] lg:max-h-[50vh] flex items-center justify-center">
                <img
                  src={selectedContestant.photo_url}
                  alt={selectedContestant.name}
                  className="w-full h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-6xl sm:text-8xl lg:text-9xl font-bold text-gray-600">
                  {selectedContestant?.number || '?'}
                </div>
              </div>
            )}
            
            {/* Logo Overlay */}
            <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 right-4 sm:right-6 lg:right-8">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-2 sm:p-3 lg:p-4 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 flex items-center justify-center shadow-2xl border-4 border-yellow-400">
                <div className="text-center">
                  {selectedContestant?.college ? (
                    <>
                      <div className="text-xs sm:text-sm lg:text-sm font-bold text-gray-800 uppercase leading-tight">
                        {selectedContestant.college}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Candidate #{selectedContestant.number}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">No College Info</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contestant Drawer Toggle */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="w-full py-3 sm:py-4 bg-gray-800 bg-opacity-90 flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors border-t border-gray-700"
        >
          <ChevronUp size={18} className="sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm uppercase tracking-wider font-semibold">Contestants</span>
        </button>

        {/* Contestants Drawer */}
        <div
          className={`fixed bottom-0 left-0 right-0 lg:right-16 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-t border-gray-700 transition-transform duration-300 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto z-40 ${
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Select Contestant</h3>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Gender Filter Tabs */}
            <div className="flex gap-2 mb-3 sm:mb-4 border-b border-gray-700 text-sm">
              <button
                onClick={() => handleGenderChange('Male')}
                className={`px-4 sm:px-6 py-2 font-semibold transition-colors border-b-2 ${
                  genderFilter === 'Male'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Male ({contestants.filter(c => c.sex === 'Male').length})
              </button>
              <button
                onClick={() => handleGenderChange('Female')}
                className={`px-4 sm:px-6 py-2 font-semibold transition-colors border-b-2 ${
                  genderFilter === 'Female'
                    ? 'border-pink-400 text-pink-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Female ({contestants.filter(c => c.sex === 'Female').length})
              </button>
            </div>

            {/* Contestants Grid */}
            <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 mb-3 sm:mb-4">
              {getPaginatedContestants().map((contestant) => (
                <button
                  key={contestant.id}
                  onClick={() => {
                    setSelectedContestant(contestant)
                    setDrawerOpen(false)
                  }}
                  className={`flex-shrink-0 w-20 sm:w-24 ${
                    selectedContestant?.id === contestant.id ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-yellow-400 transition-colors relative">
                    {contestant.photo_url ? (
                      <img
                        src={contestant.photo_url}
                        alt={contestant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xl sm:text-2xl font-bold">
                        {contestant.number}
                      </div>
                    )}
                    {isContestantScored(contestant.id) && (
                      <div className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                    <div className={`absolute bottom-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                      contestant.sex === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}>
                      {contestant.sex?.charAt(0)}{contestant.number}
                    </div>
                  </div>
                  <p className="text-xs mt-1 sm:mt-2 text-center truncate">{contestant.name}</p>
                  {getContestantScore(contestant.id) && (
                    <p className="text-xs text-yellow-400 text-center">{getContestantScore(contestant.id).toFixed(1)}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-sm">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 sm:p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-0.5 sm:gap-1">
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 sm:px-3 py-1 rounded text-sm ${
                        currentPage === page
                          ? 'bg-yellow-400 text-gray-900 font-bold'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="p-1 sm:p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoring Panel Overlay */}
      {activeCategory && !isLocked && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {(() => {
              const category = categories.find(c => c.id === activeCategory)
              console.log('Active category:', activeCategory)
              console.log('Found category:', category)
              console.log('All categories:', categories)
              
              if (!category) {
                return (
                  <div className="text-center py-12">
                    <p className="text-red-400 mb-4">Category not found!</p>
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                )
              }

              const categoryTotal = calculateCategoryTotal(category)
              const categoryMax = category.criteria?.reduce((sum, c) => sum + c.max_points, 0) || 100

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">
                      {category.name} ({category.percentage}%)
                    </h2>
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="p-2 hover:bg-gray-700 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {category.description && (
                    <p className="text-gray-300 mb-6 text-sm">{category.description}</p>
                  )}

                  <div className="space-y-4 sm:space-y-6">
                    {category.criteria && category.criteria.length > 0 ? (
                      category.criteria.map((criterion) => (
                        <div key={criterion.id}>
                          <div className="flex justify-between mb-2 text-sm">
                            <span>{criterion.name} (Max: {criterion.max_points})</span>
                            <span className="text-yellow-400 font-bold">
                              {currentScoresData[criterion.id] || 0}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={criterion.max_points}
                            step="0.5"
                            value={currentScoresData[criterion.id] || 0}
                            onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p>No criteria defined for this category.</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <span className="text-base sm:text-lg">Category Total:</span>
                        <span className="text-2xl sm:text-3xl font-bold text-yellow-400">
                          {categoryTotal.toFixed(1)}/{categoryMax}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitScore}
                    disabled={!category.criteria || category.criteria.length === 0}
                    className="w-full mt-6 bg-yellow-400 text-gray-900 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Score
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Criteria Guide Modal */}
      {criteriaGuideOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <BookOpen size={28} className="sm:w-8 sm:h-8 text-yellow-400" />
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400">Scoring Criteria Guide</h2>
              </div>
              <button
                onClick={() => setCriteriaGuideOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-xl">No categories have been set up yet.</p>
                <p className="text-sm mt-2">Please wait for the admin to configure the scoring criteria.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((category, catIndex) => {
                  const colors = ['yellow', 'blue', 'green', 'purple', 'pink', 'indigo']
                  const color = colors[catIndex % colors.length]
                  
                  return (
                    <div key={category.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                      <h3 className={`text-xl sm:text-2xl font-bold text-${color}-400 mb-3`}>
                        {category.name} - Weight: {category.percentage}%
                      </h3>
                      
                      {category.description && (
                        <div className="bg-gray-800 bg-opacity-60 rounded-lg p-5 border-l-4 border-yellow-400 mb-5">
                          <p className="text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                            {category.description}
                          </p>
                        </div>
                      )}
                      
                      {category.criteria && category.criteria.length > 0 ? (
                        <div className="space-y-3 text-gray-200">
                          {category.criteria.map((criterion, idx) => (
                            <div key={criterion.id} className={`border-l-4 border-${color}-500 pl-4 py-2`}>
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm sm:text-base">
                                  {idx + 1}. {criterion.name}
                                </h4>
                                <span className={`text-${color}-400 font-bold text-sm`}>
                                  Max: {criterion.max_points}pts
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No criteria defined for this category.</p>
                      )}
                    </div>
                  )
                })}

                {/* Scoring Tips */}
                <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-lg p-6 border border-yellow-700">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📋</span> Scoring Tips
                  </h3>
                  <ul className="space-y-2 text-gray-100 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-300 font-bold">•</span>
                      <span>Be fair and consistent across all contestants</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-300 font-bold">•</span>
                      <span>Use the full range of scores (don't just give high scores)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-300 font-bold">•</span>
                      <span>Score each category independently</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-300 font-bold">•</span>
                      <span>Your scores are weighted automatically - focus on judging fairly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-300 font-bold">•</span>
                      <span>Save your scores immediately after completing each category</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Get Assistance Modal - Cinematic Design */}
      {assistanceOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setAssistanceOpen(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cinematic Header with Gradient Background */}
            <div className="relative h-40 sm:h-56 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
              }}></div>
              
              {/* Floating Particles Effect */}
              <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute top-20 right-20 w-3 h-3 bg-blue-200 rounded-full opacity-40 animate-pulse delay-100"></div>
                <div className="absolute bottom-10 left-1/4 w-2 h-2 bg-purple-200 rounded-full opacity-50 animate-pulse delay-200"></div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setAssistanceOpen(false)}
                className="absolute top-6 right-6 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all z-10 backdrop-blur-sm group"
              >
                <X size={24} className="text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Title Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
                <div className="bg-white bg-opacity-20 p-3 sm:p-5 rounded-2xl backdrop-blur-md mb-3 sm:mb-4 transform hover:scale-110 transition-transform duration-300">
                  <HelpCircle size={40} className="sm:w-14 sm:h-14 text-white" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-2 sm:mb-3 tracking-tight drop-shadow-lg">
                  WE ARE COMING.
                </h2>
                <p className="text-blue-100 text-base sm:text-xl font-medium tracking-wide">
                  TECHNICAL ASSISTANCE & SUPPORT
                </p>
                <div className="mt-3 sm:mt-4 flex items-center gap-2 text-white text-xs sm:text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Available 24/7 during event</span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(90vh-14rem)] bg-gray-900 text-sm sm:text-base">
              {/* Judge Info */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3">👤 Your Judge Profile</h3>
                <div className="space-y-2 text-gray-300">
                  <p><span className="font-semibold text-yellow-400">Name:</span> {judge?.name || 'Not available'}</p>
                  <p><span className="font-semibold text-yellow-400">Status:</span> {judge?.active ? '✅ Active' : '❌ Inactive'}</p>
                  <p><span className="font-semibold text-yellow-400">Scored:</span> {scores.length} contestant(s)</p>
                </div>
              </div>

              {/* Quick Help */}
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">🆘 Quick Help</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-yellow-400 mb-2">How do I score a contestant?</h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                      <li>Click "Contestants" button at the bottom to open the drawer</li>
                      <li>Select Male or Female tab</li>
                      <li>Click on a contestant's photo to select them</li>
                      <li>Click on a Category button (1, 2, or 3)</li>
                      <li>Use the sliders to adjust scores</li>
                      <li>Click "Save Score" to submit</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-bold text-yellow-400 mb-2">What does "Scoring Locked" mean?</h4>
                    <p className="text-gray-300 text-sm">
                      When scoring is locked by the admin, you cannot enter or modify scores. 
                      Wait for the admin to unlock scoring before continuing.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-yellow-400 mb-2">How are scores calculated?</h4>
                    <p className="text-gray-300 text-sm">
                      Your scores are automatically weighted:
                      <br />• Category 1 = 60% of final score
                      <br />• Category 2 = 20% of final score
                      <br />• Category 3 = 20% of final score
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-yellow-400 mb-2">Can I change my scores?</h4>
                    <p className="text-gray-300 text-sm">
                      Yes! Simply select the contestant again and adjust the scores. 
                      Click "Save Score" to update. Your latest scores will be saved.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-yellow-400 mb-2">The page isn't updating?</h4>
                    <p className="text-gray-300 text-sm">
                      Try refreshing the page (F5). If the problem persists, contact technical support.
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Assistance - Prominent Section */}
              <div className={`rounded-lg p-6 border-2 ${
                assistanceRequested 
                  ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-yellow-500'
                  : 'bg-gradient-to-br from-red-900 to-red-800 border-red-500'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {assistanceRequested ? (
                    <Bell size={32} className="text-yellow-300 animate-pulse" />
                  ) : (
                    <AlertCircle size={32} className="text-red-300" />
                  )}
                  <h3 className="text-2xl font-bold text-white">
                    {assistanceRequested ? 'Assistance Requested' : 'Need Technical Assistance?'}
                  </h3>
                </div>
                
                {assistanceRequested ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-800 bg-opacity-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell size={20} className="text-yellow-300 animate-pulse" />
                        <p className="text-yellow-100 font-bold">Admin has been notified!</p>
                      </div>
                      <p className="text-yellow-200 text-sm">
                        Event staff will assist you shortly. Please remain at your station.
                      </p>
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!judge) return
                        
                        try {
                          // Update request to cancelled status instead of deleting
                          const { error } = await supabase
                            .from('assistance_requests')
                            .update({ 
                              status: 'cancelled',
                              resolved_at: new Date().toISOString()
                            })
                            .eq('judge_id', judge.id)
                            .eq('status', 'pending')

                          if (error) throw error

                          setAssistanceRequested(false)
                          toast.success('Assistance request cancelled')
                        } catch (error) {
                          console.error('Error cancelling request:', error)
                          toast.error('Failed to cancel request')
                        }
                      }}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Cancel Request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-red-100">
                      Having technical difficulties? Click the button below to notify the admin team. 
                      Event staff will come to assist you.
                    </p>
                    
                    <button
                      onClick={async () => {
                        if (!judge) {
                          toast.error('Judge information not available')
                          return
                        }
                        
                        try {
                          console.log('Creating assistance request for:', judge.name)
                          
                          // Create assistance request in database
                          const { data, error } = await supabase
                            .from('assistance_requests')
                            .insert({
                              judge_id: judge.id,
                              judge_name: judge.name,
                              status: 'pending',
                              requested_at: new Date().toISOString()
                            })
                            .select()

                          if (error) {
                            console.error('Database error:', error)
                            throw error
                          }

                          console.log('Assistance request created:', data)
                          setAssistanceRequested(true)
                          toast.success('Assistance request sent to admin!')
                        } catch (error) {
                          console.error('Error requesting assistance:', error)
                          toast.error('Failed to send request. Please raise your hand for event staff.')
                        }
                      }}
                      className="flex items-center justify-center gap-3 w-full bg-red-500 hover:bg-red-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                    >
                      <Bell size={24} />
                      <span className="text-xl">Request Assistance Now</span>
                    </button>

                    <div className="bg-red-800 bg-opacity-30 rounded-lg p-3">
                      <p className="text-red-100 text-sm">
                        <span className="font-bold">What happens next:</span>
                        <br />• Admin gets instant notification
                        <br />• Your location and name are sent
                        <br />• Event staff will come to help you
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-3">⌨️ Keyboard Shortcuts</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Open Guide:</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-yellow-400">📖 Icon</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Get Help:</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-blue-400">❓ Icon</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Refresh Page:</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded">F5</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Close Modal:</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Close Button */}
            <div className="p-6 bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => setAssistanceOpen(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg"
              >
                Close Assistant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
