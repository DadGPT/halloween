import { motion } from 'framer-motion'
import { Menu, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Header({ 
  title = "Halloween Voting", 
  showBackButton = false, 
  onMenuClick, 
  onBackClick 
}) {
  return (
    <motion.div 
      className="flex-shrink-0 bg-purple-950/95 backdrop-blur-sm p-4 shadow-lg z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        {showBackButton ? (
          <motion.button
            className="w-11 h-11 bg-orange-500/20 border-2 border-orange-500 rounded-lg flex items-center justify-center text-orange-500"
            onClick={onBackClick}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎃</span>
            <h1 className="text-xl font-bold text-orange-500">{title}</h1>
          </div>
        )}
        
        {showBackButton && (
          <h1 className="flex-1 text-xl font-bold text-orange-500">{title}</h1>
        )}
        
        {!showBackButton && onMenuClick && (
          <motion.button
            className="w-11 h-11 bg-orange-500/20 border-2 border-orange-500 rounded-lg flex flex-col justify-center items-center gap-1 ml-auto"
            onClick={onMenuClick}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5 text-orange-500" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}