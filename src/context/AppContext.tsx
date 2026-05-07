import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut, type ConfirmationResult, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { Task, Section, UserProfile } from '../types';
import { DEFAULT_SECTIONS } from '../types';

const getLocalYYYYMMDD = (d: Date) => {
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

interface AppContextType {
  user: UserProfile | null;
  authLoading: boolean;
  tasks: Task[];
  sections: Section[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedViewDate: string;
  setSelectedViewDate: (date: string) => void;
  todayStr: string;
  displayTasks: Task[];
  progressPercentage: number;
  completedCount: number;
  streak: number;
  
  addTask: (title: string, duration: number | null, type: string, tag: string | null, priority: 'high' | 'medium' | 'low', scheduledTime?: string | null) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  editTask: (id: string, updates: Partial<Task>) => Promise<void>;
  
  focusHours: number;
  focusMinutes: number;
  breakMinutes: number;
  timeLeft: number;
  isRunning: boolean;
  timerMode: 'focus' | 'break';
  showTimerSettings: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  switchMode: (mode: 'focus' | 'break') => void;
  saveTimerSettings: (h: number, m: number, b: number) => void;
  setShowTimerSettings: (show: boolean) => void;
  formatTime: (seconds: number) => string;
  
  isPlayingNoise: boolean;
  selectedSoundId: string;
  setSelectedSoundId: (id: string) => void;
  toggleAmbientNoise: () => void;
  
  isScreenShared: boolean;
  screenshots: string[];
  showScreenshotModal: boolean;
  setShowScreenshotModal: (show: boolean) => void;
  startScreenCapture: () => Promise<void>;
  stopScreenCapture: () => void;
  
  showManageSections: boolean;
  setShowManageSections: (show: boolean) => void;
  addSection: (name: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  
  notification: { title: string; message: string } | null;
  setNotification: (n: { title: string; message: string } | null) => void;
  
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  
  handleLogin: (phone: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  saveName: (name: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  confirmationResult: ConfirmationResult | null;
  loginStep: 'phone' | 'otp' | 'name';
  setLoginStep: (step: 'phone' | 'otp' | 'name') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const todayStr = getLocalYYYYMMDD(new Date());
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginStep, setLoginStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedViewDate, setSelectedViewDate] = useState(todayStr);
  
  const [showManageSections, setShowManageSections] = useState(false);
  
  const [focusHours, setFocusHours] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<number | null>(null);
  
  const [isPlayingNoise, setIsPlayingNoise] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState('rain');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let name = currentUser.displayName;
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        const data = docSnap.exists() ? docSnap.data() : {};
        if (!name && data.name) name = data.name;
        setUser({ uid: currentUser.uid, name, phone: currentUser.phoneNumber });
        if (!name) setLoginStep('name');
        
        if (data.sections) setSections(data.sections);
        else await setDoc(doc(db, "users", currentUser.uid), { sections: DEFAULT_SECTIONS }, { merge: true });
        
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setTasks([]); return; }
    const q = collection(db, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach(docSnap => {
        fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasks(fetchedTasks);
    });
    return () => unsubscribe();
  }, [user]);

  const displayTasks = tasks.filter(t => 
    (activeTab === 'overview' || t.type === activeTab) && 
    (t.date === selectedViewDate || (!t.date && selectedViewDate === todayStr))
  );
  const completedCount = displayTasks.filter(t => t.completed).length;
  const progressPercentage = displayTasks.length === 0 ? 0 : Math.round((completedCount / displayTasks.length) * 100);

  const calculateStreak = useCallback((): number => {
    const completedTasks = tasks.filter(t => t.completed && t.date);
    if (completedTasks.length === 0) return 0;
    const completedDates = [...new Set(completedTasks.map(t => t.date))].sort().reverse();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const todayStr2 = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (completedDates[0] !== todayStr2 && completedDates[0] !== yesterdayStr) return 0;
    let streak = 1;
    const currentDate = new Date(completedDates[0] === todayStr2 ? today : yesterday);
    for (let i = 1; i < completedDates.length; i++) {
      currentDate.setDate(currentDate.getDate() - 1);
      const expectedStr = currentDate.toISOString().split('T')[0];
      if (completedDates[i] === expectedStr) streak++;
      else if (completedDates[i] !== completedDates[i - 1]) break;
    }
    return streak;
  }, [tasks]);

  const streak = calculateStreak();

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {});
            } catch {
              /* audio play failed */
            }
            setNotification({
              title: timerMode === 'focus' ? "Session Complete!" : "Break Over!",
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const sounds = [
        { id: 'rain', url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3' },
        { id: 'forest', url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_3499563947.mp3?filename=forest-birds-11070.mp3' },
        { id: 'waves', url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c8a73467.mp3?filename=relaxing-mountains-rivers-18775.mp3' },
        { id: 'night', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_8ed59c3477.mp3?filename=night-crickets-11337.mp3' },
        { id: 'cafe', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=restaurant-ambience-19382.mp3' }
      ];
      const sound = sounds.find(s => s.id === selectedSoundId);
      if (sound && audioRef.current.src !== sound.url) {
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.pause();
        audioRef.current.src = sound.url;
        audioRef.current.load();
        if (wasPlaying) audioRef.current.play().catch(() => {});
      }
    }
  }, [selectedSoundId]);

  const toggleAmbientNoise = () => {
    if (isPlayingNoise) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(() => {});
    }
    setIsPlayingNoise(!isPlayingNoise);
  };

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
      stream.getVideoTracks()[0].onended = () => setIsScreenShared(false);
    } catch {
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
      const captureInterval = setInterval(() => captureScreenshot(), 1800000);
      return () => clearInterval(captureInterval);
    }
  }, [isRunning, timerMode, isScreenShared, captureScreenshot]);

  useEffect(() => { return () => stopScreenCapture(); }, []);

  const toggleTask = async (id: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === id);
    if (task) await updateDoc(doc(db, "users", user.uid, "tasks", id), { completed: !task.completed });
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  };

  const editTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "tasks", id), updates);
  };

  const addTask = async (title: string, duration: number | null, type: string, tag: string | null, priority: 'high' | 'medium' | 'low', scheduledTime?: string | null) => {
    if (!title.trim()) { alert("Please enter a Task Title"); return; }
    if (!user) return;
    try {
      const id = Date.now().toString();
      const currentSection = sections.find(s => s.id === type);
      const hasTags = currentSection && currentSection.tags && currentSection.tags.length > 0;
      await setDoc(doc(db, "users", user.uid, "tasks", id), {
        title, completed: false, type, tag: hasTags ? tag : null, duration,
        date: selectedViewDate, priority, notes: '', time: scheduledTime || null
      });
    } catch (err: any) {
      alert("Error adding task: " + err.message);
    }
  };

  const addSection = async (name: string) => {
    if (!name.trim() || !user) return;
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (sections.some(s => s.id === newId)) { alert("Section already exists."); return; }
    const newSec: Section = { id: newId, name, icon: '📁', tags: [] };
    const newSections = [...sections, newSec];
    setSections(newSections);
    await setDoc(doc(db, "users", user.uid), { sections: newSections }, { merge: true });
  };

  const deleteSection = async (id: string) => {
    if (sections.length === 1) { alert("You must have at least one section."); return; }
    if (!user) return;
    const newSections = sections.filter(s => s.id !== id);
    setSections(newSections);
    await setDoc(doc(db, "users", user.uid), { sections: newSections }, { merge: true });
    if (activeTab === id) setActiveTab('overview');
  };

  const handleLogin = async (phone: string) => {
    if (phone.length < 10) return;
    try {
      const w = window as unknown as Record<string, unknown>;
      if (!w.recaptchaVerifier) {
        w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, w.recaptchaVerifier as RecaptchaVerifier);
      setConfirmationResult(result);
      setLoginStep('otp');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Check console for details';
      alert('Firebase Error: ' + msg);
      const w = window as unknown as Record<string, { clear: () => void } | null>;
      if (w.recaptchaVerifier) {
        try { w.recaptchaVerifier?.clear(); w.recaptchaVerifier = null; } catch {
          /* clear failed */
        }
      }
    }
  };

  const verifyOTP = async (otp: string) => {
    if (!confirmationResult) return;
    try { await confirmationResult.confirm(otp); } catch { alert('Invalid OTP'); }
  };

  const saveName = async (name: string) => {
    if (!auth.currentUser || !name) return;
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await setDoc(doc(db, "users", auth.currentUser.uid), { name }, { merge: true });
      setUser(prev => prev ? { ...prev, name } : null);
    } catch {
      /* save name failed */
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLoginStep('phone');
    setMobileMenuOpen(false);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('darkMode', JSON.stringify(next));
      if (user) setDoc(doc(db, "users", user.uid), { darkMode: next }, { merge: true }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  const value: AppContextType = {
    user, authLoading, tasks, sections, activeTab, setActiveTab,
    selectedViewDate, setSelectedViewDate, todayStr, displayTasks,
    progressPercentage, completedCount, streak,
    addTask, toggleTask, deleteTask, editTask,
    focusHours, focusMinutes, breakMinutes, timeLeft, isRunning, timerMode,
    showTimerSettings, toggleTimer, resetTimer, switchMode, saveTimerSettings,
    setShowTimerSettings, formatTime,
    isPlayingNoise, selectedSoundId, setSelectedSoundId, toggleAmbientNoise,
    isScreenShared, screenshots, showScreenshotModal, setShowScreenshotModal,
    startScreenCapture, stopScreenCapture,
    showManageSections, setShowManageSections, addSection, deleteSection,
    notification, setNotification,
    darkMode, toggleDarkMode,
    mobileMenuOpen, setMobileMenuOpen,
    handleLogin, verifyOTP, saveName, handleLogout,
    confirmationResult, loginStep, setLoginStep,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
