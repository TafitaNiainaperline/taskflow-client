import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useSocket, useSocketEvent } from '../functions/useSocket'
import BoardColumn from '../components/BoardColumn'
import '../styles/board.scss'

function Board() {
  const { id } = useParams()
  const navigate = useNavigate()
  const socket = useSocket()
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [newColumnName, setNewColumnName] = useState('')
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    fetchBoard()
  }, [id])

  const fetchTeamMembers = async (teamId) => {
    try {
      if (teamId) {
        const response = await api.get(`/teams/${teamId}`)
        const members = response.data.members?.map(m => m.user) || []
        setTeamMembers(members)
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    }
  }

  useEffect(() => {
    if (socket && id) {
      socket.emit('join:board', parseInt(id))
    }
  }, [socket, id])

  useSocketEvent(socket, 'task:created', (data) => {
    if (data.boardId === parseInt(id)) {
      fetchBoard()
    }
  })

  useSocketEvent(socket, 'task:moved', (data) => {
    if (data.boardId === parseInt(id)) {
      fetchBoard()
    }
  })

  const fetchBoard = async () => {
    try {
      const response = await api.get(`/boards/${id}`)
      setBoard(response.data)
      setColumns(response.data.columns || [])
      if (response.data.teamId) {
        fetchTeamMembers(response.data.teamId)
      }
    } catch (error) {
      console.error('Failed to fetch board:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return

    try {
      await api.post('/columns', {
        title: newColumnName,
        boardId: parseInt(id),
      })
      setNewColumnName('')
      fetchBoard()
    } catch (error) {
      console.error('Failed to create column:', error)
    }
  }

  const handleCreateTask = async (columnId, taskTitle) => {
    if (!taskTitle.trim()) return

    try {
      await api.post('/tasks', {
        title: taskTitle,
        columnId,
      })
      socket?.emit('task:created', {
        boardId: parseInt(id),
      })
      fetchBoard()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading board...</div>
  }

  if (!board) {
    return <div className="error">Board not found</div>
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>{board.title}</h1>
      </header>

      <div className="board-content">
        <form onSubmit={handleCreateColumn} className="create-column-form">
          <input
            type="text"
            placeholder="New column name..."
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />
          <button type="submit" className="primary">
            + Column
          </button>
        </form>

        <div className="columns-container">
          {columns.length === 0 ? (
            <p>No columns yet. Create one to get started!</p>
          ) : (
            columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onCreateTask={handleCreateTask}
                boardId={parseInt(id)}
                teamMembers={teamMembers}
                onTaskUpdate={fetchBoard}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Board
