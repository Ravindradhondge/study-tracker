import { useState } from 'react';
import { Settings, Play, Pause, RotateCcw, Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AMBIENT_SOUNDS } from '../../types';

export default function FocusTimer() {
  const { timeLeft, isRunning, timerMode, toggleTimer, switchMode, formatTime, showTimerSettings, setShowTimerSettings, saveTimerSettings, focusHours, focusMinutes, breakMinutes, isPlayingNoise, toggleAmbientNoise, selectedSoundId, setSelectedSoundId } = useApp();
  const [localHours, setLocalHours] = useState(focusHours);
  const [localMinutes, setLocalMinutes] = useState(focusMinutes);
  const [localBreak, setLocalBreak] = useState(breakMinutes);
  const [showSounds, setShowSounds] = useState(false);

  const currentSound = AMBIENT_SOUNDS.find(s => s.id === selectedSoundId);

  return (
    <div className="widget-card">
      <div className="widget-header">
        Focus Timer
        <button className="btn-icon" onClick={() => setShowTimerSettings(!showTimerSettings)}>
          <Settings size={16} />
        </button>
      </div>

      {showTimerSettings ? (
        <div className="timer-settings">
          <div className="settings-row">
            <label>Focus</label>
            <div className="time-inputs">
              <input type="number" className="form-input time-input" value={localHours} onChange={e => setLocalHours(Number(e.target.value))} placeholder="Hrs" min={0} />
              <span>:</span>
              <input type="number" className="form-input time-input" value={localMinutes} onChange={e => setLocalMinutes(Number(e.target.value))} placeholder="Min" min={0} max={59} />
            </div>
          </div>
          <div className="settings-row">
            <label>Break</label>
            <div className="time-inputs">
              <input type="number" className="form-input time-input" value={localBreak} onChange={e => setLocalBreak(Number(e.target.value))} placeholder="Min" min={1} max={30} />
              <span>min</span>
            </div>
          </div>
          <button className="btn-primary btn-full" onClick={() => saveTimerSettings(localHours, localMinutes, localBreak)}>Save</button>
        </div>
      ) : (
        <>
          <div className={`timer-display-circle ${isRunning ? 'running' : ''}`}>
            <div className="timer-mode-pill">{timerMode}</div>
            <div className="time-text">{formatTime(timeLeft)}</div>
          </div>

          <div className="sound-selector">
            <button className="sound-selector-btn" onClick={() => setShowSounds(!showSounds)}>
              <Headphones size={14} /> {currentSound?.name || 'Rain'}
              {showSounds ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showSounds && (
              <div className="sound-dropdown">
                {AMBIENT_SOUNDS.map(sound => (
                  <button key={sound.id} className={`sound-option ${selectedSoundId === sound.id ? 'active' : ''}`} onClick={() => { setSelectedSoundId(sound.id); setShowSounds(false); }}>
                    {sound.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="timer-controls-row">
            <button className="timer-btn-round" onClick={() => switchMode(timerMode === 'focus' ? 'break' : 'focus')} title="Switch Mode">
              <RotateCcw size={18} />
            </button>
            <button className="timer-btn-round play" onClick={toggleTimer}>
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button className={`timer-btn-round ${isPlayingNoise ? 'active' : ''}`} onClick={toggleAmbientNoise} title="Ambient Sound">
              <Headphones size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
