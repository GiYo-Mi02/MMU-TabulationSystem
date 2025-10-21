import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast, Toaster } from 'sonner'
import { Bell, CheckCircle, XCircle, Clock, User } from 'lucide-react'

export default function AssistanceRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('assistance-requests-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assistance_requests'
      }, (payload) => {
        console.log('Assistance request change:', payload)
        
        // Show notification for new requests
        if (payload.eventType === 'INSERT') {
          const audio = new Audio('/notification.mp3')
          audio.play().catch(e => console.log('Could not play sound:', e))
          
          toast.error(`🚨 ${payload.new.judge_name} needs assistance!`, {
            duration: 10000,
            position: 'top-center'
          })
        }
        
        // Refresh the list for all events
        fetchRequests()
      })
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to assistance requests')
        }
      })

    return () => {
      console.log('Unsubscribing from assistance requests')
      subscription.unsubscribe()
    }
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('assistance_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Error fetching assistance requests:', error)
      toast.error('Failed to load assistance requests')
    } else {
      setRequests(data || [])
    }
    setLoading(false)
  }

  const resolveRequest = async (requestId, judgeName) => {
    const staffName = prompt(`Resolving assistance for ${judgeName}.\n\nEnter your name:`)
    if (!staffName) return

    const { error } = await supabase
      .from('assistance_requests')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: staffName
      })
      .eq('id', requestId)

    if (error) {
      console.error('Error resolving request:', error)
      toast.error('Failed to resolve request')
    } else {
      toast.success('Request marked as resolved')
      fetchRequests()
    }
  }

  const cancelRequest = async (requestId) => {
    const { error } = await supabase
      .from('assistance_requests')
      .update({
        status: 'cancelled',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to cancel request')
    } else {
      toast.success('Request cancelled')
      fetchRequests()
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const resolvedRequests = requests.filter(r => r.status === 'resolved')
  const cancelledRequests = requests.filter(r => r.status === 'cancelled')

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Judge Assistance Requests</h1>
          <p className="text-muted-foreground">Monitor and respond to judges needing technical help</p>
        </div>

        {/* Alert for pending requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-6 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <Bell size={32} className="text-red-500" />
              <div>
                <h2 className="text-2xl font-bold text-red-400">
                  {pendingRequests.length} Judge{pendingRequests.length > 1 ? 's' : ''} Need{pendingRequests.length === 1 ? 's' : ''} Help!
                </h2>
                <p className="text-red-300">Please send event staff immediately</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        <Card className="mb-6 border-2 border-red-500 bg-card">
          <CardHeader className="bg-red-950/30 dark:bg-red-950/30 border-b border-red-500/20">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="text-red-500" />
              Pending Assistance ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading requests...</p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <p>No pending assistance requests</p>
                <p className="text-sm mt-2">All judges are good to go! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-red-950/20 border-2 border-red-500/30 rounded-lg p-6 hover:shadow-lg hover:shadow-red-500/10 transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User size={24} className="text-red-500" />
                          <h3 className="text-xl font-bold text-foreground">{request.judge_name}</h3>
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                            URGENT
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mb-4">
                          <Clock size={16} />
                          <span className="text-sm">
                            Requested: {new Date(request.requested_at).toLocaleTimeString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.floor((Date.now() - new Date(request.requested_at)) / 1000 / 60)} min ago)
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveRequest(request.id, request.judge_name)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-green-600/20"
                        >
                          <CheckCircle size={20} />
                          Resolve
                        </button>
                        <button
                          onClick={() => cancelRequest(request.id)}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Requests */}
        <Card className="mb-6 bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle className="text-green-500" />
              Resolved ({resolvedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {resolvedRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No resolved requests yet</p>
            ) : (
              <div className="space-y-3">
                {resolvedRequests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="bg-green-950/20 border border-green-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{request.judge_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Resolved by: <span className="text-primary">{request.resolved_by}</span> at {new Date(request.resolved_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <CheckCircle className="text-green-500" size={24} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="text-center">
                <Bell className="mx-auto mb-2 text-red-500" size={32} />
                <p className="text-3xl font-bold text-red-500">{pendingRequests.length}</p>
                <p className="text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                <p className="text-3xl font-bold text-green-500">{resolvedRequests.length}</p>
                <p className="text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="text-center">
                <Clock className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-3xl font-bold text-primary">{requests.length}</p>
                <p className="text-muted-foreground">Total Requests</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
