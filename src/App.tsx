import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Clock, Dumbbell, Flame, Plus, 
  Trash2, Play, Pause, RotateCcw, Calendar,
  CheckCircle2, Sparkles, Settings, X, Camera, Image as ImageIcon,
  ChevronLeft, ChevronRight, LogOut, Headphones, AlignLeft
} from 'lucide-react';
import { auth, db } from './firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut, type ConfirmationResult, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import './index.css';

type TaskType = 'study' | 'routine' | 'health' | 'tech';

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

const INITIAL_TASKS: Task[] = [
  // SSC Study Tasks
  { id: '1', title: 'Quantitative Aptitude (Maths): Percentages', completed: false, type: 'study', tag: 'maths', duration: 60 },
  { id: '2', title: 'General Intelligence & Reasoning: Mock Test', completed: false, type: 'study', tag: 'reasoning', duration: 45 },
  { id: '3', title: 'English Comprehension: 20 New Vocab Words', completed: false, type: 'study', tag: 'english', duration: 30 },
  { id: '4', title: 'General Awareness (GS): Read Daily Current Affairs', completed: false, type: 'study', tag: 'gs', duration: 30 },
  
  // Tech Study Tasks
  { id: '100', title: 'Java: Object Oriented Programming', completed: false, type: 'tech', tag: 'java', duration: 60 },
  { id: '101', title: 'Web Dev: Build a React Component', completed: false, type: 'tech', tag: 'web', duration: 90 },
  
  // Health & Wellness
  { id: '5', title: 'Morning Workout or Yoga', completed: false, type: 'health', duration: 30 },
  { id: '6', title: 'Drink 3 Liters of Water', completed: false, type: 'health' },
  { id: '7', title: 'Sleep 7-8 Hours', completed: false, type: 'health' },
  { id: '8', title: '15 mins Meditation / Deep Breathing', completed: false, type: 'health', duration: 15 },
  
  // Daily Routine
  { id: '9', title: 'Review Daily Goals', completed: false, type: 'routine', duration: 10 },
  { id: '10', title: 'Read 10 pages of a non-fiction book', completed: false, type: 'routine', duration: 20 },
  { id: '11', title: 'Organize Study Desk', completed: false, type: 'routine', duration: 15 },
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
        if (!name) {
           const docSnap = await getDoc(doc(db, "users", currentUser.uid));
           if (docSnap.exists() && docSnap.data().name) {
             name = docSnap.data().name;
           }
        }
        setUser({ uid: currentUser.uid, name, phone: currentUser.phoneNumber });
        if (!name) setLoginStep('name');
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Task State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState<number | ''>('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('study');
  const [newTaskTag, setNewTaskTag] = useState<string>('maths');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // --- Timer State ---
  const [focusHours, setFocusHours] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [showNotification, setShowNotification] = useState<{title: string, message: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
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

  // --- UI State ---
  const [studyTab, setStudyTab] = useState<'ssc' | 'tech'>('ssc');

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
  
  const [newTaskDate, setNewTaskDate] = useState<string>(todayStr);
  const [newTaskTime, setNewTaskTime] = useState<string>('');
  const [selectedViewDate, setSelectedViewDate] = useState<string>(todayStr);

  const changeViewDate = (days: number) => {
    const [y, m, d] = selectedViewDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + days);
    setSelectedViewDate(getLocalYYYYMMDD(dateObj));
  };

  // Save tasks -> Sync tasks from Firestore
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
            
            // Play notification sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio play failed', e));
            } catch(e) {}
            
            setShowNotification({
              title: timerMode === 'focus' ? "🎉 Well Done!" : "📚 Break's Over!",
              message: timerMode === 'focus' 
                ? "You completed your focus session. Great job staying disciplined! Time to take a well-deserved break."
                : "Your break is complete. Let's get back to studying. You've got this!"
            });
            return 0; // Timer ended
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
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timerMode === 'focus' ? (focusHours * 60 + focusMinutes) * 60 : breakMinutes * 60);
  };

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
      // Capture screenshot every 30 minutes
      const captureInterval = setInterval(() => {
        captureScreenshot();
      }, 1800000); // 30 minutes in milliseconds
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

  const clearCompleted = async () => {
    if (!user) return;
    const completed = tasks.filter(t => t.completed);
    for (const t of completed) {
      await deleteDoc(doc(db, "users", user.uid, "tasks", t.id));
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert("Please enter a Task Title in the top input box!");
      return;
    }
    if (!user) return;
    
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "users", user.uid, "tasks", id), {
        title: newTaskTitle,
        completed: false,
        type: newTaskType,
        tag: (newTaskType === 'study' || newTaskType === 'tech') ? newTaskTag : null,
        duration: newTaskDuration === '' ? null : Number(newTaskDuration),
        date: newTaskDate || null,
        time: newTaskTime || null,
        priority: newTaskPriority,
        notes: newTaskNotes,
      });
      
      setNewTaskTitle('');
      setNewTaskDuration('');
      setNewTaskTime('');
      setNewTaskNotes('');
      setNewTaskPriority('medium');
      
      if (newTaskDate) {
        setSelectedViewDate(newTaskDate);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error adding task: " + err.message);
    }
  };

  const viewTasks = tasks.filter(t => (t.date || todayStr) === selectedViewDate);
  const studyTasks = viewTasks.filter(t => t.type === 'study');
  const techTasks = viewTasks.filter(t => t.type === 'tech');
  const healthTasks = viewTasks.filter(t => t.type === 'health');
  const routineTasks = viewTasks.filter(t => t.type === 'routine');

  const completedCount = viewTasks.filter(t => t.completed).length;
  const progressPercentage = viewTasks.length === 0 ? 0 : Math.round((completedCount / viewTasks.length) * 100);

  if (authLoading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'white' }}>Loading...</div>;
  }

  if (!user || (user && !user.name)) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        
        <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', zIndex: 10 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            Study Tracker <Sparkles size={24} color="var(--accent)" />
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {loginStep === 'phone' && "Enter your mobile number to continue"}
            {loginStep === 'otp' && "Enter the OTP sent to your number"}
            {loginStep === 'name' && "What should we call you?"}
          </p>

          {loginStep === 'phone' && (
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if (phoneInput.length < 10) return;
              try {
                if (!(window as any).recaptchaVerifier) {
                  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible'
                  });
                }
                
                const formattedPhone = phoneInput.startsWith('+') ? phoneInput : `+91${phoneInput}`;
                const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
                setConfirmationResult(result);
                setLoginStep('otp');
              } catch (error: any) {
                console.error("OTP Error:", error);
                alert('Firebase Error: ' + (error.message || 'Check console for details'));
                // Reset recaptcha if there's an error so the user can try again
                if ((window as any).recaptchaVerifier) {
                  try {
                    (window as any).recaptchaVerifier.clear();
                    (window as any).recaptchaVerifier = null;
                  } catch(e) {}
                }
              }
            }}>
              <div className="input-group" style={{ marginBottom: '1.5rem', display: 'flex', background: 'rgba(0,0,0,0.2)', padding: 0 }}>
                <span style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', borderRadius: '1rem 0 0 1rem' }}>+91</span>
                <input 
                  type="tel" 
                  className="input" 
                  placeholder="Mobile Number" 
                  value={phoneInput} 
                  onChange={e => setPhoneInput(e.target.value)} 
                  required 
                  autoFocus
                  style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', color: 'white' }}
                />
              </div>
              <button type="submit" className="btn btn-add" style={{ width: '100%', padding: '0.8rem', fontSize: '1.1rem' }}>Send OTP</button>
            </form>
          )}

          {loginStep === 'otp' && (
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              if (!confirmationResult) return;
              try {
                await confirmationResult.confirm(otpInput);
              } catch (error) {
                console.error(error);
                alert('Invalid OTP');
              }
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="6-digit OTP" 
                  value={otpInput} 
                  onChange={e => setOtpInput(e.target.value)} 
                  required 
                  maxLength={6}
                  autoFocus
                  style={{ width: '100%', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '1rem', color: 'white' }}
                />
              </div>
              <button className="btn btn-add" style={{ width: '100%', padding: '0.8rem', fontSize: '1.1rem' }}>Verify</button>
              <button type="button" onClick={() => setLoginStep('phone')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>Back to Phone</button>
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
              } catch(err) {
                console.error(err);
              }
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Your Name" 
                  value={nameInput} 
                  onChange={e => setNameInput(e.target.value)} 
                  required 
                  autoFocus
                  style={{ width: '100%', textAlign: 'center', fontSize: '1.1rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '1rem', color: 'white' }}
                />
              </div>
              <button className="btn btn-add" style={{ width: '100%', padding: '0.8rem', fontSize: '1.1rem' }}>Get Started</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Background animated blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="dashboard">
        {/* TOP HEADER */}
        <header className="header glass-panel">
          <div className="header-content">
            <div className="title-section">
              <div className="date-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                <button onClick={() => changeViewDate(-1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '50%', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(0,242,254,0.2)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><ChevronLeft size={16} /></button>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '110px', justifyContent: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontWeight: 700 }}>
                    <Calendar size={14} /> 
                    {selectedViewDate === todayStr 
                      ? 'TODAY' 
                      : new Date(selectedViewDate.split('-')[0] + '/' + selectedViewDate.split('-')[1] + '/' + selectedViewDate.split('-')[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                  <input 
                    type="date"
                    value={selectedViewDate}
                    onChange={(e) => setSelectedViewDate(e.target.value || todayStr)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <button onClick={() => changeViewDate(1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '50%', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(0,242,254,0.2)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><ChevronRight size={16} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>{user.name}'s Planner <Sparkles className="sparkle-icon" size={28} style={{ marginLeft: '0.5rem' }} /></h1>
                <button 
                  onClick={async () => { if(confirm('Logout?')) { await signOut(auth); setLoginStep('phone'); setOtpInput(''); setPhoneInput(''); setNameInput(''); } }} 
                  className="btn-clear"
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.8rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'var(--text-secondary)'
                  }}
                  title="Logout"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
              <p>Design your day. Execute your vision.</p>
            </div>

            {/* Pomodoro Timer Widget */}
            <div className="timer-widget" style={{ position: 'relative' }}>
              {!showTimerSettings && (
                <button 
                  onClick={() => setShowTimerSettings(true)}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
                  title="Timer Settings"
                >
                  <Settings size={14} />
                </button>
              )}

              {showTimerSettings ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Timer Settings</span>
                    <button onClick={() => setShowTimerSettings(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Hours</label>
                      <input type="number" className="input" style={{ width: '50px', padding: '0.4rem', fontSize: '0.9rem', textAlign: 'center' }} value={focusHours} onChange={(e) => setFocusHours(Number(e.target.value))} min={0} max={12} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Mins</label>
                      <input type="number" className="input" style={{ width: '50px', padding: '0.4rem', fontSize: '0.9rem', textAlign: 'center' }} value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value))} min={0} max={59} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Break</label>
                      <input type="number" className="input" style={{ width: '50px', padding: '0.4rem', fontSize: '0.9rem', textAlign: 'center' }} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} min={1} max={60} />
                    </div>
                  </div>
                  <button className="btn" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => saveTimerSettings(focusHours, focusMinutes, breakMinutes)}>Save</button>
                </div>
              ) : (
                <>
                  <div className="timer-modes">
                    <button 
                      className={`timer-mode-btn ${timerMode === 'focus' ? 'active' : ''}`}
                      onClick={() => switchMode('focus')}
                    >Focus</button>
                    <button 
                      className={`timer-mode-btn ${timerMode === 'break' ? 'active' : ''}`}
                      onClick={() => switchMode('break')}
                    >Break</button>
                  </div>
                  <div className="timer-display">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="timer-controls">
                    <button className="timer-btn primary" onClick={toggleTimer}>
                      {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="timer-btn secondary" onClick={resetTimer}>
                      <RotateCcw size={18} />
                    </button>
                    <button 
                      className={`timer-btn secondary ${isPlayingNoise ? 'active' : ''}`} 
                      onClick={toggleAmbientNoise}
                      title="Play Focus Rain Sounds"
                      style={{ background: isPlayingNoise ? 'rgba(0, 242, 254, 0.2)' : '' }}
                    >
                      <Headphones size={18} color={isPlayingNoise ? 'var(--accent)' : 'inherit'} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Stats & Tracking */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '200px' }}>
              {/* Stats */}
              <div className="stats-card" style={{ width: '100%' }}>
                <Flame className="stats-icon" />
                <div className="stats-info">
                  <h3>12</h3>
                  <p>Day Streak</p>
                </div>
              </div>

              {/* Tracking Widget */}
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Screen Tracking</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {!isScreenShared ? (
                    <button onClick={startScreenCapture} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Camera size={14} /> Enable
                    </button>
                  ) : (
                    <button onClick={stopScreenCapture} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--success)', color: 'black', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Camera size={14} /> Active
                    </button>
                  )}
                  {screenshots.length > 0 && (
                    <button onClick={() => setShowScreenshotModal(true)} className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ImageIcon size={14} /> ({screenshots.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PROGRESS BAR */}
        <div className="progress-section glass-panel">
          <div className="flex-between">
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} color="var(--success)" /> Today's Progress ({progressPercentage}%)
            </h2>
            <span>{completedCount} / {viewTasks.length} Completed</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        <form onSubmit={addTask} className="input-section glass-panel" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group" style={{ flexWrap: 'wrap', width: '100%' }}>
            <Plus size={20} className="input-icon" color="var(--text-secondary)" style={{ display: 'none' }} />
            <input 
              type="text" 
              className="input mobile-full" 
              placeholder="Task Title (Required)" 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              style={{ flex: '1 1 200px', paddingLeft: '1rem', borderLeft: '2px solid var(--accent)' }}
            />
            <input 
              type="date"
              className="input mobile-full mobile-center"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              style={{ flex: '1 1 130px', padding: '0.5rem', cursor: 'pointer' }}
            />
            <input 
              type="time"
              className="input mobile-full mobile-center"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
              style={{ flex: '1 1 100px', padding: '0.5rem', cursor: 'pointer' }}
            />
            <input 
              type="number" 
              className="input mobile-full mobile-center" 
              placeholder="Mins" 
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ flex: '0 1 80px', textAlign: 'center' }}
              min={1}
            />
            <select 
              className="select-input mobile-full" 
              value={newTaskType}
              onChange={(e) => {
                const val = e.target.value as TaskType;
                setNewTaskType(val);
                if (val === 'study') setNewTaskTag('maths');
                else if (val === 'tech') setNewTaskTag('java');
              }}
              style={{ flex: '1 1 130px' }}
            >
              <option value="study">📚 SSC Study</option>
              <option value="tech">💻 Tech Study</option>
              <option value="routine">⏱️ Routine</option>
              <option value="health">💪 Health</option>
            </select>
            {newTaskType === 'study' && (
              <select 
                className="select-input mobile-full" 
                value={newTaskTag}
                onChange={(e) => setNewTaskTag(e.target.value)}
                style={{ flex: '1 1 120px' }}
              >
                <option value="maths">Maths</option>
                <option value="reasoning">Reasoning</option>
                <option value="english">English</option>
                <option value="gs">GS</option>
              </select>
            )}
            {newTaskType === 'tech' && (
              <select 
                className="select-input mobile-full" 
                value={newTaskTag}
                onChange={(e) => setNewTaskTag(e.target.value)}
                style={{ flex: '1 1 120px' }}
              >
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="web">Web Dev</option>
                <option value="dsa">DSA</option>
              </select>
            )}
          </div>

          <div className="input-group" style={{ flexWrap: 'wrap', width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
            <AlignLeft size={16} color="var(--text-secondary)" style={{ marginLeft: '0.5rem' }} />
            <input 
              type="text" 
              className="input mobile-full" 
              placeholder="Notes, syllabus, or links (Optional)" 
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              style={{ flex: '2 1 200px' }}
            />
            <select 
              className="select-input mobile-full" 
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              style={{ flex: '1 1 120px' }}
            >
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <button type="submit" className="btn btn-add mobile-full" style={{ flex: '1 1 100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '1.05rem', background: 'var(--accent)', color: 'black' }}>Add Task</button>
          </div>
          
          {/* Action Buttons Row */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className="btn-clear" 
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              onClick={() => {
                if(confirm('Are you sure you want to reset all tasks to default? This will delete your current tasks.')) {
                  setTasks(INITIAL_TASKS);
                }
              }}
            >
              Reset Defaults
            </button>

            {completedCount > 0 && (
              <button type="button" className="btn-clear" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={clearCompleted}>
                Clear Completed
              </button>
            )}
          </div>
        </form>

        {/* TASK COLUMNS */}
        <div className="grid">
          {/* Study Section */}
          <div className="card study-card">
            <div className="card-bg-glow"></div>
            <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>
              <BookOpen size={20} /> Study & Learning
            </h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '0.5rem' }}>
              <button 
                className={`timer-mode-btn ${studyTab === 'ssc' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                onClick={() => setStudyTab('ssc')}
              >
                📚 SSC
              </button>
              <button 
                className={`timer-mode-btn ${studyTab === 'tech' ? 'active' : ''}`}
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                onClick={() => setStudyTab('tech')}
              >
                💻 Tech
              </button>
            </div>

            <ul className="task-list">
              {studyTab === 'ssc' && studyTasks.length === 0 && <p className="empty-state">No SSC tasks yet.</p>}
              {studyTab === 'tech' && techTasks.length === 0 && <p className="empty-state">No Tech tasks yet.</p>}
              
              {(studyTab === 'ssc' ? studyTasks : techTasks).map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}>
                  <div className="task-content" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} style={{ marginTop: '0.2rem' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="task-text">{task.title}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {task.time && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                            <Clock size={10} />
                            {task.time}
                          </span>
                        )}
                        {task.duration && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={10} />
                            {task.duration >= 60 ? `${Math.floor(task.duration / 60)}h ${task.duration % 60 > 0 ? (task.duration % 60) + 'm' : ''}` : `${task.duration}m`}
                          </span>
                        )}
                        {task.tag && <span className={`tag tag-${task.tag}`}>{task.tag.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-delete" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Health Section */}
          <div className="card health-card">
            <div className="card-bg-glow"></div>
            <h2 className="card-title">
              <Dumbbell size={20} /> Health & Wellness
            </h2>
            <ul className="task-list">
              {healthTasks.length === 0 && <p className="empty-state">No health tasks yet.</p>}
              {healthTasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}>
                  <div className="task-content" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} style={{ marginTop: '0.2rem' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="task-text">{task.title}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {task.time && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                            <Clock size={10} />
                            {task.time}
                          </span>
                        )}
                        {task.duration && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={10} />
                            {task.duration >= 60 ? `${Math.floor(task.duration / 60)}h ${task.duration % 60 > 0 ? (task.duration % 60) + 'm' : ''}` : `${task.duration}m`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-delete" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Routine Section */}
          <div className="card routine-card">
            <div className="card-bg-glow"></div>
            <h2 className="card-title">
              <Clock size={20} /> Daily Routine
            </h2>
            <ul className="task-list">
              {routineTasks.length === 0 && <p className="empty-state">No routine tasks yet.</p>}
              {routineTasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}>
                  <div className="task-content" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} style={{ marginTop: '0.2rem' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                      <span className="task-text">
                        {task.priority === 'high' && <span title="High Priority" style={{ marginRight: '0.4rem', fontSize: '0.9rem' }}>🔴</span>}
                        {task.priority === 'medium' && <span title="Medium Priority" style={{ marginRight: '0.4rem', fontSize: '0.9rem' }}>🟡</span>}
                        {task.priority === 'low' && <span title="Low Priority" style={{ marginRight: '0.4rem', fontSize: '0.9rem' }}>🟢</span>}
                        {task.title}
                      </span>
                      {task.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0', wordBreak: 'break-word' }}>{task.notes}</p>}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {task.time && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                            <Clock size={10} />
                            {task.time}
                          </span>
                        )}
                        {task.duration && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={10} />
                            {task.duration >= 60 ? `${Math.floor(task.duration / 60)}h ${task.duration % 60 > 0 ? (task.duration % 60) + 'm' : ''}` : `${task.duration}m`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-delete" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Timer Completion Modal */}
      {showNotification && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{showNotification.title}</h2>
            <p className="modal-text">{showNotification.message}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-clear" 
                style={{ flex: 1, padding: '0.75rem', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--text-secondary)' }}
                onClick={() => setShowNotification(null)}
              >
                Dismiss
              </button>
              <button 
                className="btn" 
                style={{ flex: 2, fontSize: '1.1rem', padding: '0.75rem' }}
                onClick={() => {
                  setShowNotification(null);
                  switchMode(timerMode === 'focus' ? 'break' : 'focus');
                }}
              >
                {timerMode === 'focus' ? 'Start Break' : 'Start Focus Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Gallery Modal */}
      {showScreenshotModal && (
        <div className="modal-overlay" onClick={() => setShowScreenshotModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.5rem' }}>Tracking Evidence</h2>
              <button onClick={() => setShowScreenshotModal(false)} className="btn-clear" style={{ padding: '0.5rem', borderRadius: '50%' }}><X size={20} /></button>
            </div>
            {screenshots.length === 0 ? (
              <p className="empty-state">No screenshots captured yet. Start focus session with tracking enabled.</p>
            ) : (
              <div className="screenshot-grid">
                {screenshots.map((src, i) => (
                  <img key={i} src={src} alt={`Screenshot ${i}`} className="screenshot-item" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
