import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Plus, Trash2, GripVertical, Edit, Save, X, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminCompetitionEditor() {
  const [categories, setCategories] = useState([])
  const [rounds, setRounds] = useState([])
  const [judges, setJudges] = useState([])
  const [activeRoundId, setActiveRoundId] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [roundsLoading, setRoundsLoading] = useState(true)
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false)
  const [roundForm, setRoundForm] = useState({
    id: '',
    name: '',
    judge_target: '',
    max_per_gender: '',
    advance_per_gender: '',
    highlight_per_gender: ''
  })
  
  // Form state for category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    percentage: '',
    round_id: '',
    criteria: [],
    judge_allocation: ''
  })
  
  // Temporary criteria being added
  const [newCriterion, setNewCriterion] = useState({ name: '', max_points: '' })

  useEffect(() => {
    const initialize = async () => {
      await fetchJudges()
      await fetchRounds()
      await fetchActiveRound()
    }

    initialize()
  }, [])

  useEffect(() => {
    const assignmentsChannel = supabase
      .channel('admin-round-judges-tracker', {
        config: { broadcast: { self: true } }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round_judges'
      }, () => {
        fetchRounds()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(assignmentsChannel)
    }
  }, [])

  useEffect(() => {
    const judgesChannel = supabase
      .channel('admin-judges-tracker', {
        config: { broadcast: { self: true } }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'judges'
      }, () => {
        fetchJudges()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(judgesChannel)
    }
  }, [])

  useEffect(() => {
    if (!roundsLoading) {
      fetchCategories()
    }
  }, [roundsLoading])

  useEffect(() => {
    if (!roundsLoading && rounds.length > 0 && !activeRoundId) {
      setActiveRoundId(String(rounds[0].id))
    }
  }, [rounds, roundsLoading, activeRoundId])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*, criteria(*)')
      .order('order_index')

    if (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Unable to load categories')
      return
    }

    const categoriesWithRounds = (data || []).map((category) => {
      const roundDetails = rounds.find((round) => String(round.id) === String(category.round_id)) || null
      return {
        ...category,
        round: roundDetails
      }
    })

    setCategories(categoriesWithRounds)
  }

  const sanitizeCount = (value) => {
    if (value === '' || value === null || value === undefined) return null
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric < 0) return null
    return Math.round(numeric)
  }

  const fetchJudges = async () => {
    try {
      const { data, error } = await supabase
        .from('judges')
        .select('id, active')

      if (error) throw error

      setJudges(data || [])
    } catch (error) {
      console.error('Failed to fetch judges:', error)
      setJudges([])
    }
  }

  const resetRoundForm = () => {
    setRoundForm({
      id: '',
      name: '',
      judge_target: '',
      max_per_gender: '',
      advance_per_gender: '',
      highlight_per_gender: ''
    })
  }

  const handleOpenRoundModal = (round = null) => {
    if (!round) {
      resetRoundForm()
      setIsRoundModalOpen(true)
      return
    }

    setRoundForm({
      id: round.id,
      name: round.name || '',
      judge_target:
        round.judge_target === null || round.judge_target === undefined
          ? ''
          : round.judge_target,
      max_per_gender:
        round.max_per_gender === null || round.max_per_gender === undefined
          ? ''
          : round.max_per_gender,
      advance_per_gender:
        round.advance_per_gender === null || round.advance_per_gender === undefined
          ? ''
          : round.advance_per_gender,
      highlight_per_gender:
        round.highlight_per_gender === null || round.highlight_per_gender === undefined
          ? ''
          : round.highlight_per_gender
    })
    setIsRoundModalOpen(true)
  }

  const handleRoundInputChange = (field, value) => {
    setRoundForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveRoundSettings = async () => {
    if (!roundForm.name.trim()) {
      toast.error('Please provide a round name')
      return
    }

    const payload = {
      name: roundForm.name.trim(),
      judge_target: sanitizeCount(roundForm.judge_target),
      max_per_gender: sanitizeCount(roundForm.max_per_gender),
      advance_per_gender: sanitizeCount(roundForm.advance_per_gender),
      highlight_per_gender: sanitizeCount(roundForm.highlight_per_gender)
    }

    try {
      if (roundForm.id) {
        const { error } = await supabase
          .from('rounds')
          .update(payload)
          .eq('id', roundForm.id)

        if (error) {
          throw error
        }

        toast.success('Round configuration updated')
      } else {
        const nextOrderIndex = rounds.reduce((max, current) => {
          const orderValue = Number(current.order_index) || 0
          return orderValue > max ? orderValue : max
        }, 0) + 1

        const { error } = await supabase
          .from('rounds')
          .insert({
            ...payload,
            order_index: nextOrderIndex
          })

        if (error) {
          throw error
        }

        toast.success('Round created successfully')
      }
    } catch (error) {
      console.error('Failed to save round:', error)
      const message = error?.message || error?.details || 'Unable to save round configuration'
      toast.error(message)
      return
    }

    setIsRoundModalOpen(false)
    resetRoundForm()
    fetchRounds()
  }

  const ensureDefaultRounds = async () => {
    const defaultRounds = [
      {
        name: 'Preliminary Showcase',
        order_index: 1,
        judge_target: 12,
        max_per_gender: null,
        advance_per_gender: 10,
        highlight_per_gender: null
      },
      {
        name: 'Semifinal Performance',
        order_index: 2,
        judge_target: 10,
        max_per_gender: 10,
        advance_per_gender: 6,
        highlight_per_gender: 6
      },
      {
        name: 'Final Evening Gown',
        order_index: 3,
        judge_target: 8,
        max_per_gender: 6,
        advance_per_gender: 3,
        highlight_per_gender: 3
      },
      {
        name: 'Crowning Q&A',
        order_index: 4,
        judge_target: 7,
        max_per_gender: 3,
        advance_per_gender: null,
        highlight_per_gender: 3
      }
    ]

    await supabase.from('rounds').upsert(defaultRounds, { onConflict: 'order_index' }).select()
  }

  const fetchRounds = async () => {
    try {
      setRoundsLoading(true)
      const { data, error, count } = await supabase
        .from('rounds')
        .select('*', { count: 'exact' })
        .order('order_index')

      if (error) throw error

      let roundsData = data || []

      let assignmentRows = []
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('round_judges')
        .select('round_id, judge_id')

      if (assignmentError) {
        console.error('Failed to fetch round judge assignments:', assignmentError)
      } else {
        assignmentRows = assignmentData || []
      }

      const assignmentsMap = assignmentRows.reduce((acc, record) => {
        const roundId = record?.round_id
        const judgeId = record?.judge_id
        if (!roundId || !judgeId) {
          return acc
        }
        const key = String(roundId)
        if (!acc[key]) {
          acc[key] = new Set()
        }
        acc[key].add(String(judgeId))
        return acc
      }, {})

      if (!roundsData.length) {
        await ensureDefaultRounds()
        const { data: refreshed } = await supabase
          .from('rounds')
          .select('*')
          .order('order_index')
        roundsData = refreshed || []
      }

      roundsData = roundsData.map((round) => ({
        ...round,
        judge_target:
          round.judge_target === null || round.judge_target === undefined
            ? null
            : Number(round.judge_target),
        assignedJudgeIds: Array.from(assignmentsMap[String(round.id)] || []),
        max_per_gender:
          round.max_per_gender === null || round.max_per_gender === undefined
            ? null
            : Number(round.max_per_gender),
        advance_per_gender:
          round.advance_per_gender === null || round.advance_per_gender === undefined
            ? null
            : Number(round.advance_per_gender),
        highlight_per_gender:
          round.highlight_per_gender === null || round.highlight_per_gender === undefined
            ? null
            : Number(round.highlight_per_gender)
      }))

      setRounds(roundsData)
    } catch (error) {
      console.error('Failed to fetch rounds:', error)
      toast.error('Unable to load rounds configuration')
    } finally {
      setRoundsLoading(false)
    }
  }

  const fetchActiveRound = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'active_round_id')
        .maybeSingle()

      if (error) {
        console.error('Failed to fetch active round:', error)
        return
      }

      if (data?.value) {
        setActiveRoundId(String(data.value).replace(/^"|"$/g, ''))
        return
      }

      let { data: firstRound, error: firstRoundError } = await supabase
        .from('rounds')
        .select('*')
        .order('order_index')
        .limit(1)
        .maybeSingle()

      if (firstRoundError) {
        console.error('Failed to determine default round:', firstRoundError)
        return
      }

      if (!firstRound) {
        await ensureDefaultRounds()
        const { data: seededRound } = await supabase
          .from('rounds')
          .select('*')
          .order('order_index')
          .limit(1)
          .maybeSingle()
        firstRound = seededRound
      }

      if (firstRound) {
        const firstRoundId = String(firstRound.id)
        setActiveRoundId(firstRoundId)

        const upsertPayload = [
          { key: 'active_round_id', value: String(firstRound.id) },
          { key: 'round_name', value: firstRound.name || (`Round ${firstRound.order_index || 1}`) }
        ]

        const { error: upsertError } = await supabase
          .from('settings')
          .upsert(upsertPayload, { onConflict: 'key' })

        if (upsertError) {
          console.error('Failed to persist default active round:', upsertError)
        }
      }
    } catch (error) {
      console.log('No active round set yet')
    }
  }

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        percentage: category.percentage || '',
        round_id: category.round_id ? String(category.round_id) : activeRoundId || '',
        criteria: category.criteria || [],
        judge_allocation: category.judge_allocation || ''
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        description: '',
        percentage: '',
        round_id: activeRoundId || (rounds[0]?.id ? String(rounds[0].id) : ''),
        criteria: [],
        judge_allocation: ''
      })
    }
    setIsAddModalOpen(true)
  }

  const handleAddCriterion = () => {
    if (!newCriterion.name.trim() || !newCriterion.max_points) {
      toast.error('Please fill in criterion name and max points')
      return
    }

    setCategoryForm({
      ...categoryForm,
      criteria: [...categoryForm.criteria, { ...newCriterion }]
    })
    setNewCriterion({ name: '', max_points: '' })
  }

  const handleRemoveCriterion = (index) => {
    setCategoryForm({
      ...categoryForm,
      criteria: categoryForm.criteria.filter((_, i) => i !== index)
    })
  }

  const getTotalPoints = () => {
    return categoryForm.criteria.reduce((sum, c) => sum + (parseFloat(c.max_points) || 0), 0)
  }

  const getTotalPercentage = (targetRoundId) => {
    const roundId = targetRoundId || categoryForm.round_id || activeRoundId
    const existingTotal = categories.reduce((sum, category) => {
  const categoryRoundId = category.round_id
      if (roundId && categoryRoundId !== roundId) return sum
      if (editingCategory && category.id === editingCategory.id) return sum
      return sum + (parseFloat(category.percentage) || 0)
    }, 0)

    const currentValue = parseFloat(categoryForm.percentage) || 0
    return Math.round((existingTotal + currentValue) * 1000) / 1000
  }

  const getRoundWeight = (roundId) => {
    if (!roundId) return categories.reduce((sum, category) => sum + (parseFloat(category.percentage) || 0), 0)
    return categories.reduce((sum, category) => {
  const categoryRoundId = category.round_id
      if (categoryRoundId !== roundId) return sum
      return sum + (parseFloat(category.percentage) || 0)
    }, 0)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter category name')
      return
    }

    if (!categoryForm.percentage || categoryForm.percentage <= 0) {
      toast.error('Please enter a valid percentage')
      return
    }

    if (!categoryForm.round_id) {
      toast.error('Please assign a round to this category')
      return
    }

  const totalPercentage = getTotalPercentage(categoryForm.round_id)
    if (totalPercentage > 100) {
      toast.error(`Total percentage cannot exceed 100%. Current total: ${totalPercentage}%`)
      return
    }

    if (categoryForm.criteria.length === 0) {
      toast.error('Please add at least one criterion')
      return
    }

    setLoading(true)

    try {
      let categoryId

      if (editingCategory) {
        // Update existing category
        const { error: categoryError } = await supabase
          .from('categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            percentage: parseFloat(categoryForm.percentage),
            round_id: categoryForm.round_id,
            judge_allocation: categoryForm.judge_allocation ? parseInt(categoryForm.judge_allocation) : null
          })
          .eq('id', editingCategory.id)

        if (categoryError) throw categoryError
        categoryId = editingCategory.id

        // Delete old criteria
        await supabase
          .from('criteria')
          .delete()
          .eq('category_id', categoryId)
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description,
            percentage: parseFloat(categoryForm.percentage),
            round_id: categoryForm.round_id,
            judge_allocation: categoryForm.judge_allocation ? parseInt(categoryForm.judge_allocation) : null,
            order_index: categories.length
          })
          .select()
          .single()

        if (categoryError) throw categoryError
        categoryId = newCategory.id
      }

      // Insert criteria
      const criteriaToInsert = categoryForm.criteria.map((criterion, index) => ({
        category_id: categoryId,
        name: criterion.name,
        max_points: parseFloat(criterion.max_points),
        order_index: index
      }))

      const { error: criteriaError } = await supabase
        .from('criteria')
        .insert(criteriaToInsert)

      if (criteriaError) throw criteriaError

      toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully!`)
      setIsAddModalOpen(false)
      setCategoryForm({
        name: '',
        description: '',
        percentage: '',
        round_id: activeRoundId || rounds[0]?.id || '',
        criteria: [],
        judge_allocation: ''
      })
      fetchCategories()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save category')
    }

    setLoading(false)
  }

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all criteria and scores for this category.`)) {
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to delete category')
      return
    }

    toast.success('Category deleted successfully')
    fetchCategories()
  }

  const handleToggleOpen = async (category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_open: !category.is_open })
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to update category')
      return
    }

    fetchCategories()
  }

  const handleToggleConvention = async (category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_convention: !category.is_convention })
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to update category')
      return
    }

    fetchCategories()
  }

  const handleMoveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= categories.length) return

    // Swap order_index values
    const category1 = categories[currentIndex]
    const category2 = categories[newIndex]

    await Promise.all([
      supabase.from('categories').update({ order_index: category2.order_index }).eq('id', category1.id),
      supabase.from('categories').update({ order_index: category1.order_index }).eq('id', category2.id)
    ])

    fetchCategories()
  }

  const handleSetActiveRound = async (roundId) => {
    try {
      setActiveRoundId(String(roundId))
      await supabase.from('settings').upsert({
        key: 'active_round_id',
        value: String(roundId)
      }, { onConflict: 'key' })

      const round = rounds.find(r => String(r.id) === String(roundId))
      if (round) {
        await supabase.from('settings').upsert({
          key: 'round_name',
          value: round.name || (`Round ${round.order_index || ''}`).trim()
        }, { onConflict: 'key' })
      }

      toast.success('Active round updated for judges and leaderboards')
    } catch (error) {
      console.error('Failed to update active round:', error)
      toast.error('Unable to set active round')
    }
  }

  const activeRound = rounds.find(round => String(round.id) === String(activeRoundId)) || rounds[0] || null
  const activeRoundWeight = activeRound ? Math.round(getRoundWeight(activeRound.id) * 1000) / 1000 : Math.round(getRoundWeight() * 1000) / 1000
  const activeRoundCategories = activeRound
    ? categories.filter(category => String(category.round_id) === String(activeRound.id)).length
    : categories.length
  const activeJudgeCount = judges.filter((judge) => judge.active).length
  const activeJudgeIds = useMemo(() => new Set(judges.filter((judge) => judge.active).map((judge) => String(judge.id))), [judges])
  const activeRoundAssignedIds = Array.isArray(activeRound?.assignedJudgeIds) ? activeRound.assignedJudgeIds : []
  const activeRoundActiveAssignments = activeRoundAssignedIds.filter((id) => activeJudgeIds.has(String(id))).length
  const groupedCategories = rounds.map((round) => ({
    round,
    categories: categories.filter(category => String(category.round_id) === String(round.id))
  }))
  const unassignedCategories = categories.filter(category => !category.round_id)

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
              <h1 className="text-3xl font-bold text-foreground">Competition Editor</h1>
              <p className="text-muted-foreground">Customize categories and scoring criteria</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleOpenRoundModal()} size="lg">
              <Plus className="mr-2" size={20} />
              Add Round
            </Button>
            <Button onClick={() => handleOpenModal()} size="lg">
              <Plus className="mr-2" size={20} />
              Add Category
            </Button>
          </div>
        </div>

        {/* Round Summary */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Round</p>
                <p className="text-3xl font-bold text-foreground">
                  {activeRound ? activeRound.name : 'No round selected'}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <span>Weight: <span className="font-semibold text-primary">{activeRoundWeight.toFixed(1)}%</span></span>
                  <span>•</span>
                  <span>Categories: <span className="font-semibold text-primary">{activeRoundCategories}</span></span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <label className="text-xs text-muted-foreground">Set Active Round</label>
                <select
                  value={activeRoundId || ''}
                  onChange={(e) => handleSetActiveRound(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.name || `Round ${round.order_index}`}
                    </option>
                  ))}
                </select>
                <p className={`text-xs ${activeRoundWeight === 100 ? 'text-green-500' : activeRoundWeight > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {activeRoundWeight === 100
                    ? 'Round weight complete'
                    : activeRoundWeight > 100
                    ? `${(activeRoundWeight - 100).toFixed(1)}% over target`
                    : `${(100 - activeRoundWeight).toFixed(1)}% remaining`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active judges available: {activeJudgeCount}
                </p>
                {activeRoundAssignedIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Assigned judges (active): {activeRoundActiveAssignments}/{activeRoundAssignedIds.length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Round Overview */}
        {rounds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {rounds.map((round) => {
              const weight = Math.round(getRoundWeight(round.id) * 10) / 10
              const count = categories.filter(category => String(category.round_id) === String(round.id)).length
              const isActive = round.id === activeRound?.id
              const assignedIds = Array.isArray(round.assignedJudgeIds) ? round.assignedJudgeIds : []
              const activeAssignedCount = assignedIds.filter((id) => activeJudgeIds.has(String(id))).length
              return (
                <Card key={round.id} className={`border ${isActive ? 'border-primary' : 'border-border'} bg-card` }>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">{round.name || `Round ${round.order_index}`}</h3>
                      {isActive && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Active</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p><span className="font-semibold text-foreground">Weight:</span> {weight}%</p>
                      <p><span className="font-semibold text-foreground">Categories:</span> {count}</p>
                      <p><span className="font-semibold text-foreground">Judge Allocation:</span> {round.judge_target ? `${round.judge_target} judges` : 'All active judges'}</p>
                      <p className="text-xs text-muted-foreground">Active judges right now: {activeJudgeCount}</p>
                      {assignedIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Assigned judges (active): {activeAssignedCount}/{assignedIds.length}
                        </p>
                      )}
                      <p><span className="font-semibold text-foreground">Qualifiers:</span> Top {round.advance_per_gender || round.max_per_gender || 'N/A'} per gender</p>
                      {round.highlight_per_gender && (
                        <p><span className="font-semibold text-foreground">Highlight:</span> Top {round.highlight_per_gender} per gender</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenRoundModal(round)}>
                        <Edit size={16} className="mr-2" />
                        Edit Round
                      </Button>
                      {!isActive && (
                        <Button size="sm" variant="outline" onClick={() => handleSetActiveRound(round.id)}>
                          Set as Active Round
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-6">
          {roundsLoading ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading rounds...
              </CardContent>
            </Card>
          ) : categories.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Plus size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No categories yet. Add your first category to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {groupedCategories.map(({ round, categories: roundCategories }) => (
                <div key={round.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">{round.name || `Round ${round.order_index}`}</h2>
                    <div className="text-sm text-muted-foreground">
                      Weight: {Math.round(getRoundWeight(round.id) * 10) / 10}% • Categories: {roundCategories.length}
                    </div>
                  </div>

                  {roundCategories.length === 0 ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-6 text-center text-muted-foreground">
                        No categories assigned to this round yet.
                      </CardContent>
                    </Card>
                  ) : (
                    roundCategories.map((category) => {
                      const index = categories.findIndex(c => c.id === category.id)
                      return (
                        <Card key={category.id} className="bg-card border-border">
                          <CardContent className="py-4">
                            <div className="space-y-4">
                              {/* Category Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1">
                                  {/* Reorder Buttons */}
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleMoveCategory(category.id, 'up')}
                                      disabled={index === 0}
                                      className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Move up"
                                    >
                                      <ArrowUp size={16} className="text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveCategory(category.id, 'down')}
                                      disabled={index === categories.length - 1}
                                      className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Move down"
                                    >
                                      <ArrowDown size={16} className="text-muted-foreground" />
                                    </button>
                                  </div>
                                  <GripVertical size={24} className="text-muted-foreground mt-1" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="text-xl font-bold text-foreground">{category.name}</h3>
                                      <span className="text-lg font-bold text-primary">{category.percentage}%</span>
                                    </div>
                                    {category.description && (
                                      <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                                    )}
                                    
                                    {/* Criteria List */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-muted-foreground uppercase">Criteria for Judging</p>
                                      {category.criteria && category.criteria.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {category.criteria.map((criterion) => (
                                            <div key={criterion.id} className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded">
                                              <span className="text-sm text-foreground">{criterion.name}</span>
                                              <span className="text-sm font-bold text-primary">{criterion.max_points} pts</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">No criteria defined</p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2">
                                        <p className="text-xs text-muted-foreground">
                                          Total: <span className="font-bold text-foreground">
                                            {category.criteria?.reduce((sum, c) => sum + (c.max_points || 0), 0) || 0}/100 pts
                                          </span>
                                        </p>
                                        {category.judge_allocation && (
                                          <p className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded">
                                            📊 {category.judge_allocation} judges assigned
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenModal(category)}
                                  >
                                    <Edit size={16} className="mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteCategory(category)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>

                              {/* Category Settings */}
                              <div className="flex items-center gap-6 pt-2 border-t border-border">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={category.is_open || false}
                                    onChange={() => handleToggleOpen(category)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-muted-foreground">Open Category</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={category.is_convention || false}
                                    onChange={() => handleToggleConvention(category)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-muted-foreground">Convention Category</span>
                                </label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              ))}

              {unassignedCategories.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">Unassigned Categories</h2>
                    <p className="text-sm text-muted-foreground">Assign these categories to a round to include them in scoring.</p>
                  </div>
                  {unassignedCategories.map((category) => {
                    const index = categories.findIndex(c => c.id === category.id)
                    return (
                      <Card key={category.id} className="bg-card border-dashed border-red-400/40">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleMoveCategory(category.id, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <ArrowUp size={16} className="text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleMoveCategory(category.id, 'down')}
                                disabled={index === categories.length - 1}
                                className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <ArrowDown size={16} className="text-muted-foreground" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-foreground">{category.name}</h3>
                                <span className="text-lg font-bold text-primary">{category.percentage}%</span>
                                <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">Assign to round</span>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleOpenModal(category)}>
                                <Edit size={16} className="mr-2" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Category Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                placeholder="e.g., Opening Statement, Swimwear, Q&A"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Category Description (Optional)</Label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Brief description of this category..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Round</Label>
              <select
                value={categoryForm.round_id || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, round_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={roundsLoading || rounds.length === 0}
              >
                {roundsLoading && <option>Loading rounds...</option>}
                {!roundsLoading && rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.name || `Round ${round.order_index}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Assign this category to its competition round.
              </p>
            </div>

            <div>
              <Label>Category Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 25"
                  value={categoryForm.percentage}
                  onChange={(e) => setCategoryForm({ ...categoryForm, percentage: e.target.value })}
                />
                <span className="text-lg font-bold text-primary">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Round allocation total: {getTotalPercentage(categoryForm.round_id)}% / 100%
              </p>
            </div>

            <div>
              <Label>Judge Allocation for This Category (Optional)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Leave blank to use round-level allocation"
                value={categoryForm.judge_allocation}
                onChange={(e) => setCategoryForm({ ...categoryForm, judge_allocation: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Override the round-level judge count for this specific category. Useful when some judges only score certain categories.
              </p>
            </div>
          </div>

          {/* Criteria Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Criteria for Judging</Label>
              <p className="text-sm text-muted-foreground">
                Total: <span className={`font-bold ${getTotalPoints() === 100 ? 'text-green-500' : 'text-primary'}`}>
                  {getTotalPoints()}/100 pts
                </span>
              </p>
            </div>

            {/* Criteria List */}
            {categoryForm.criteria.length > 0 && (
              <div className="space-y-2">
                {categoryForm.criteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary/50 p-3 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{criterion.name}</p>
                    </div>
                    <div className="text-sm font-bold text-primary">{criterion.max_points} pts</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCriterion(index)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Criterion */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Criteria Name</Label>
                <Input
                  placeholder="e.g., Stage Presence"
                  value={newCriterion.name}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
                />
              </div>
              <div className="w-32">
                <Label className="text-xs">Max Points</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={newCriterion.max_points}
                    onChange={(e) => setNewCriterion({ ...newCriterion, max_points: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
              <Button onClick={handleAddCriterion} variant="outline">
                <Plus size={16} className="mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSaveCategory} className="flex-1" disabled={loading}>
              <Save size={16} className="mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRoundModalOpen}
        onClose={() => {
          setIsRoundModalOpen(false)
          resetRoundForm()
        }}
  title={roundForm.id ? 'Edit Round' : 'Add Round'}
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Round Name</Label>
              <Input
                placeholder="e.g., Preliminary Showcase"
                value={roundForm.name}
                onChange={(e) => handleRoundInputChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label>Judge Allocation (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 10"
                  value={roundForm.judge_target}
                  onChange={(e) => handleRoundInputChange('judge_target', e.target.value)}
                />
                <span className="text-sm text-muted-foreground">judges</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use all active judges for this round (currently {activeJudgeCount}).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 12"
                  value={roundForm.max_per_gender}
                  onChange={(e) => handleRoundInputChange('max_per_gender', e.target.value)}
                />
              </div>
              <div>
                <Label>Advance per Gender</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 6"
                  value={roundForm.advance_per_gender}
                  onChange={(e) => handleRoundInputChange('advance_per_gender', e.target.value)}
                />
              </div>
              <div>
                <Label>Highlight per Gender</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 3"
                  value={roundForm.highlight_per_gender}
                  onChange={(e) => handleRoundInputChange('highlight_per_gender', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveRoundSettings} className="flex-1">
              <Save size={16} className="mr-2" />
              Save Round
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsRoundModalOpen(false)
                resetRoundForm()
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
