import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Flame, Plus, 
  Trash2, Play, Pause, RotateCcw, Calendar,
  Settings, X, Camera, Image as ImageIcon,
  LogOut, Headphones, LayoutDashboard
} from 'lucide-react';
import { auth, db } from './firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut, type ConfirmationResult, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import './index.css';

type TaskType = string;

interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: TaskType;
  tag?: string;
  date?: string;
  time?: string;
  duration?: number | null;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

interface Section {
  id: string;
  name: string;
  icon: string;
  tags: string[];
}

const DEFAULT_SECTIONS: Section[] = [
  { id: 'study', name: 'SSC Study', icon: '📚', tags: ['maths', 'reasoning', 'english', 'gs'] },
  { id: 'tech', name: 'Tech Stack', icon: '💻', tags: ['java', 'python', 'web', 'dsa'] },
  { id: 'health', name: 'Health', icon: '💪', tags: [] },
  { id: 'routine', name: 'Routine', icon: '⏱️', tags: [] }
];

function App() {
  // --- Auth State ---
  const [user, setUser] = useState<{uid: string, name: string | null, phone: string | null} | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginStep, setLoginStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let name = currentUser.displayName;
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        const data = docSnap.exists() ? docSnap.data() : {};
        if (!name && data.name) {
          name = data.name;
        }
        setUser({ uid: currentUser.uid, name, phone: currentUser.phoneNumber });
        if (!name) setLoginStep('name');
        
        if (data.sections) {
          setSections(data.sections);
        } else {
          await setDoc(doc(db, "users", currentUser.uid), { sections: DEFAULT_SECTIONS }, { merge: true });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Task State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeTab, setActiveTab] = useState<'overview' | TaskType>('overview');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState<number | ''>('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('study');
  const [newTaskTag, setNewTaskTag] = useState<string>('maths');

  const [showManageSections, setShowManageSections] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  // --- Timer State ---
  const [focusHours, setFocusHours] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [showNotification, setShowNotification] = useState<{title: string, message: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<number | null>(null);

  // --- Ambient Noise ---
  const [isPlayingNoise, setIsPlayingNoise] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleAmbientNoise = () => {
    if (isPlayingNoise) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(e => console.log('Audio play failed', e));
    }
    setIsPlayingNoise(!isPlayingNoise);
  };

  // --- Screenshot State ---
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // --- Date State ---
  const getLocalYYYYMMDD = (d: Date) => {
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };
  const todayStr = getLocalYYYYMMDD(new Date());
  const [selectedViewDate, setSelectedViewDate] = useState(todayStr);

  // Sync tasks from Firestore
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }
    const q = collection(db, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach(doc => {
        fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(fetchedTasks);
    });
    return () => unsubscribe();
  }, [user]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio play failed', e));
            } catch(e) {}
            
            setShowNotification({
              title: timerMode === 'focus' ? "🎉 Session Complete!" : "📚 Break Over!",
              message: timerMode === 'focus' 
                ? "Great job staying disciplined! Time to take a well-deserved break."
                : "Your break is complete. Let's get back to it!"
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timerMode]);

  const toggleTimer = () => setIsRunning(!isRunning);
  


  const switchMode = (mode: 'focus' | 'break') => {
    setIsRunning(false);
    setTimerMode(mode);
    setTimeLeft(mode === 'focus' ? (focusHours * 60 + focusMinutes) * 60 : breakMinutes * 60);
  };

  const saveTimerSettings = (h: number, m: number, b: number) => {
    setFocusHours(h);
    setFocusMinutes(m);
    setBreakMinutes(b);
    setShowTimerSettings(false);
    setIsRunning(false);
    setTimeLeft(timerMode === 'focus' ? (h * 60 + m) * 60 : b * 60);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  // Screenshot logic
  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.autoplay = true;
        videoRef.current = video;
      }
      videoRef.current.srcObject = stream;
      setIsScreenShared(true);
      
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenShared(false);
      };
    } catch (err) {
      console.error("Error sharing screen: ", err);
      alert("Could not start screen tracking. Please allow permissions.");
    }
  };

  const stopScreenCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScreenShared(false);
  };

  const captureScreenshot = useCallback(() => {
    if (!videoRef.current || !isScreenShared) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      setScreenshots(prev => [dataUrl, ...prev].slice(0, 50));
    }
  }, [isScreenShared]);

  useEffect(() => {
    if (isRunning && timerMode === 'focus' && isScreenShared) {
      const captureInterval = setInterval(() => {
        captureScreenshot();
      }, 1800000);
      return () => clearInterval(captureInterval);
    }
  }, [isRunning, timerMode, isScreenShared, captureScreenshot]);

  useEffect(() => {
    return () => stopScreenCapture();
  }, []);

  // Task Actions
  const toggleTask = async (id: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (task) {
      await updateDoc(doc(db, "users", user.uid, "tasks", id), {
        completed: !task.completed
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert("Please enter a Task Title");
      return;
    }
    if (!user) return;
    
    try {
      const id = Date.now().toString();
      const currentSection = sections.find(s => s.id === newTaskType);
      const hasTags = currentSection && currentSection.tags && currentSection.tags.length > 0;
      await setDoc(doc(db, "users", user.uid, "tasks", id), {
        title: newTaskTitle,
        completed: false,
        type: newTaskType,
        tag: hasTags ? newTaskTag : null,
        duration: newTaskDuration === '' ? null : Number(newTaskDuration),
        date: selectedViewDate,
      });
      
      setNewTaskTitle('');
      setNewTaskDuration('');
    } catch (err: any) {
      console.error(err);
      alert("Error adding task: " + err.message);
    }
  };

  // Auth Rendering
  if (authLoading) {
    return <div className="app-container" style={{ display: 'grid', placeContent: 'center', minHeight: '100vh', color: 'white' }}>Loading...</div>;
  }

  if (!user || (user && !user.name)) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <h1>Study Tracker</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {loginStep === 'phone' && "Sign in to continue"}
            {loginStep === 'otp' && "Enter the OTP sent to your number"}
            {loginStep === 'name' && "What should we call you?"}
          </p>

          {loginStep === 'phone' && (
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if (phoneInput.length < 10) return;
              try {
                if (!(window as any).recaptchaVerifier) {
                  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
                }
                const formattedPhone = phoneInput.startsWith('+') ? phoneInput : `+91${phoneInput}`;
                const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
                setConfirmationResult(result);
                setLoginStep('otp');
              } catch (error: any) {
                console.error("OTP Error:", error);
                alert('Firebase Error: ' + (error.message || 'Check console for details'));
                if ((window as any).recaptchaVerifier) {
                  try { (window as any).recaptchaVerifier.clear(); (window as any).recaptchaVerifier = null; } catch(e) {}
                }
              }
            }}>
              <div style={{ display: 'flex', marginBottom: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                <span style={{ padding: '0.75rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>+91</span>
                <input type="tel" placeholder="Mobile Number" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} required autoFocus style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', outline: 'none' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Send OTP</button>
            </form>
          )}

          {loginStep === 'otp' && (
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if (!confirmationResult) return;
              try { await confirmationResult.confirm(otpInput); } catch (error) { alert('Invalid OTP'); }
            }}>
              <input type="text" placeholder="6-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value)} required maxLength={6} autoFocus style={{ width: '100%', textAlign: 'center', letterSpacing: '4px', padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '0.75rem', color: 'white', marginBottom: '1rem', outline: 'none' }} />
              <button className="btn-primary" style={{ width: '100%' }}>Verify</button>
              <button type="button" onClick={() => setLoginStep('phone')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', fontSize: '0.85rem' }}>Back</button>
            </form>
          )}

          {loginStep === 'name' && (
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if (!auth.currentUser || !nameInput) return;
              try {
                await updateProfile(auth.currentUser, { displayName: nameInput });
                await setDoc(doc(db, "users", auth.currentUser.uid), { name: nameInput }, { merge: true });
                setUser(prev => prev ? { ...prev, name: nameInput } : null);
              } catch(err) { console.error(err); }
            }}>
              <input type="text" placeholder="Your Name" value={nameInput} onChange={e => setNameInput(e.target.value)} required autoFocus style={{ width: '100%', textAlign: 'center', padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '0.75rem', color: 'white', marginBottom: '1rem', outline: 'none' }} />
              <button className="btn-primary" style={{ width: '100%' }}>Get Started</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Filter Tasks
  const displayTasks = tasks.filter(t => (activeTab === 'overview' || t.type === activeTab) && (t.date === selectedViewDate || (!t.date && selectedViewDate === todayStr)));
  const completedCount = displayTasks.filter(t => t.completed).length;
  const progressPercentage = displayTasks.length === 0 ? 0 : Math.round((completedCount / displayTasks.length) * 100);

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="user-profile">
          <div className="avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h2>{user.name}</h2>
            <p>Student</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          {sections.map(section => (
            <button key={section.id} className={`nav-item ${activeTab === section.id ? 'active' : ''}`} onClick={() => setActiveTab(section.id)}>
              <span style={{ marginRight: '8px', fontSize: '1.1rem' }}>{section.icon}</span> {section.name}
            </button>
          ))}
          <button className="nav-item" onClick={() => setShowManageSections(true)} style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            <Plus size={18} /> Manage Sections
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button 
            onClick={async () => { if(confirm('Logout?')) { await signOut(auth); setLoginStep('phone'); setOtpInput(''); setPhoneInput(''); setNameInput(''); } }} 
            className="nav-item" style={{ width: '100%' }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header-top">
          <div className="greeting">
            <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user.name?.split(' ')[0]}</h1>
            <p>Here's your agenda for {selectedViewDate === todayStr ? 'today' : 'this date'}.</p>
          </div>
          <div className="date-picker-btn">
            <Calendar size={16} color="var(--accent)" />
            {selectedViewDate === todayStr 
              ? 'Today' 
              : new Date(selectedViewDate.split('-')[0] + '/' + selectedViewDate.split('-')[1] + '/' + selectedViewDate.split('-')[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            <input 
              type="date"
              className="date-picker-input"
              value={selectedViewDate}
              onChange={(e) => setSelectedViewDate(e.target.value || todayStr)}
            />
          </div>
        </header>

        {/* Progress Banner */}
        <div className="progress-banner">
          <div className="progress-header">
            <span>Daily Progress</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{completedCount} of {displayTasks.length} Completed</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        {/* Add Task Container */}
        <div className="add-task-container">
          <form onSubmit={addTask}>
            <div className="add-task-row">
              <input 
                type="text" 
                className="form-input" 
                placeholder="What needs to be done?" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <input 
                type="number" 
                className="form-input" 
                placeholder="Mins (Opt)" 
                style={{ flex: '0 0 100px' }}
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="add-task-row" style={{ marginBottom: 0 }}>
              <select className="form-select" value={newTaskType} onChange={(e) => {
                const val = e.target.value;
                setNewTaskType(val);
                const selectedSection = sections.find(s => s.id === val);
                if (selectedSection && selectedSection.tags && selectedSection.tags.length > 0) {
                  setNewTaskTag(selectedSection.tags[0]);
                } else {
                  setNewTaskTag('');
                }
              }}>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.icon} {sec.name}</option>
                ))}
              </select>
              
              {(sections.find(s => s.id === newTaskType)?.tags || []).length > 0 && (
                <select className="form-select" value={newTaskTag} onChange={(e) => setNewTaskTag(e.target.value)}>
                  {sections.find(s => s.id === newTaskType)?.tags.map(tag => (
                    <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
                  ))}
                </select>
              )}
              
              <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>
                <Plus size={18} /> Add Task
              </button>
            </div>
          </form>
        </div>

        {/* Task List */}
        <div className="task-list-section">
          <h3 className="task-list-header">
            {activeTab === 'overview' ? 'All Tasks' : (sections.find(s => s.id === activeTab)?.name || activeTab) + ' Tasks'}
          </h3>
          
          {displayTasks.length === 0 ? (
            <div className="empty-state">No tasks to show for this view. Enjoy your free time!</div>
          ) : (
            <div className="task-list">
              {displayTasks.map(task => (
                <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                  <div className="task-left">
                    <input 
                      type="checkbox" 
                      className="checkbox" 
                      checked={task.completed} 
                      onChange={() => toggleTask(task.id)} 
                    />
                    <div>
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        {task.tag && <span className={`task-tag tag-${task.tag}`}>{task.tag}</span>}
                        {task.duration && <span>{task.duration} mins</span>}
                        {activeTab === 'overview' && <span style={{ textTransform: 'capitalize' }}>• {sections.find(s => s.id === task.type)?.name || task.type}</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* RIGHT WIDGET PANEL */}
      <aside className="right-panel">
        
        {/* Pomodoro Timer Widget */}
        <div className="widget-card">
          <div className="widget-header">
            Focus Timer
            <button className="btn-icon" onClick={() => setShowTimerSettings(!showTimerSettings)} style={{ padding: '0.25rem' }}>
              <Settings size={16} />
            </button>
          </div>
          
          {showTimerSettings ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <input type="number" className="form-input" style={{ padding: '0.5rem' }} value={focusHours} onChange={(e) => setFocusHours(Number(e.target.value))} placeholder="Hrs" min={0} />
                 <input type="number" className="form-input" style={{ padding: '0.5rem' }} value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value))} placeholder="Min" min={0} />
               </div>
               <button className="btn-primary" onClick={() => saveTimerSettings(focusHours, focusMinutes, breakMinutes)} style={{ padding: '0.5rem' }}>Save</button>
             </div>
          ) : (
            <>
              <div className={`timer-display-circle ${isRunning ? 'running' : ''}`}>
                <div className="timer-mode-pill">{timerMode}</div>
                <div className="time-text">{formatTime(timeLeft)}</div>
              </div>
              
              <div className="timer-controls-row">
                <button className="timer-btn-round" onClick={() => switchMode(timerMode === 'focus' ? 'break' : 'focus')} title="Switch Mode">
                  <RotateCcw size={18} />
                </button>
                <button className="timer-btn-round play" onClick={toggleTimer}>
                  {isRunning ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className="timer-btn-round" onClick={toggleAmbientNoise} style={{ color: isPlayingNoise ? 'var(--accent)' : 'inherit', borderColor: isPlayingNoise ? 'var(--accent)' : 'var(--border)' }}>
                  <Headphones size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats Widget */}
        <div className="widget-card">
          <div className="widget-header">Your Stats</div>
          <div className="stat-item">
            <div className="stat-icon"><Flame size={20} /></div>
            <div>
              <div className="stat-value">12</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon" style={{ color: 'var(--success)' }}><BookOpen size={20} /></div>
            <div>
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Tasks Done Today</div>
            </div>
          </div>
        </div>

        {/* Tracking Widget */}
        <div className="widget-card">
          <div className="widget-header">Screen Tracking</div>
          <div className="tracking-status">
            <div className={`status-dot ${isScreenShared ? 'active' : 'inactive'}`}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isScreenShared ? 'Active tracking' : 'Not tracking'}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isScreenShared ? (
              <button className="btn-primary" onClick={startScreenCapture} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                <Camera size={16} /> Enable
              </button>
            ) : (
              <button className="btn-primary" onClick={stopScreenCapture} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', background: 'var(--danger)' }}>
                Stop
              </button>
            )}
            {screenshots.length > 0 && (
              <button className="btn-primary" onClick={() => setShowScreenshotModal(true)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <ImageIcon size={16} />
              </button>
            )}
          </div>
        </div>
        
      </aside>

      {/* Modals */}
      {showNotification && (
        <div className="modal-overlay" onClick={() => setShowNotification(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>{showNotification.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{showNotification.message}</p>
            <button className="btn-primary" onClick={() => { setShowNotification(null); switchMode(timerMode === 'focus' ? 'break' : 'focus'); }} style={{ width: '100%' }}>
              Continue
            </button>
          </div>
        </div>
      )}
      
      {showScreenshotModal && (
        <div className="modal-overlay" onClick={() => setShowScreenshotModal(false)}>
          <div className="modal-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Tracking Evidence</h2>
              <button className="btn-icon" onClick={() => setShowScreenshotModal(false)}><X size={20} /></button>
            </div>
            <div className="screenshot-grid">
              {screenshots.map((src, i) => <img key={i} src={src} className="screenshot-item" alt="screen" />)}
            </div>
          </div>
        </div>
      )}

      {showManageSections && (
        <div className="modal-overlay" onClick={() => setShowManageSections(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Manage Sections</h2>
              <button className="btn-icon" onClick={() => setShowManageSections(false)}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {sections.map(sec => (
                <div key={sec.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{sec.icon}</span>
                    <span>{sec.name}</span>
                  </div>
                  <button className="btn-icon" onClick={async () => {
                    if (sections.length === 1) {
                      alert("You must have at least one section.");
                      return;
                    }
                    if (confirm(`Delete section "${sec.name}"? Tasks in this section will not be deleted but might not display correctly.`)) {
                      const newSections = sections.filter(s => s.id !== sec.id);
                      setSections(newSections);
                      if (user) {
                        await setDoc(doc(db, "users", user.uid), { sections: newSections }, { merge: true });
                      }
                      if (activeTab === sec.id) setActiveTab('overview');
                      if (newTaskType === sec.id) setNewTaskType(newSections[0].id);
                    }
                  }}>
                    <Trash2 size={16} color="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="New section name" 
                className="form-input" 
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={async () => {
                if (!newSectionName.trim()) return;
                const newId = newSectionName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                if (sections.some(s => s.id === newId)) {
                  alert("A section with a similar name already exists.");
                  return;
                }
                const newSec: Section = {
                  id: newId,
                  name: newSectionName,
                  icon: '📁',
                  tags: []
                };
                const newSections = [...sections, newSec];
                setSections(newSections);
                setNewSectionName('');
                if (user) {
                  await setDoc(doc(db, "users", user.uid), { sections: newSections }, { merge: true });
                }
              }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
