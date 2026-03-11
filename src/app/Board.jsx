import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useSocket, useSocketEvent, useSocketEmit } from '../functions/useSocket'
import '../styles/board.scss'

function Board() {
  const { id } = useParams()
  const navigate = useNavigate()
  const socket = useSocket()
  const emit = useSocketEmit(socket)
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [newColumnName, setNewColumnName] = useState('')

  useEffect(() => {
    fetchBoard()
  }, [id])

  useEffect(() => {
    if (socket && id) {
      emit('join:board', parseInt(id))
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
      const response = await api.post('/tasks', {
        title: taskTitle,
        columnId,
      })
      emit('task:created', {
        boardId: parseInt(id),
        task: response.data,
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function BoardColumn({ column, onCreateTask, boardId }) {
  const [newTaskName, setNewTaskName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreateTask(column.id, newTaskName)
    setNewTaskName('')
  }

  return (
    <div className="column">
      <h3>{column.title}</h3>
      <form onSubmit={handleSubmit} className="create-task-form">
        <input
          type="text"
          placeholder="New task..."
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
        />
        <button type="submit" className="secondary">
          Add
        </button>
      </form>
      <div className="tasks-list">
        {column.tasks?.map((task) => (
          <div key={task.id} className="task-card">
            <p>{task.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Board
