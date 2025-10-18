import { motion } from 'framer-motion'

export default function VoteOption({ entry, isSelected, onClick, index }) {
  return (
    <motion.div
      className={`bg-black/50 rounded-2xl p-5 border-3 cursor-pointer text-center transition-all ${
        isSelected ? 'border-green-500 bg-green-500/10' : 'border-transparent'
      }`}
      onClick={onClick}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="text-6xl mb-4 h-24 flex items-center justify-center">
        {entry.avatarType === 'image' ? (
          <img 
            src={entry.image} 
            alt={entry.name}
            className="w-20 h-20 object-cover rounded-2xl border-2 border-orange-500"
          />
        ) : (
          <span>{entry.emoji || entry.avatar || '👻'}</span>
        )}
      </div>
      <div className="text-orange-400 text-lg font-semibold mb-1">
        {entry.name}
      </div>
      <div className="text-white/70 text-sm">
        {entry.type === 'couple' ? 'Couple/Group' : 'Individual'}
      </div>
    </motion.div>
  )
}