import { AppProvider, useApp } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ProgressBanner from './components/Tasks/ProgressBanner';
import TaskForm from './components/Tasks/TaskForm';
import TaskList from './components/Tasks/TaskList';
import FocusTimer from './components/Timer/FocusTimer';
import StatsWidget from './components/Timer/StatsWidget';
import TrackingWidget from './components/Tracking/TrackingWidget';
import { NotificationModal, ScreenshotModal, ManageSectionsModal, ExportModal } from './components/Modals/Modals';
import './index.css';

function AppContent() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return <div className="app-container loading"><div className="spinner" /></div>;
  }

  if (!user || !user.name) {
    return <LoginForm />;
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <ProgressBanner />
          <TaskForm />
          <TaskList />
        </main>
        <aside className="right-panel">
          <FocusTimer />
          <StatsWidget />
          <TrackingWidget />
          <ExportModal />
        </aside>

        <NotificationModal />
        <ScreenshotModal />
        <ManageSectionsModal />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
