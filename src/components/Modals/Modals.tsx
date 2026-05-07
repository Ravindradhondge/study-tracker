import { useState } from 'react';
import { X, Trash2, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportTasksToCSV, downloadCSV, exportTasksToPDF } from '../../utils/export';

export function NotificationModal() {
  const { notification, setNotification, switchMode, timerMode } = useApp();
  if (!notification) return null;

  const isTimerNotification = notification.title.includes('Session Complete') || notification.title.includes('Break Over');

  return (
    <div className="modal-overlay" onClick={() => setNotification(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title accent">{notification.title}</h2>
        <p className="modal-body">{notification.message}</p>
        {isTimerNotification ? (
          <button className="btn-primary btn-full" onClick={() => { setNotification(null); switchMode(timerMode === 'focus' ? 'break' : 'focus'); }}>
            Continue
          </button>
        ) : (
          <button className="btn-primary btn-full" onClick={() => setNotification(null)}>
            👍 Got it, Let's Go!
          </button>
        )}
      </div>
    </div>
  );
}

export function ScreenshotModal() {
  const { screenshots, showScreenshotModal, setShowScreenshotModal } = useApp();
  if (!showScreenshotModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowScreenshotModal(false)}>
      <div className="modal-card modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tracking Evidence ({screenshots.length})</h2>
          <button className="btn-icon" onClick={() => setShowScreenshotModal(false)}><X size={20} /></button>
        </div>
        <div className="screenshot-grid">
          {screenshots.map((src, i) => <img key={i} src={src} className="screenshot-item" alt="screen" />)}
        </div>
      </div>
    </div>
  );
}

export function ManageSectionsModal() {
  const { sections, showManageSections, setShowManageSections, deleteSection, addSection } = useApp();
  const [newName, setNewName] = useState('');

  if (!showManageSections) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowManageSections(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Sections</h2>
          <button className="btn-icon" onClick={() => setShowManageSections(false)}><X size={20} /></button>
        </div>
        <div className="sections-list">
          {sections.map(sec => (
            <div key={sec.id} className="section-item">
              <div className="section-item-info">
                <span className="section-icon">{sec.icon}</span>
                <span>{sec.name}</span>
              </div>
              <button className="btn-icon" onClick={() => { if (confirm(`Delete "${sec.name}"?`)) deleteSection(sec.id); }}>
                <Trash2 size={16} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
        <div className="add-section-row">
          <input type="text" className="form-input" placeholder="New section name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn-primary" onClick={() => addSection(newName)}>Add</button>
        </div>
      </div>
    </div>
  );
}

export function ExportModal() {
  const { tasks, sections } = useApp();
  const [show, setShow] = useState(false);

  if (!show) return (
    <button className="btn-secondary btn-sm" onClick={() => setShow(true)}>
      <Download size={14} /> Export
    </button>
  );

  return (
    <div className="modal-overlay" onClick={() => setShow(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Data</h2>
          <button className="btn-icon" onClick={() => setShow(false)}><X size={20} /></button>
        </div>
        <p className="modal-body">{tasks.length} total tasks available for export</p>
        <div className="export-actions">
          <button className="btn-primary" onClick={() => {
            const csv = exportTasksToCSV(tasks, sections);
            downloadCSV(csv, `study-tracker-${new Date().toISOString().split('T')[0]}.csv`);
          }}>
            <Download size={16} /> Download CSV
          </button>
          <button className="btn-secondary" onClick={() => exportTasksToPDF(tasks, sections)}>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
