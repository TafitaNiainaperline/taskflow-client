import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import MembersIcon from '../images/friend-group-members-svgrepo-com.svg'
import '../styles/dashboard.scss'

function Dashboard() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [boards, setBoards] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState({})
  const [showTaskForm, setShowTaskForm] = useState({})
  const [selectedColumns, setSelectedColumns] = useState({
    'À faire': true,
    'En cours': true,
    'Fait': true,
  })
  const [customColumn, setCustomColumn] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignmentTeamId, setAssignmentTeamId] = useState(null)
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false)
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '', timeout: null })

  const availableColumns = ['À faire', 'En cours', 'Fait', 'Bloqué', 'Révision', 'Archivé']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [boardsRes, teamsRes] = await Promise.all([
        api.get('/boards'),
        api.get('/teams')
      ])
      setBoards(boardsRes.data)
      setTeams(teamsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    const columnsToCreate = Object.entries(selectedColumns)
      .filter(([, isSelected]) => isSelected)
      .map(([name]) => name)

    if (columnsToCreate.length === 0) return

    try {
      // Create team
      const teamRes = await api.post('/teams', { name: newTeamName })
      const teamId = teamRes.data.id

      // Create default board with same name as team
      const boardRes = await api.post('/boards', {
        title: newTeamName,
        teamId,
      })

      // Create selected columns
      const boardId = boardRes.data.id
      for (let i = 0; i < columnsToCreate.length; i++) {
        await api.post('/columns', {
          title: columnsToCreate[i],
          boardId,
          position: i,
        })
      }

      setNewTeamName('')
      setSelectedColumns({
        'À faire': true,
        'En cours': true,
        'Fait': true,
      })
      setCustomColumn('')
      setShowTeamModal(false)
      fetchData()
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const handleAddCustomColumn = () => {
    if (!customColumn.trim()) return
    setSelectedColumns({
      ...selectedColumns,
      [customColumn]: true,
    })
    setCustomColumn('')
  }

  const handleCreateTask = async (columnId) => {
    const title = newTaskTitle[columnId]?.trim()
    if (!title) return

    try {
      await api.post('/tasks', {
        title,
        columnId,
      })
      setNewTaskTitle({ ...newTaskTitle, [columnId]: '' })
      setShowTaskForm({ ...showTaskForm, [columnId]: false })
      fetchData()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleDragStart = (e, taskId, columnId) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('sourceColumnId', columnId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault()
    const taskId = parseInt(e.dataTransfer.getData('taskId'))
    const sourceColumnId = parseInt(e.dataTransfer.getData('sourceColumnId'))

    if (sourceColumnId === targetColumnId) return

    try {
      await api.patch(`/tasks/${taskId}/move`, {
        columnId: targetColumnId,
        newPosition: 0,
      })
      fetchData()
    } catch (error) {
      console.error('Failed to move task:', error)
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleAssignUser = async (userId) => {
    if (!selectedTask) return

    try {
      await api.post(`/tasks/${selectedTask.id}/assign`, { userId })
      setShowAssignModal(false)
      fetchData()
      setSelectedTask(null)
      setShowTaskModal(false)
    } catch (error) {
      console.error('Failed to assign user:', error)
    }
  }

  const handleRemoveAssignee = async (userId) => {
    if (!selectedTask) return

    try {
      await api.delete(`/tasks/${selectedTask.id}/assign/${userId}`)
      fetchData()
      setSelectedTask(null)
      setShowTaskModal(false)
    } catch (error) {
      console.error('Failed to remove assignee:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getTeamById = (teamId) => teams.find(t => t.id === teamId)

  const showStatus = (text, type = 'success') => {
    if (statusMessage.timeout) clearTimeout(statusMessage.timeout)
    const timeout = setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000)
    setStatusMessage({ type, text, timeout })
  }

  const handleAddTeamMember = async () => {
    if (!memberEmail.trim() || !selectedTeamForMembers) return

    try {
      // Search for user by email
      console.log('Searching user with email:', memberEmail)
      const searchRes = await api.get('/teams/users/search', {
        params: { email: memberEmail }
      })

      const users = searchRes.data
      console.log('Search results:', users)
      if (users.length === 0) {
        showStatus('No user found with that email', 'error')
        return
      }

      const selectedUser = users[0]
      console.log('Adding user to team:', { teamId: selectedTeamForMembers.id, userId: selectedUser.id })

      // Add user to team
      const addRes = await api.post(`/teams/${selectedTeamForMembers.id}/members`, {
        userId: selectedUser.id
      })
      console.log('Add member response:', addRes.data)

      setMemberEmail('')
      fetchData()
      showStatus(`${selectedUser.name} added to team!`, 'success')
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to add member to team'
      console.error('Failed to add team member:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      showStatus(errorMsg, 'error')
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="8" height="8" fill="#808080" rx="2"/>
            <rect x="13" y="3" width="8" height="8" fill="#808080" rx="2"/>
            <rect x="3" y="13" width="8" height="8" fill="#808080" rx="2"/>
            <rect x="13" y="13" width="8" height="8" fill="#808080" rx="2"/>
          </svg>
          <h1>Task</h1>
        </div>
        <div className="header-actions">
          <span>Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="danger">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="boards-actions">
          <button
            className="primary-btn"
            onClick={() => setShowTeamModal(true)}
          >
            + New Team
          </button>
        </div>

        <div className="teams-section">
          {teams.length === 0 ? (
            <div className="empty-state">
              <p>No teams yet. Create a team to get started!</p>
            </div>
          ) : (
            teams.map((team) => {
              const teamBoards = boards.filter((b) => b.teamId === team.id)
              return (
                <div key={team.id} className="team-container">
                  <div className="team-header">
                    <div>
                      <h2>{team.name}</h2>
                      <p className="team-members-count">{team.members?.length || 0} member(s)</p>
                    </div>
                    <div className="team-header-actions">
                      <button
                        className="team-btn"
                        onClick={() => {
                          setSelectedTeamForMembers(team)
                          setShowTeamMembersModal(true)
                        }}
                        title="Team Members"
                      >
                        <img src={MembersIcon} alt="Members" style={{ width: '16px', height: '16px', filter: 'invert(50%) sepia(100%) hue-rotate(200deg) saturate(0%)', objectFit: 'contain', marginTop: '-1px' }} />
                        Members
                      </button>
                      <p className="boards-count">{teamBoards.length} board(s)</p>
                    </div>
                  </div>

                  <div className="team-boards">
                    {teamBoards.length === 0 ? (
                      <p className="no-boards">No boards in this team</p>
                    ) : (
                      teamBoards.map((board) => (
                        <div key={board.id} className="board-container">
                          <div className="board-header">
                            <h3>{board.title}</h3>
                          </div>
                          <div className="board-kanban">
                            {board.columns && board.columns.length > 0 ? (
                              board.columns.map((column) => (
                                <div
                                  key={column.id}
                                  className="kanban-column"
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, column.id)}
                                >
                                  <h4>{column.title}</h4>
                                  <div className="tasks-list">
                                    {column.tasks && column.tasks.length > 0 ? (
                                      column.tasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className="task-card"
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, task.id, column.id)}
                                          onClick={() => {
                                            setAssignmentTeamId(team.id)
                                            handleTaskClick(task)
                                          }}
                                        >
                                          <p className="task-title">{task.title}</p>
                                          {task.assignees && task.assignees.length > 0 && (
                                            <div className="task-assignees">
                                              {task.assignees.map((assignee) => (
                                                <span
                                                  key={assignee.id}
                                                  className="assignee-badge"
                                                  title={assignee.user?.name}
                                                >
                                                  {assignee.user?.name?.[0]}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : null}
                                  </div>
                                  <button
                                    className="add-task-btn"
                                    onClick={() =>
                                      setShowTaskForm({
                                        ...showTaskForm,
                                        [column.id]: !showTaskForm[column.id],
                                      })
                                    }
                                  >
                                    + Add Task
                                  </button>
                                  {showTaskForm[column.id] && (
                                    <form
                                      className="add-task-form"
                                      onSubmit={(e) => {
                                        e.preventDefault()
                                        handleCreateTask(column.id)
                                      }}
                                    >
                                      <input
                                        type="text"
                                        placeholder="Task title..."
                                        value={newTaskTitle[column.id] || ''}
                                        onChange={(e) =>
                                          setNewTaskTitle({
                                            ...newTaskTitle,
                                            [column.id]: e.target.value,
                                          })
                                        }
                                        autoFocus
                                      />
                                      <button type="submit" className="primary">
                                        Add
                                      </button>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() =>
                                          setShowTaskForm({
                                            ...showTaskForm,
                                            [column.id]: false,
                                          })
                                        }
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="empty-state">No columns</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Team</h2>
            <form onSubmit={handleCreateTeam}>
              <input
                type="text"
                placeholder="Team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
              />

              <div className="columns-section">
                <h3>Select Columns</h3>
                <div className="columns-grid">
                  {availableColumns.map((col) => (
                    <label key={col} className="column-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedColumns[col] || false}
                        onChange={(e) =>
                          setSelectedColumns({
                            ...selectedColumns,
                            [col]: e.target.checked,
                          })
                        }
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="custom-column-section">
                <h3>Add Custom Column</h3>
                <div className="custom-column-input">
                  <input
                    type="text"
                    placeholder="Column name..."
                    value={customColumn}
                    onChange={(e) => setCustomColumn(e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleAddCustomColumn}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="primary">
                  Create Team
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

      {showTaskModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Task Details</h2>
            <div className="task-details">
              <p className="task-detail-title"><strong>Title:</strong> {selectedTask.title}</p>
              {selectedTask.description && <p className="task-detail-desc"><strong>Description:</strong> {selectedTask.description}</p>}

              <div className="task-assignees-section">
                <h3>Assignees</h3>
                <div className="assignees-list">
                  {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                    selectedTask.assignees.map((assignee) => (
                      <div key={assignee.id} className="assignee-item">
                        <span>{assignee.user?.name}</span>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => handleRemoveAssignee(assignee.userId)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-assignees">No assignees</p>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => setShowAssignModal(true)}
                >
                  + Assign User
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowTaskModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedTask && assignmentTeamId && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Assign User to Task</h2>
            <div className="assign-modal">
              {getTeamById(assignmentTeamId)?.members && getTeamById(assignmentTeamId).members.length > 0 ? (
                <div className="members-list">
                  {getTeamById(assignmentTeamId).members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="member-item"
                      onClick={() => handleAssignUser(member.userId)}
                    >
                      {member.user?.name} ({member.role})
                    </button>
                  ))}
                </div>
              ) : (
                <p>No team members available</p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamMembersModal && selectedTeamForMembers && (
        <div className="modal-overlay" onClick={() => setShowTeamMembersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Team Members - {selectedTeamForMembers.name}</h2>
            <div className="team-members-modal">
              <div className="members-section">
                <h3>Current Members</h3>
                {selectedTeamForMembers.members && selectedTeamForMembers.members.length > 0 ? (
                  <div className="members-list">
                    {selectedTeamForMembers.members.map((member) => (
                      <div key={member.id} className="member-row">
                        <span className="member-name">{member.user?.name}</span>
                        <span className="member-email">{member.user?.email}</span>
                        <span className="member-role">{member.role}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No members in this team</p>
                )}
              </div>

              <div className="invite-section">
                <h3>Invite New Member</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    type="button"
                    className="primary"
                    onClick={handleAddTeamMember}
                    style={{
                      padding: '8px 16px',
                      background: '#808080',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Add
                  </button>
                </div>
                {statusMessage.text && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: statusMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: statusMessage.type === 'success' ? '#2e7d32' : '#c62828'
                  }}>
                    {statusMessage.text}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowTeamMembersModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
