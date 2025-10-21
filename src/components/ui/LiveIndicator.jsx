import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wifi, WifiOff } from 'lucide-react'

export default function LiveIndicator() {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Initial connection check
    checkConnection()

    // Test Supabase connection every 5 seconds
    const connectionTest = setInterval(() => {
      checkConnection()
    }, 5000)

    return () => {
      clearInterval(connectionTest)
    }
  }, [])

  const checkConnection = async () => {
    try {
      // Quick lightweight query to test connection
      const { error } = await supabase
        .from('settings')
        .select('key')
        .limit(1)
      
      setIsConnected(!error)
    } catch (err) {
      setIsConnected(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100">
        {isConnected ? (
          <>
            <div className="relative">
              <Wifi size={12} className="text-green-600" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <span className="text-gray-700 font-medium">Live</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-red-600" />
            <span className="text-gray-700 font-medium">Reconnecting...</span>
          </>
        )}
      </div>
    </div>
  )
}
