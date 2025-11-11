import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateToken } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import { UserPlus, Copy, Trash2, Power, Link as LinkIcon, ClipboardList, CheckSquare } from 'lucide-react'

function JudgeModal({ isOpen, onClose, onSuccess }) {
  const [judgeName, setJudgeName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!judgeName.trim()) {
      toast.error('Please enter judge name')
      return
    }

    setLoading(true)
    const token = generateToken()

    const { error } = await supabase
      .from('judges')
      .insert({
        name: judgeName.trim(),
        url_token: token,
        active: true
      })

    setLoading(false)

    if (error) {
      toast.error('Failed to add judge')
      return
    }

    toast.success(`Judge ${judgeName} added successfully!`)
    setJudgeName('')
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Judge"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="judgeName">
            Judge Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="judgeName"
            placeholder="Enter judge name"
            value={judgeName}
            onChange={(e) => setJudgeName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Adding...' : 'Add Judge'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function JudgeRoundsModal({ isOpen, judge, rounds, selectedRoundIds, onSave, onClose }) {
  const [selection, setSelection] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelection(selectedRoundIds || [])
    }
  }, [isOpen, selectedRoundIds])

  const toggleRound = (roundId) => {
    setSelection((prev) => {
      const exists = prev.includes(roundId)
      if (exists) {
        return prev.filter((id) => id !== roundId)
      }
      return [...prev, roundId]
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selection)
      onClose()
    } catch (error) {
      console.error('Failed to save judge assignments:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={judge ? `Assign Rounds to ${judge.name}` : 'Assign Rounds'}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose which rounds this judge is responsible for. Judges only contribute scores to the rounds selected here.
        </p>

        <div className="space-y-2">
          {rounds.length === 0 ? (
            <p className="text-sm text-gray-500">No rounds available. Create rounds in the Competition Editor first.</p>
          ) : (
            rounds.map((round) => {
              const roundId = String(round.id)
              const checked = selection.includes(roundId)
              return (
                <label
                  key={roundId}
                  className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-400 transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked}
                      onChange={() => toggleRound(roundId)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{round.name || `Round ${round.order_index}`}</p>
                      <p className="text-xs text-gray-500">Order #{round.order_index || '-'}</p>
                    </div>
                  </div>
                  {checked && <CheckSquare size={18} className="text-blue-500" />}
                </label>
              )
            })
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Assignments'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function JudgesList() {
  const [judges, setJudges] = useState([])
  const [rounds, setRounds] = useState([])
  const [roundAssignments, setRoundAssignments] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false)
  const [editingJudge, setEditingJudge] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('judges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judges' }, () => {
        fetchData()
      })
      .subscribe()

    const assignmentsSubscription = supabase
      .channel('round-judges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_judges' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      assignmentsSubscription.unsubscribe()
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [judgesRes, roundsRes, assignmentsRes] = await Promise.all([
      supabase.from('judges').select('*').order('created_at', { ascending: false }),
      supabase.from('rounds').select('*').order('order_index'),
      supabase.from('round_judges').select('round_id, judge_id')
    ])

    const judgesData = judgesRes.data || []
    const roundsData = roundsRes.data || []
    const assignmentsData = assignmentsRes.data || []

    const assignmentsMap = assignmentsData.reduce((acc, record) => {
      const judgeId = record.judge_id ? String(record.judge_id) : null
      const roundId = record.round_id ? String(record.round_id) : null
      if (!judgeId || !roundId) return acc
      if (!acc[judgeId]) {
        acc[judgeId] = new Set()
      }
      acc[judgeId].add(roundId)
      return acc
    }, {})

    const normalizedAssignments = Object.entries(assignmentsMap).reduce((result, [judgeId, roundSet]) => {
      result[judgeId] = Array.from(roundSet)
      return result
    }, {})

    setJudges(judgesData)
    setRounds(roundsData)
    setRoundAssignments(normalizedAssignments)
    setLoading(false)
  }

  const copyJudgeLink = (token) => {
    const url = `${window.location.origin}/judge/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Judge link copied to clipboard!')
  }

  const handleToggleActive = async (judge) => {
    const { error } = await supabase
      .from('judges')
      .update({ active: !judge.active })
      .eq('id', judge.id)

    if (error) {
      toast.error('Failed to update judge')
      return
    }

    toast.success(`Judge ${judge.active ? 'deactivated' : 'activated'}`)
  }

  const handleDelete = async (judge) => {
    if (!confirm(`Delete ${judge.name}? This will also delete all their scores.`)) {
      return
    }

    const { error } = await supabase
      .from('judges')
      .delete()
      .eq('id', judge.id)

    if (error) {
      toast.error('Failed to delete judge')
      return
    }

    toast.success('Judge deleted successfully')
  }

  const openAssignmentsModal = (judge) => {
    setEditingJudge(judge)
    setIsAssignmentsModalOpen(true)
  }

  const handleSaveAssignments = async (selectedRoundIds) => {
    if (!editingJudge) return

    const judgeId = String(editingJudge.id)
    const currentAssignments = new Set(roundAssignments[judgeId] || [])
    const nextAssignments = new Set(selectedRoundIds.map((id) => String(id)))

    const toInsert = [...nextAssignments].filter((roundId) => !currentAssignments.has(roundId))
    const toDelete = [...currentAssignments].filter((roundId) => !nextAssignments.has(roundId))

    try {
      if (toInsert.length) {
        const insertPayload = toInsert.map((roundId) => ({
          judge_id: editingJudge.id,
          round_id: rounds.find((round) => String(round.id) === roundId)?.id || roundId
        }))

        const { error: insertError } = await supabase
          .from('round_judges')
          .upsert(insertPayload, { onConflict: 'round_id,judge_id' })

        if (insertError) throw insertError
      }

      if (toDelete.length) {
        const { error: deleteError } = await supabase
          .from('round_judges')
          .delete()
          .eq('judge_id', editingJudge.id)
          .in('round_id', toDelete.map((roundId) => rounds.find((round) => String(round.id) === roundId)?.id || roundId))

        if (deleteError) throw deleteError
      }

      toast.success('Judge assignments updated')
      await fetchData()
    } catch (error) {
      console.error('Failed to update judge assignments:', error)
      toast.error('Unable to update judge assignments')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Total Judges: <span className="font-bold text-gray-900">{judges.length}</span>
            {' • '}
            Active: <span className="font-bold text-green-600">
              {judges.filter(j => j.active).length}
            </span>
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="lg">
          <UserPlus className="mr-2" size={20} />
          Add Judge
        </Button>
      </div>

      {/* Judges List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading judges...</p>
          </CardContent>
        </Card>
      ) : judges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No judges yet</p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              Add your first judge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {judges.map((judge) => (
            <Card key={judge.id} className={!judge.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                    judge.active 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                      : 'bg-gray-400'
                  }`}>
                    {judge.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {judge.name}
                      </h3>
                      {judge.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <LinkIcon size={14} />
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        /judge/{judge.url_token.substring(0, 8)}...
                      </code>
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                        <ClipboardList size={14} /> Assigned Rounds
                      </p>
                      {(() => {
                        const assignedIds = roundAssignments[String(judge.id)] || []
                        if (!assignedIds.length) {
                          return <p className="text-xs text-gray-500">No rounds assigned</p>
                        }
                        const badges = assignedIds
                          .map((roundId) => rounds.find((round) => String(round.id) === roundId))
                          .filter(Boolean)
                        return (
                          <div className="flex flex-wrap gap-2">
                            {badges.map((round) => (
                              <span
                                key={round.id}
                                className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-200"
                              >
                                {round.name || `Round ${round.order_index}`}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyJudgeLink(judge.url_token)}
                    >
                      <Copy size={16} className="mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignmentsModal(judge)}
                    >
                      <ClipboardList size={16} className="mr-1" />
                      Assign Rounds
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(judge)}
                    >
                      <Power size={16} />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(judge)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Judge Modal */}
      <JudgeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />

      <JudgeRoundsModal
        isOpen={isAssignmentsModalOpen}
        judge={editingJudge}
        rounds={rounds}
        selectedRoundIds={editingJudge ? roundAssignments[String(editingJudge.id)] || [] : []}
        onSave={handleSaveAssignments}
        onClose={() => {
          setIsAssignmentsModalOpen(false)
          setEditingJudge(null)
        }}
      />
    </div>
  )
}
