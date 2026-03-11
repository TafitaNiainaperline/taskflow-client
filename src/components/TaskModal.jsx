import api from '../api/axios'
import '../styles/task-modal.scss'

function TaskModal({ task, onClose, teamMembers, onUpdate }) {
  const handleAssignUser = async (userId) => {
    if (!task) return
    try {
      await api.post(`/tasks/${task.id}/assign`, { userId })
      onUpdate()
    } catch (error) {
      console.error('Failed to assign user:', error)
    }
  }

  const handleRemoveAssignment = async (userId) => {
    if (!task) return
    try {
      await api.delete(`/tasks/${task.id}/assign/${userId}`)
      onUpdate()
    } catch (error) {
      console.error('Failed to remove assignment:', error)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}

        <div className="modal-section">
          <h4>Assignees</h4>
          <div className="assignees-list">
            {task.assignees?.map((assignee) => (
              <div key={assignee.id} className="assignee-item">
                <span>{assignee.user.name}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveAssignment(assignee.userId)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <h4>Add Assignee</h4>
          <div className="members-list">
            {teamMembers.map((member) => {
              const isAssigned = task.assignees?.some(a => a.userId === member.id)
              return (
                <button
                  key={member.id}
                  className={`member-btn ${isAssigned ? 'assigned' : ''}`}
                  onClick={() => !isAssigned && handleAssignUser(member.id)}
                  disabled={isAssigned}
                >
                  {member.name}
                </button>
              )
            })}
          </div>
        </div>

        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default TaskModal
