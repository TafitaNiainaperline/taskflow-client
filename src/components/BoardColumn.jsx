import { useState } from 'react'
import api from '../api/axios'
import { useSocket, useSocketEmit } from '../functions/useSocket'
import TaskModal from './TaskModal'
import '../styles/board-column.scss'

function BoardColumn({ column, onCreateTask, boardId, teamMembers, onTaskUpdate }) {
  const [newTaskName, setNewTaskName] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const socket = useSocket()
  const emit = useSocketEmit(socket)

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreateTask(column.id, newTaskName)
    setNewTaskName('')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    const taskId = parseInt(e.dataTransfer.getData('taskId'))
    const sourceColumnId = parseInt(e.dataTransfer.getData('sourceColumnId'))

    if (taskId && sourceColumnId !== column.id) {
      try {
        await api.patch(`/tasks/${taskId}/move`, {
          columnId: column.id,
          newPosition: column.tasks?.length || 0,
        })
        emit('task:moved', { boardId, taskId, newColumnId: column.id })
        onTaskUpdate()
      } catch (error) {
        console.error('Failed to move task:', error)
      }
    }
  }

  const handleTaskDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', task.id.toString())
    e.dataTransfer.setData('sourceColumnId', column.id.toString())
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleModalClose = () => {
    setShowTaskModal(false)
    onTaskUpdate()
  }

  return (
    <div
      className="column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
          <div
            key={task.id}
            className="task-card"
            draggable
            onDragStart={(e) => handleTaskDragStart(e, task)}
            onClick={() => handleTaskClick(task)}
          >
            <p>{task.title}</p>
            {task.description && <small>{task.description}</small>}
            {task.assignees?.length > 0 && (
              <div className="task-assignees">
                {task.assignees.map((assignee) => (
                  <span key={assignee.id} className="assignee-badge">
                    {assignee.user.name.charAt(0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={handleModalClose}
          teamMembers={teamMembers}
          onUpdate={handleModalClose}
        />
      )}
    </div>
  )
}

export default BoardColumn
