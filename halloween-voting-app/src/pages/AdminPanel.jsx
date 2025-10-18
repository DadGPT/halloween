import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Edit, Trash2, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHalloween } from '../context/HalloweenContext'
import Toast from '../components/Toast'

export default function AdminPanel() {
  const { entries, categories, addEntry, updateEntry, deleteEntry, resetAllVotes } = useHalloween()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [toast, setToast] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual',
    emoji: '🎃',
    avatarType: 'emoji'
  })

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingEntry) {
      updateEntry(editingEntry.id, formData)
      showToast('Entry updated!')
      setEditingEntry(null)
    } else {
      addEntry(formData)
      showToast('Entry added!')
      setShowAddForm(false)
    }
    setFormData({ name: '', type: 'individual', emoji: '🎃', avatarType: 'emoji' })
  }

  const handleEdit = (entry) => {
    setFormData({
      name: entry.name,
      type: entry.type,
      emoji: entry.emoji || entry.avatar,
      avatarType: entry.avatarType
    })
    setEditingEntry(entry)
    setShowAddForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(id)
      showToast('Entry deleted!')
    }
  }

  const handleResetAllVotes = () => {
    if (window.confirm('Are you sure you want to reset ALL votes? This cannot be undone!')) {
      resetAllVotes()
      showToast('All votes reset!')
    }
  }

  const getTotalVotes = (entry) => {
    return Object.values(entry.votes).reduce((sum, count) => sum + count, 0)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-950 via-purple-900 to-purple-800">
      {/* Header */}
      <motion.div 
        className="flex-shrink-0 bg-purple-950/95 backdrop-blur-sm p-4 shadow-lg z-50"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <Link to="/">
            <motion.button
              className="w-11 h-11 bg-orange-500/20 border-2 border-orange-500 rounded-lg flex items-center justify-center text-orange-500"
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="text-xl font-bold text-orange-500">Admin Panel</h1>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4">
          {/* Controls */}
          <div className="flex gap-3 mb-6">
            <motion.button
              className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              onClick={() => setShowAddForm(true)}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              Add Entry
            </motion.button>
            <motion.button
              className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              onClick={handleResetAllVotes}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-5 h-5" />
              Reset All
            </motion.button>
          </div>

          {/* Stats */}
          <motion.div
            className="bg-black/40 rounded-2xl p-5 mb-6 backdrop-blur-sm border border-orange-500/30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-orange-500 text-lg font-semibold mb-3">Contest Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{entries.length}</div>
                <div className="text-white/70 text-sm">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {entries.reduce((sum, entry) => sum + getTotalVotes(entry), 0)}
                </div>
                <div className="text-white/70 text-sm">Total Votes</div>
              </div>
            </div>
          </motion.div>

          {/* Entries List */}
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                className="bg-black/50 rounded-2xl p-4 border border-orange-500/30"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {entry.avatarType === 'image' ? (
                      <img 
                        src={entry.image} 
                        alt={entry.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      entry.emoji || entry.avatar
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-orange-400 font-semibold">{entry.name}</div>
                    <div className="text-white/70 text-sm capitalize">{entry.type}</div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      className="w-10 h-10 bg-blue-500/20 border border-blue-500 rounded-lg flex items-center justify-center text-blue-500"
                      onClick={() => handleEdit(entry)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className="w-10 h-10 bg-red-500/20 border border-red-500 rounded-lg flex items-center justify-center text-red-500"
                      onClick={() => handleDelete(entry.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                
                {/* Vote Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {categories.map(category => (
                    <div key={category.id} className="bg-black/30 rounded-lg p-2">
                      <div className="text-lg">{category.emoji}</div>
                      <div className="text-white font-semibold">{entry.votes[category.id]}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-purple-950 rounded-2xl p-6 w-full max-w-md border border-orange-500/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h3 className="text-orange-500 text-lg font-semibold mb-4">
              {editingEntry ? 'Edit Entry' : 'Add New Entry'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white focus:border-orange-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white focus:border-orange-500 outline-none"
                >
                  <option value="individual">Individual</option>
                  <option value="couple">Couple/Group</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full p-3 bg-black/50 border border-orange-500/30 rounded-lg text-white focus:border-orange-500 outline-none text-2xl text-center"
                  placeholder="🎃"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingEntry(null)
                    setFormData({ name: '', type: 'individual', emoji: '🎃', avatarType: 'emoji' })
                  }}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold"
                >
                  {editingEntry ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Toast */}
      <Toast message={toast} />
    </div>
  )
}