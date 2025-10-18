import { createContext, useContext, useState, useEffect } from 'react'

const HalloweenContext = createContext()

export function useHalloween() {
  const context = useContext(HalloweenContext)
  if (!context) {
    throw new Error('useHalloween must be used within a HalloweenProvider')
  }
  return context
}

const defaultEntries = [
  { id: 1, name: "Vampire Duo", type: "couple", emoji: "🧛‍♂️", avatarType: "emoji", avatar: "🧛‍♂️", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } },
  { id: 2, name: "Zombie Squad", type: "couple", emoji: "🧟‍♀️", avatarType: "emoji", avatar: "🧟‍♀️", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } },
  { id: 3, name: "Ghost Twins", type: "couple", emoji: "👻", avatarType: "emoji", avatar: "👻", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } },
  { id: 4, name: "Clown Prince", type: "individual", emoji: "🤡", avatarType: "emoji", avatar: "🤡", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } },
  { id: 5, name: "Witch Doctor", type: "individual", emoji: "🧙‍♀️", avatarType: "emoji", avatar: "🧙‍♀️", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } },
  { id: 6, name: "Pumpkin King", type: "individual", emoji: "🎃", avatarType: "emoji", avatar: "🎃", votes: { couple: 0, funny: 0, scary: 0, overall: 0 } }
]

const categories = [
  { id: 'couple', name: 'Best Couple', emoji: '💑', filter: e => e.type === 'couple' },
  { id: 'funny', name: 'Funniest', emoji: '😂', filter: e => true },
  { id: 'scary', name: 'Scariest', emoji: '👻', filter: e => true },
  { id: 'overall', name: 'Best Overall', emoji: '🏆', filter: e => true }
]

export function HalloweenProvider({ children }) {
  const [entries, setEntries] = useState([])
  const [votes, setVotes] = useState({
    couple: null,
    funny: null,
    scary: null,
    overall: null
  })

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('halloweenEntries')
    if (saved) {
      setEntries(JSON.parse(saved))
    } else {
      setEntries(defaultEntries)
      localStorage.setItem('halloweenEntries', JSON.stringify(defaultEntries))
    }
  }, [])

  // Load votes from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('halloweenVotes')
    if (saved) {
      setVotes(JSON.parse(saved))
    }
  }, [])

  // Save votes to sessionStorage whenever votes change
  useEffect(() => {
    sessionStorage.setItem('halloweenVotes', JSON.stringify(votes))
  }, [votes])

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('halloweenEntries', JSON.stringify(entries))
    }
  }, [entries])

  const addEntry = (entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      votes: { couple: 0, funny: 0, scary: 0, overall: 0 }
    }
    setEntries(prev => [...prev, newEntry])
  }

  const updateEntry = (id, updatedEntry) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ))
  }

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(entry => entry.id !== id))
  }

  const castVote = (categoryId, entryId) => {
    setVotes(prev => ({
      ...prev,
      [categoryId]: entryId
    }))
  }

  const resetVotes = () => {
    const resetVotesState = {
      couple: null,
      funny: null,
      scary: null,
      overall: null
    }
    setVotes(resetVotesState)
    sessionStorage.removeItem('halloweenVotes')
  }

  const lockVotes = () => {
    // Update vote counts in entries
    const updatedEntries = entries.map(entry => ({ ...entry }))
    
    for (let categoryId in votes) {
      if (votes[categoryId]) {
        const entry = updatedEntries.find(e => e.id === votes[categoryId])
        if (entry) {
          entry.votes[categoryId]++
        }
      }
    }
    
    setEntries(updatedEntries)
    resetVotes()
    
    return true
  }

  const resetAllVotes = () => {
    const resetEntries = entries.map(entry => ({
      ...entry,
      votes: { couple: 0, funny: 0, scary: 0, overall: 0 }
    }))
    setEntries(resetEntries)
    resetVotes()
  }

  const value = {
    entries,
    votes,
    categories,
    addEntry,
    updateEntry,
    deleteEntry,
    castVote,
    resetVotes,
    lockVotes,
    resetAllVotes
  }

  return (
    <HalloweenContext.Provider value={value}>
      {children}
    </HalloweenContext.Provider>
  )
}