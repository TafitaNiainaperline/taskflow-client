import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import '../styles/dashboard.scss'

function Dashboard() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [teams, setTeams] = useState([])
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [newBoardName, setNewBoardName] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [showTeamModal, setShowTeamModal] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      fetchBoards(selectedTeam)
    }
  }, [selectedTeam])

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams')
      setTeams(response.data)
      if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBoards = async (teamId) => {
    try {
      const response = await api.get(`/boards/team/${teamId}`)
      setBoards(response.data)
    } catch (error) {
      console.error('Failed to fetch boards:', error)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    try {
      await api.post('/teams', { name: newTeamName })
      setNewTeamName('')
      setShowTeamModal(false)
      fetchTeams()
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const handleCreateBoard = async (e) => {
    e.preventDefault()
    if (!newBoardName.trim() || !selectedTeam) return

    try {
      await api.post('/boards', {
        title: newBoardName,
        teamId: selectedTeam,
      })
      setNewBoardName('')
      fetchBoards(selectedTeam)
    } catch (error) {
      console.error('Failed to create board:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>TaskFlow Dashboard</h1>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="danger">
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-content">
          <aside className="sidebar">
            <div className="sidebar-header">
              <h3>Teams</h3>
              <button
                className="primary-icon"
                onClick={() => setShowTeamModal(true)}
                title="Create new team"
              >
                +
              </button>
            </div>
            <ul className="teams-list">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className={selectedTeam === team.id ? 'active' : ''}
                  onClick={() => setSelectedTeam(team.id)}
                >
                  {team.name}
                </li>
              ))}
            </ul>
          </aside>

          <main className="main-content">
            <div className="boards-section">
              <h2>Boards</h2>
              <form onSubmit={handleCreateBoard} className="create-board-form">
                <input
                  type="text"
                  placeholder="New board name..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
                <button type="submit" className="primary">
                  Create Board
                </button>
              </form>

              <div className="boards-grid">
                {boards.length === 0 ? (
                  <p>No boards yet. Create one to get started!</p>
                ) : (
                  boards.map((board) => (
                    <div
                      key={board.id}
                      className="board-card"
                      onClick={() => navigate(`/board/${board.id}`)}
                    >
                      <h3>{board.title}</h3>
                      <p>{board.columns?.length || 0} columns</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Team</h2>
            <form onSubmit={handleCreateTeam}>
              <input
                type="text"
                placeholder="Team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button type="submit" className="primary">
                  Create
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowTeamModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
