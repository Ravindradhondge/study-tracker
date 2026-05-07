import { useState } from 'react';
import { Trash2, Edit2, Check, X, FileText, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { toggleTask, deleteTask, editTask } = useApp();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority || 'medium');
  const [editTime, setEditTime] = useState(task.time || '');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes || '');

  const handleSave = async () => {
    if (editTitle.trim()) {
      await editTask(task.id, { title: editTitle, priority: editPriority, time: editTime || undefined });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority || 'medium');
    setEditTime(task.time || '');
    setEditing(false);
  };

  const handleSaveNotes = async () => {
    await editTask(task.id, { notes });
    setShowNotes(false);
  };

  const priorityColors: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

  return (
    <div className={`task-card ${task.completed ? 'completed' : ''} priority-${editPriority}`}>
      <div className="task-left">
        <input type="checkbox" className="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
        {editing ? (
          <div className="task-edit-form">
            <input type="text" className="form-input edit-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
            <select className="form-select priority-select-small" value={editPriority} onChange={e => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input type="time" className="form-input edit-time-input" value={editTime} onChange={e => setEditTime(e.target.value)} title="Scheduled time" />
            <div className="edit-actions">
              <button className="btn-icon save" onClick={handleSave}><Check size={16} /></button>
              <button className="btn-icon cancel" onClick={handleCancel}><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="task-content">
            <div className="task-title">{task.title}</div>
            <div className="task-meta">
              <span className="priority-dot" style={{ background: priorityColors[editPriority] }} />
              <span className="priority-label">{editPriority}</span>
              {task.time && (
                <span className="task-time-badge">
                  <Clock size={12} />
                  {formatTime12h(task.time)}
                </span>
              )}
              {task.tag && <span className={`task-tag tag-${task.tag}`}>{task.tag}</span>}
              {task.duration && <span>{task.duration} mins</span>}
              {task.notes && (
                <button className="notes-indicator" onClick={() => setShowNotes(true)}>
                  <FileText size={12} /> Notes
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {!editing && (
        <div className="task-actions">
          <button className="btn-icon edit" onClick={() => setEditing(true)} title="Edit task">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon delete" onClick={() => deleteTask(task.id)} title="Delete task">
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {showNotes && (
        <div className="modal-overlay" onClick={() => setShowNotes(false)}>
          <div className="modal-card notes-modal" onClick={e => e.stopPropagation()}>
            <h3>Notes: {task.title}</h3>
            <textarea className="notes-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add your study notes here..." />
            <div className="notes-actions">
              <button className="btn-secondary" onClick={() => setShowNotes(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveNotes}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
