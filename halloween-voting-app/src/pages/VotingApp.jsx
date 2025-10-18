import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Lock, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHalloween } from '../context/HalloweenContext'
import Toast from '../components/Toast'
import Header from '../components/Header'
import CategoryCard from '../components/CategoryCard'
import VoteOption from '../components/VoteOption'

export default function VotingApp() {
  const { entries, votes, categories, castVote, resetVotes, lockVotes } = useHalloween()
  const [currentCategory, setCurrentCategory] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  const handleVoteSelect = (entryId) => {
    if (!currentCategory) return
    
    const isCurrentVote = votes[currentCategory.id] === entryId
    castVote(currentCategory.id, isCurrentVote ? null : entryId)
    
    showToast(isCurrentVote ? 'Vote removed' : 'Vote selected!')
    
    setTimeout(() => {
      setCurrentCategory(null)
    }, 500)
  }

  const handleLockVotes = () => {
    const allVoted = categories.every(cat => votes[cat.id] !== null)
    if (!allVoted) {
      showToast('Please vote in all categories first!')
      return
    }
    
    if (window.confirm('Are you sure you want to lock in your votes? This cannot be undone!')) {
      lockVotes()
      showToast('Votes locked in successfully! 🎉')
    }
  }

  const handleResetVotes = () => {
    if (window.confirm('Reset all your votes?')) {
      resetVotes()
      showToast('All votes reset!')
    }
  }

  const hasAnyVotes = Object.values(votes).some(v => v !== null)
  const allVoted = categories.every(cat => votes[cat.id] !== null)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-950 via-purple-900 to-purple-800">
      <Header onMenuClick={() => setShowMenu(true)} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-24">
          {/* Welcome Card */}
          <motion.div
            className="bg-black/40 rounded-2xl p-5 mb-6 backdrop-blur-sm border border-orange-500/30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-orange-500 text-xl font-semibold mb-2 text-center">
              Cast Your Votes! 🗳️
            </h2>
            <p className="text-white/90 text-center leading-relaxed">
              Select each category below to vote for your favorite costume
            </p>
          </motion.div>

          {/* Categories */}
          <div className="flex flex-col gap-4">
            {categories.map((category, index) => {
              const hasVote = votes[category.id] !== null
              const votedEntry = hasVote ? entries.find(e => e.id === votes[category.id]) : null

              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  hasVote={hasVote}
                  votedEntry={votedEntry}
                  onCategoryClick={() => setCurrentCategory(category)}
                  onEditClick={(e) => {
                    e.stopPropagation()
                    setCurrentCategory(category)
                  }}
                  index={index}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <AnimatePresence>
        {hasAnyVotes && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-purple-950 to-purple-950/95 backdrop-blur-sm z-40"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex gap-3">
              <motion.button
                className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
                onClick={handleResetVotes}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-5 h-5" />
                Reset
              </motion.button>
              <motion.button
                className={`flex-1 py-4 px-6 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-opacity ${
                  allVoted 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-black' 
                    : 'bg-gray-500 text-gray-300 opacity-50'
                }`}
                onClick={handleLockVotes}
                disabled={!allVoted}
                whileTap={allVoted ? { scale: 0.98 } : {}}
              >
                <Lock className="w-5 h-5" />
                Lock In
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[199]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              className="fixed top-0 right-0 w-3/4 max-w-sm h-full bg-purple-950/98 backdrop-blur-md z-[200] shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-5 border-b border-orange-500/30 flex justify-between items-center">
                <div className="text-orange-500 text-lg font-semibold">Menu</div>
                <motion.button
                  className="w-11 h-11 border-2 border-orange-500 rounded-full text-orange-500 flex items-center justify-center"
                  onClick={() => setShowMenu(false)}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-5">
                <Link
                  to="/admin"
                  className="block p-4 mb-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-white text-lg min-h-[44px] flex items-center gap-3"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="w-5 h-5" />
                  Admin Panel
                </Link>
                <button
                  className="block w-full p-4 mb-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-white text-lg min-h-[44px] flex items-center gap-3"
                  onClick={() => {
                    resetVotes()
                    setShowMenu(false)
                    showToast('All votes reset!')
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset My Votes
                </button>
                <button
                  className="block w-full p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-white text-lg min-h-[44px] flex items-center gap-3"
                  onClick={() => {
                    showToast('Halloween Contest v2.0 🎃')
                    setShowMenu(false)
                  }}
                >
                  ℹ️ About
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voting Overlay */}
      <AnimatePresence>
        {currentCategory && (
          <motion.div
            className="fixed inset-0 bg-gradient-to-b from-purple-950 via-purple-900 to-purple-800 z-[300] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Overlay Header */}
            <motion.div
              className="flex-shrink-0 bg-purple-950/98 backdrop-blur-sm p-4 flex items-center gap-4 shadow-lg"
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <motion.button
                className="w-11 h-11 bg-orange-500/20 border-2 border-orange-500 rounded-lg flex items-center justify-center text-orange-500"
                onClick={() => setCurrentCategory(null)}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex-1 text-orange-500 text-lg font-semibold">
                {currentCategory.emoji} {currentCategory.name}
              </div>
            </motion.div>

            {/* Voting Options */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4 flex flex-col gap-4">
                {entries.filter(currentCategory.filter).map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    className={`bg-black/50 rounded-2xl p-5 border-3 cursor-pointer text-center transition-all ${
                      votes[currentCategory.id] === entry.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-transparent'
                    }`}
                    onClick={() => handleVoteSelect(entry.id)}
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
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toast message={toast} />
    </div>
  )
}