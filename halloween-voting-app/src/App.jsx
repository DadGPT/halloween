import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import VotingApp from './pages/VotingApp'
import AdminPanel from './pages/AdminPanel'
import { HalloweenProvider } from './context/HalloweenContext'

function App() {
  return (
    <HalloweenProvider>
      <Router>
        <Routes>
          <Route path="/" element={<VotingApp />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </HalloweenProvider>
  )
}

export default App
