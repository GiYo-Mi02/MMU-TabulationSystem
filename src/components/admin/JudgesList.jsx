import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateToken } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import { UserPlus, Copy, Trash2, Power, Link as LinkIcon } from 'lucide-react'

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

export default function JudgesList() {
  const [judges, setJudges] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJudges()
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('judges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judges' }, () => {
        fetchJudges()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  const fetchJudges = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('judges')
      .select('*')
      .order('created_at', { ascending: false })

    setJudges(data || [])
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
        onSuccess={fetchJudges}
      />
    </div>
  )
}
