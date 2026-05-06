import { Camera, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TrackingWidget() {
  const { isScreenShared, screenshots, setShowScreenshotModal, startScreenCapture, stopScreenCapture } = useApp();

  return (
    <div className="widget-card">
      <div className="widget-header">Screen Tracking</div>
      <div className="tracking-status">
        <div className={`status-dot ${isScreenShared ? 'active' : 'inactive'}`}></div>
        <span>{isScreenShared ? 'Active tracking' : 'Not tracking'}</span>
      </div>
      <div className="tracking-actions">
        {!isScreenShared ? (
          <button className="btn-primary btn-sm" onClick={startScreenCapture}>
            <Camera size={16} /> Enable
          </button>
        ) : (
          <button className="btn-primary btn-sm btn-danger" onClick={stopScreenCapture}>
            Stop
          </button>
        )}
        {screenshots.length > 0 && (
          <button className="btn-secondary btn-sm" onClick={() => setShowScreenshotModal(true)}>
            <ImageIcon size={16} /> {screenshots.length}
          </button>
        )}
      </div>
    </div>
  );
}
