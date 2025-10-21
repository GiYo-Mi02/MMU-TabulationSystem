import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

function ModalComponent({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  footer,
  showCloseButton = true 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'relative bg-gray-900 border border-yellow-600/20 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col',
            {
              'max-w-sm': size === 'sm',
              'max-w-lg': size === 'md',
              'max-w-2xl': size === 'lg',
              'max-w-4xl': size === 'xl',
              'max-w-6xl': size === '2xl',
            }
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-600/20">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-yellow-600/20 bg-gray-950">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Export as both default and named for flexibility
export default ModalComponent
export { ModalComponent as Modal }
