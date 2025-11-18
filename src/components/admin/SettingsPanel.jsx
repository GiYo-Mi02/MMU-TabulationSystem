import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast } from 'sonner'
import { Save, Lock, Unlock, FileText, Trash2, AlertTriangle } from 'lucide-react'

export default function SettingsPanel() {
  const [roundName, setRoundName] = useState('Main Round')
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSettings()

    // Subscribe to realtime updates for settings
    const settingsChannel = supabase
      .channel('settings-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settingsChannel)
    }
  }, [])

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')

    if (data) {
      const locked = data.find(s => s.key === 'is_locked')
      const round = data.find(s => s.key === 'round_name')
      
      if (locked) setIsLocked(locked.value === 'true')
      if (round) setRoundName(round.value || 'Main Round')
    }
  }

  const handleSaveRoundName = async () => {
    setLoading(true)

    const { error } = await supabase
      .from('settings')
      .update({ value: roundName })
      .eq('key', 'round_name')

    setLoading(false)

    if (error) {
      toast.error('Failed to save round name')
      return
    }

    toast.success('Round name updated successfully!')
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

    setIsLocked(newValue)
    toast.success(newValue ? 'Scoring locked!' : 'Scoring unlocked!')
  }

  const handleResetScores = async () => {
    if (!confirm('Are you sure you want to delete ALL scores? This action cannot be undone!')) {
      return
    }

    if (!confirm('This will permanently delete all submitted scores. Are you absolutely sure?')) {
      return
    }

    const { error } = await supabase
      .from('contestant_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) {
      toast.error('Failed to reset scores')
      return
    }

    toast.success('All scores have been reset')
  }

  const handleResetAll = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL data (judges, contestants, and scores). Continue?')) {
      return
    }

    if (!confirm('Type "DELETE ALL" to confirm this action (just click OK if you understand the risk)')) {
      return
    }

    const { error: scoresError } = await supabase.from('contestant_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: judgesError } = await supabase.from('judges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: contestantsError } = await supabase.from('contestants').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (scoresError || judgesError || contestantsError) {
      toast.error('Failed to reset all data')
      return
    }

    toast.success('All data has been reset')
  }

  return (
    <div className="space-y-6">
      {/* Round Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            Round Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="roundName">Round Name</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="roundName"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g., Preliminaries, Finals"
              />
              <Button onClick={handleSaveRoundName} disabled={loading}>
                <Save className="mr-2" size={16} />
                Save
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This will be displayed on the public leaderboard
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
            Scoring Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Scoring Status</h4>
              <p className="text-sm text-gray-600 mt-1">
                {isLocked 
                  ? 'Judges cannot submit or modify scores' 
                  : 'Judges can submit and modify scores'}
              </p>
            </div>
            <Button
              onClick={handleToggleLock}
              variant={isLocked ? 'destructive' : 'default'}
              size="lg"
            >
              {isLocked ? (
                <>
                  <Unlock className="mr-2" size={16} />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="mr-2" size={16} />
                  Lock
                </>
              )}
            </Button>
          </div>

          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-medium text-red-900">Scoring is Currently Locked</h4>
                  <p className="text-sm text-red-700 mt-1">
                    All judge scoring interfaces are disabled. Unlock to allow changes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <h4 className="font-medium text-red-900">Reset All Scores</h4>
              <p className="text-sm text-red-700 mt-1">
                Delete all submitted scores. Judges and contestants will remain.
              </p>
            </div>
            <Button onClick={handleResetScores} variant="destructive">
              <Trash2 className="mr-2" size={16} />
              Reset Scores
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <h4 className="font-medium text-red-900">Reset Everything</h4>
              <p className="text-sm text-red-700 mt-1">
                Delete all data including judges, contestants, and scores.
              </p>
            </div>
            <Button onClick={handleResetAll} variant="destructive">
              <AlertTriangle className="mr-2" size={16} />
              Reset All Data
            </Button>
          </div>

          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <strong>⚠️ Warning:</strong> These actions cannot be undone. Make sure to export your data before resetting.
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Version:</dt>
              <dd className="font-medium">1.0.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Database:</dt>
              <dd className="font-medium">Supabase (Connected)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Real-time:</dt>
              <dd className="font-medium text-green-600">Active</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
