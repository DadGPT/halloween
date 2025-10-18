import { motion } from 'framer-motion'
import { Edit } from 'lucide-react'

export default function CategoryCard({ 
  category, 
  hasVote, 
  votedEntry, 
  onCategoryClick, 
  onEditClick,
  index 
}) {
  return (
    <motion.div
      className={`bg-black/50 rounded-2xl p-5 border-3 cursor-pointer transition-all ${
        hasVote 
          ? 'border-green-500 bg-green-500/10' 
          : 'border-orange-500 animate-pulse'
      }`}
      onClick={onCategoryClick}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4 pointer-events-none">
        <div className="text-4xl flex-shrink-0">{category.emoji}</div>
        <div className="flex-1">
          <div className="text-orange-400 text-lg font-semibold mb-1">
            {category.name}
          </div>
          <div className={`text-sm ${hasVote ? 'text-green-500' : 'text-white/70'}`}>
            {hasVote ? '✓ Vote Cast' : '⚠️ Vote Required'}
          </div>
        </div>
      </div>
      
      {hasVote && votedEntry && (
        <motion.div
          className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center text-xl flex-shrink-0">
            {votedEntry.avatarType === 'image' ? (
              <img 
                src={votedEntry.image} 
                alt={votedEntry.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              votedEntry.emoji || votedEntry.avatar
            )}
          </div>
          <div className="flex-1 text-white font-medium">
            {votedEntry.name}
          </div>
          <motion.button
            className="w-10 h-10 bg-white/10 border border-white/30 rounded-full flex items-center justify-center text-white/70 pointer-events-auto"
            onClick={onEditClick}
            whileTap={{ scale: 0.95 }}
          >
            <Edit className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  )
}