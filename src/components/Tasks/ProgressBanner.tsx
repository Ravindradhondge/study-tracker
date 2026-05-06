import { useApp } from '../../context/AppContext';

export default function ProgressBanner() {
  const { progressPercentage, completedCount, displayTasks } = useApp();

  return (
    <div className="progress-banner">
      <div className="progress-header">
        <span>Daily Progress</span>
        <span>{completedCount} of {displayTasks.length} Completed</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
      </div>
    </div>
  );
}
