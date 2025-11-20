import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { Menu, BookOpen, HelpCircle, LogOut, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Bell, AlertCircle, User, CheckCircle, RotateCcw, Headphones, User2, Smartphone, Settings, BarChart3, AlertTriangle, MessageSquare, Phone, Mail, Eye, Users, EyeOff } from 'lucide-react'

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
  const contestantsPerPage = 12
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
  const [judgesScoresOpen, setJudgesScoresOpen] = useState(false)
  const [allJudges, setAllJudges] = useState([])
  const [judgesScoresData, setJudgesScoresData] = useState([])
  const [screenHidden, setScreenHidden] = useState(false)

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
      // Use setTimeout to defer toast outside of render
      setTimeout(() => toast.error('Invalid judge link'), 0)
      return
    }

    if (!data.active) {
      // Use setTimeout to defer toast outside of render
      setTimeout(() => toast.error('This judge account is deactivated'), 0)
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
      // Use setTimeout to defer toast outside of render
      setTimeout(() => toast.error('Unable to load categories'), 0)
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
      .select('*')

    if (error) {
      console.error('Failed to load judges:', error)
      return
    }

    setAllJudges(data || [])
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
    // Convert to number and limit to max points for this criterion
    const criterion = categories
      .flatMap(cat => cat.criteria || [])
      .find(c => c.id === criterionId)
    
    let numValue = parseFloat(value) || 0
    
    // Clamp the value to [0, max_points]
    if (criterion) {
      numValue = Math.max(0, Math.min(numValue, criterion.max_points))
    } else {
      numValue = Math.max(0, numValue)
    }

    console.log(`Score changed for criterion ${criterionId}:`, numValue)
    setCurrentScoresData(prev => {
      const updated = { ...prev, [criterionId]: numValue }
      console.log('Updated scores data:', updated)
      return updated
    })
  }

  const handleClearScore = (criterionId) => {
    setCurrentScoresData(prev => {
      const updated = { ...prev, [criterionId]: 0 }
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

      // Prepare scores to upsert (update or insert)
      const scoresToUpsert = Object.entries(currentScoresData)
        .map(([criterionId, score]) => ({
          contestant_id: selectedContestant.id,
          judge_id: judge.id,
          criterion_id: String(criterionId),
          score: parseFloat(score) || 0
        }))

      console.log('Scores to upsert:', scoresToUpsert)
      console.log('Total scores to submit:', scoresToUpsert.length)

      if (scoresToUpsert.length > 0) {
        // First, delete old scores for this contestant-judge pair
        console.log('Deleting old scores for this contestant-judge pair...')
        const deleteResult = await supabase
          .from('contestant_scores')
          .delete()
          .eq('contestant_id', selectedContestant.id)
          .eq('judge_id', judge.id)

        if (deleteResult.error) {
          console.error('Error deleting old scores:', deleteResult.error)
          throw new Error(`Delete failed: ${deleteResult.error.message}`)
        }
        
        console.log('Old scores deleted successfully')

        // Now insert new scores in smaller batches (50 at a time)
        const batchSize = 50
        let totalInserted = 0
        
        for (let i = 0; i < scoresToUpsert.length; i += batchSize) {
          const batch = scoresToUpsert.slice(i, i + batchSize)
          console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scoresToUpsert.length / batchSize)} (${batch.length} scores)...`)
          console.log('Batch payload size:', JSON.stringify(batch).length, 'bytes')
          
          const insertResult = await supabase
            .from('contestant_scores')
            .insert(batch)
          
          if (insertResult.error) {
            console.error(`Error inserting batch at offset ${i}:`, insertResult.error)
            console.error('Error code:', insertResult.error.code)
            console.error('Error hint:', insertResult.error.hint)
            console.error('Error details:', insertResult.error.details)
            console.error('Failed batch data:', batch)
            throw new Error(`Insert batch failed: ${insertResult.error.message}`)
          }
          
          totalInserted += batch.length
          console.log(`Batch inserted: ${totalInserted}/${scoresToUpsert.length} scores saved`)
          
          // Small delay between batches to avoid rate limiting
          if (i + batchSize < scoresToUpsert.length) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }

        console.log(`✅ All ${totalInserted} scores saved successfully!`)
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
          onClick={() => {
            if (selectedContestant) {
              fetchJudgesScoresForContestant(selectedContestant.id)
              setJudgesScoresOpen(true)
            }
          }}
          disabled={!selectedContestant}
          className={`p-3 rounded-lg transition-colors ${
            selectedContestant 
              ? 'hover:bg-purple-600' 
              : 'opacity-50 cursor-not-allowed'
          }`}
          title="View Judges Scores"
        >
          <Users size={24} />
        </button>
        <button 
          onClick={() => setAssistanceOpen(true)}
          className="p-3 hover:bg-blue-600 rounded-lg transition-colors"
          title="Get Assistance"
        >
          <HelpCircle size={24} />
        </button>
        <button 
          onClick={() => setScreenHidden(!screenHidden)}
          className={`p-3 rounded-lg transition-colors ${
            screenHidden 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'hover:bg-gray-700'
          }`}
          title={screenHidden ? 'Show Screen' : 'Hide Screen from Audience'}
        >
          {screenHidden ? <EyeOff size={24} /> : <Eye size={24} />}
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
        {/* When screen is hidden, show a blank area with a message */}
        {screenHidden ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <EyeOff size={64} className="text-gray-600 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Screen is Hidden</h2>
            <p className="text-gray-400 mb-8">Your scoring interface is hidden from the audience</p>
            <button
              onClick={() => setScreenHidden(false)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Show Screen
            </button>
          </div>
        ) : (
          <>
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
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {getPaginatedContestants().map((contestant) => (
                <button
                  key={contestant.id}
                  onClick={() => {
                    setSelectedContestant(contestant)
                    setDrawerOpen(false)
                  }}
                  className={`flex flex-col items-center ${
                    selectedContestant?.id === contestant.id ? 'ring-2 ring-yellow-400 rounded-lg' : ''
                  }`}
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-yellow-400 transition-colors relative">
                    {contestant.photo_url ? (
                      <img
                        src={contestant.photo_url}
                        alt={contestant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl sm:text-4xl font-bold">
                        {contestant.number}
                      </div>
                    )}
                    {isContestantScored(contestant.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">✓</span>
                      </div>
                    )}
                    <div className={`absolute bottom-2 left-2 text-sm font-bold px-2 py-1 rounded ${
                      contestant.sex === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}>
                      {contestant.sex?.charAt(0)}{contestant.number}
                    </div>
                  </div>
                  <p className="text-sm mt-2 sm:mt-3 text-center font-semibold line-clamp-2 w-full px-1">{contestant.name}</p>
                  {getContestantScore(contestant.id) && (
                    <p className="text-sm text-yellow-400 text-center font-bold mt-1">{getContestantScore(contestant.id).toFixed(1)}</p>
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
          </>
        )}
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
                          <div className="flex gap-2 items-center">
                            <input
                              type="range"
                              min="0"
                              max={criterion.max_points}
                              step="0.5"
                              value={currentScoresData[criterion.id] || 0}
                              onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                            />
                            <input
                              type="number"
                              min="0"
                              max={criterion.max_points}
                              step="0.5"
                              value={currentScoresData[criterion.id] || 0}
                              onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                              className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center font-bold hover:border-yellow-400 focus:outline-none focus:border-yellow-400"
                              placeholder="0"
                            />
                            <button
                              onClick={() => handleClearScore(criterion.id)}
                              className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors"
                              title="Clear this score"
                            >
                              Clear
                            </button>
                          </div>
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

      {/* Get Assistance Modal - Improved Design */}
      {assistanceOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setAssistanceOpen(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl sm:rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Gradient Background */}
            <div className="relative h-32 sm:h-40 bg-gradient-to-r from-blue-600 to-blue-700 overflow-visible">
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              
              {/* Close Button */}
              <button
                onClick={() => setAssistanceOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black bg-opacity-40 hover:bg-opacity-60 rounded-lg transition-all z-50 backdrop-blur-sm cursor-pointer"
                type="button"
              >
                <X size={20} className="text-white" />
              </button>

              {/* Title Content */}
              <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="bg-white bg-opacity-20 p-3 sm:p-4 rounded-lg backdrop-blur-md">
                    <HelpCircle size={32} className="sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Help & Support</h2>
                    <p className="text-blue-100 text-sm sm:text-base mt-1">Judging Guide & Technical Support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] bg-gray-900">
              <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                
                {/* Judge Info Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-5 sm:p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <User2 size={24} className="text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Your Profile</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Judge Name:</span>
                      <span className="text-white font-semibold">{judge?.name || 'Not available'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <div className="flex items-center gap-2">
                        {judge?.active ? (
                          <>
                            <CheckCircle size={16} className="text-green-400" />
                            <span className="text-green-400 font-semibold">Active</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={16} className="text-red-400" />
                            <span className="text-red-400 font-semibold">Inactive</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Contestants Scored:</span>
                      <span className="text-yellow-400 font-bold">{scores.length}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Help Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={24} className="text-yellow-400" />
                    <h3 className="text-lg font-bold text-white">Quick Help Guide</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* How to Score */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="flex gap-3 mb-3">
                        <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0">
                          <BarChart3 size={18} className="text-white" />
                        </div>
                        <h4 className="font-bold text-white flex-1 mt-1">How to Score a Contestant</h4>
                      </div>
                      <ol className="space-y-2 text-gray-300 text-sm ml-8">
                        <li><span className="text-blue-400 font-semibold">1.</span> Click the "Contestants" button at the bottom</li>
                        <li><span className="text-blue-400 font-semibold">2.</span> Choose Male or Female category</li>
                        <li><span className="text-blue-400 font-semibold">3.</span> Click on a contestant's photo to select them</li>
                        <li><span className="text-blue-400 font-semibold">4.</span> Click on a scoring category (Appearance, Interview, Talent)</li>
                        <li><span className="text-blue-400 font-semibold">5.</span> Adjust scores using sliders or enter values directly</li>
                        <li><span className="text-blue-400 font-semibold">6.</span> Click "Save Score" to submit</li>
                      </ol>
                    </div>

                    {/* Scoring System */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-600 transition-colors">
                      <div className="flex gap-3 mb-3">
                        <div className="bg-purple-600 rounded-lg p-2 flex-shrink-0">
                          <Settings size={18} className="text-white" />
                        </div>
                        <h4 className="font-bold text-white flex-1 mt-1">Understanding the Scoring System</h4>
                      </div>
                      <div className="space-y-3 text-sm text-gray-300 ml-8">
                        <p><span className="text-purple-400 font-semibold">Weight Distribution:</span></p>
                        <div className="bg-gray-900 rounded p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Appearance & Style</span>
                            <span className="bg-purple-700 px-3 py-1 rounded text-purple-200 font-semibold text-xs">60%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Interview</span>
                            <span className="bg-blue-700 px-3 py-1 rounded text-blue-200 font-semibold text-xs">20%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Talent</span>
                            <span className="bg-green-700 px-3 py-1 rounded text-green-200 font-semibold text-xs">20%</span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs mt-2">These percentages are applied automatically to your scores.</p>
                      </div>
                    </div>

                    {/* Locked Scoring */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-600 transition-colors">
                      <div className="flex gap-3 mb-3">
                        <div className="bg-red-600 rounded-lg p-2 flex-shrink-0">
                          <AlertTriangle size={18} className="text-white" />
                        </div>
                        <h4 className="font-bold text-white flex-1 mt-1">Scoring Locked - What Does It Mean?</h4>
                      </div>
                      <p className="text-gray-300 text-sm ml-8">When the admin locks scoring, you cannot enter or modify scores. This usually means the judging phase is over or paused. Wait for the admin to unlock scoring before continuing.</p>
                    </div>

                    {/* Modifying Scores */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-yellow-600 transition-colors">
                      <div className="flex gap-3 mb-3">
                        <div className="bg-yellow-600 rounded-lg p-2 flex-shrink-0">
                          <RotateCcw size={18} className="text-white" />
                        </div>
                        <h4 className="font-bold text-white flex-1 mt-1">Can I Change My Scores?</h4>
                      </div>
                      <p className="text-gray-300 text-sm ml-8">Yes! Select the same contestant again and adjust the scores. Your latest submission will replace the previous one. You can also use the "Clear" button to reset a score back to zero.</p>
                    </div>

                    {/* Troubleshooting */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-orange-600 transition-colors">
                      <div className="flex gap-3 mb-3">
                        <div className="bg-orange-600 rounded-lg p-2 flex-shrink-0">
                          <AlertCircle size={18} className="text-white" />
                        </div>
                        <h4 className="font-bold text-white flex-1 mt-1">Troubleshooting</h4>
                      </div>
                      <ul className="space-y-2 text-gray-300 text-sm ml-8 list-disc list-inside">
                        <li><span className="text-orange-400 font-semibold">Page not updating?</span> Try refreshing (F5)</li>
                        <li><span className="text-orange-400 font-semibold">Can't see contestants?</span> Check if you're in the right gender category</li>
                        <li><span className="text-orange-400 font-semibold">Score won't save?</span> Make sure all criteria have values</li>
                        <li><span className="text-orange-400 font-semibold">Still having issues?</span> Request technical assistance below</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Request Assistance Section */}
                <div className={`rounded-lg p-6 border-2 ${
                  assistanceRequested 
                    ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-500'
                    : 'bg-gradient-to-br from-blue-900 to-blue-800 border-blue-500'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {assistanceRequested ? (
                      <CheckCircle size={28} className="text-green-300 animate-pulse" />
                    ) : (
                      <Headphones size={28} className="text-blue-300" />
                    )}
                    <h3 className="text-xl font-bold text-white">
                      {assistanceRequested ? 'Support Request Sent' : 'Need Technical Support?'}
                    </h3>
                  </div>
                  
                  {assistanceRequested ? (
                    <div className="space-y-4">
                      <div className="bg-green-800 bg-opacity-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={18} className="text-green-300 animate-pulse" />
                          <p className="text-green-100 font-bold">Admin notified successfully!</p>
                        </div>
                        <p className="text-green-200 text-sm">
                          Event staff has been alerted and will assist you shortly. Please remain at your station.
                        </p>
                      </div>
                      
                      <button
                        onClick={async () => {
                          if (!judge) return
                          
                          try {
                            const { error } = await supabase
                              .from('assistance_requests')
                              .delete()
                              .eq('judge_id', judge.id)
                              .eq('status', 'pending')

                            if (!error) {
                              setAssistanceRequested(false)
                            }
                          } catch (error) {
                            console.error('Error canceling assistance:', error)
                          }
                        }}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-blue-100 text-sm">
                        Having technical issues? Request assistance and an event staff member will come to help you immediately.
                      </p>
                      
                      <button
                        onClick={async () => {
                          if (!judge) {
                            console.error('Judge not loaded')
                            return
                          }
                          
                          try {
                            const { error } = await supabase
                              .from('assistance_requests')
                              .insert({
                                judge_id: judge.id,
                                judge_name: judge.name,
                                status: 'pending',
                                created_at: new Date().toISOString()
                              })

                            if (error) {
                              console.error('Error requesting assistance:', error)
                            } else {
                              setAssistanceRequested(true)
                            }
                          } catch (error) {
                            console.error('Error:', error)
                          }
                        }}
                        className="flex items-center justify-center gap-3 w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 sm:py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02]"
                      >
                        <Headphones size={20} />
                        <span>Request Technical Support</span>
                      </button>

                      <div className="bg-blue-800 bg-opacity-30 rounded-lg p-3 text-sm">
                        <p className="text-blue-100">
                          <span className="font-bold">What happens:</span>
                          <br />• Admin gets instant notification
                          <br />• Staff will come to assist you
                          <br />• Estimated response time: &lt; 2 minutes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => setAssistanceOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Close Help
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Judges Scores Overlay */}
      {judgesScoresOpen && selectedContestant && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setJudgesScoresOpen(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl sm:rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-32 sm:h-40 bg-gradient-to-r from-purple-600 to-purple-700 overflow-visible">
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              
              <button
                onClick={() => setJudgesScoresOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black bg-opacity-40 hover:bg-opacity-60 rounded-lg transition-all z-50 backdrop-blur-sm cursor-pointer"
                type="button"
              >
                <X size={20} className="text-white" />
              </button>

              <div className="relative z-10 h-full flex items-center px-6 sm:px-8">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="bg-white bg-opacity-20 p-3 sm:p-4 rounded-lg backdrop-blur-md">
                    <Users size={32} className="sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Judges' Scores</h2>
                    <p className="text-purple-100 text-sm sm:text-base mt-1">{selectedContestant?.name} (#{selectedContestant?.number})</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] bg-gray-900">
              <div className="p-6 sm:p-8 space-y-4">
                {judgesScoresData.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Eye size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-lg">No scores yet from other judges</p>
                    <p className="text-sm mt-2">Scores will appear here as other judges submit their evaluations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group scores by judge */}
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
                        const judge = allJudges.find(j => String(j.id) === judgeId)
                        const judgeTotal = judgeScores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
                        
                        return (
                          <div key={judgeId} className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-purple-600 transition-colors">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                  {judge?.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <h4 className="font-bold text-white">{judge?.name || `Judge ${judgeId}`}</h4>
                                  <p className="text-xs text-gray-400">Total: <span className="text-purple-400 font-bold">{judgeTotal.toFixed(2)}</span></p>
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
                                  <div key={category.id} className="bg-gray-900 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-gray-200">{category.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-purple-400 font-bold">{categoryTotal.toFixed(1)}</span>
                                        <span className="text-gray-500 text-sm">/ {categoryMax}</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                                        style={{ width: `${categoryPercentage}%` }}
                                      />
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
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 bg-gray-950 border-t border-gray-700">
              <button
                onClick={() => setJudgesScoresOpen(false)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
