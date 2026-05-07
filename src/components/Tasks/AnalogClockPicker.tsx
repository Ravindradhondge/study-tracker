import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Check, X } from 'lucide-react';

interface AnalogClockPickerProps {
  value: string;
  onChange: (time: string) => void;
}

type Mode = 'hour' | 'minute';

export default function AnalogClockPicker({ value, onChange }: AnalogClockPickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('hour');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [isDragging, setIsDragging] = useState(false);
  const clockRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setAmpm(h >= 12 ? 'PM' : 'AM');
      setSelectedHour(h % 12 || 12);
      setSelectedMinute(m);
    } else {
      const now = new Date();
      const h = now.getHours();
      setAmpm(h >= 12 ? 'PM' : 'AM');
      setSelectedHour(h % 12 || 12);
      setSelectedMinute(Math.round(now.getMinutes() / 5) * 5 % 60);
    }
  }, [open, value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const getAngleFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!clockRef.current) return 0;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const handleClockInteraction = useCallback((clientX: number, clientY: number) => {
    const angle = getAngleFromPoint(clientX, clientY);

    if (mode === 'hour') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      if (hour > 12) hour = 12;
      setSelectedHour(hour);
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;
      // Snap to nearest 5
      minute = Math.round(minute / 5) * 5;
      if (minute === 60) minute = 0;
      setSelectedMinute(minute);
    }
  }, [mode, getAngleFromPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleClockInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleClockInteraction(e.clientX, e.clientY);
    }
  }, [isDragging, handleClockInteraction]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hour') {
        setTimeout(() => setMode('minute'), 200);
      }
    }
  }, [isDragging, mode]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    handleClockInteraction(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      handleClockInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hour') {
        setTimeout(() => setMode('minute'), 200);
      }
    }
  };

  const handleConfirm = () => {
    let h24 = selectedHour % 12;
    if (ampm === 'PM') h24 += 12;
    const timeStr = `${h24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeStr);
    setOpen(false);
    setMode('hour');
  };

  const handleCancel = () => {
    setOpen(false);
    setMode('hour');
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
    setMode('hour');
  };

  // Calculate hand angle
  const getHandAngle = () => {
    if (mode === 'hour') {
      return (selectedHour % 12) * 30;
    }
    return selectedMinute * 6;
  };

  const handAngle = getHandAngle();

  // Format display
  const formatDisplay = () => {
    if (!value) return '--:--';
    const [h, m] = value.split(':').map(Number);
    const hour12 = h % 12 || 12;
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${m.toString().padStart(2, '0')} ${ap}`;
  };

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="analog-clock-picker-container" ref={pickerRef}>
      <button
        type="button"
        className="clock-trigger-btn"
        onClick={() => setOpen(!open)}
        title="Pick a time"
      >
        <Clock size={16} />
        <span className="clock-trigger-text">{formatDisplay()}</span>
      </button>

      {open && (
        <div className="clock-picker-dropdown">
          {/* Time Display Header */}
          <div className="clock-picker-header">
            <button
              type="button"
              className={`clock-time-segment ${mode === 'hour' ? 'active' : ''}`}
              onClick={() => setMode('hour')}
            >
              {selectedHour.toString().padStart(2, '0')}
            </button>
            <span className="clock-time-colon">:</span>
            <button
              type="button"
              className={`clock-time-segment ${mode === 'minute' ? 'active' : ''}`}
              onClick={() => setMode('minute')}
            >
              {selectedMinute.toString().padStart(2, '0')}
            </button>
            <div className="ampm-toggle">
              <button
                type="button"
                className={`ampm-btn ${ampm === 'AM' ? 'active' : ''}`}
                onClick={() => setAmpm('AM')}
              >
                AM
              </button>
              <button
                type="button"
                className={`ampm-btn ${ampm === 'PM' ? 'active' : ''}`}
                onClick={() => setAmpm('PM')}
              >
                PM
              </button>
            </div>
          </div>

          {/* Clock Face */}
          <div
            className="clock-face"
            ref={clockRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Clock hand */}
            <div
              className="clock-hand-container"
              style={{ transform: `rotate(${handAngle}deg)` }}
            >
              <div className="clock-hand-line" />
              <div className="clock-hand-dot" />
            </div>
            <div className="clock-center-dot" />

            {/* Numbers */}
            {mode === 'hour'
              ? hours.map((h, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const radius = 90;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <button
                      key={h}
                      type="button"
                      className={`clock-number ${selectedHour === h ? 'selected' : ''}`}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHour(h);
                        setTimeout(() => setMode('minute'), 200);
                      }}
                    >
                      {h}
                    </button>
                  );
                })
              : minutes.map((m, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const radius = 90;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`clock-number ${selectedMinute === m ? 'selected' : ''}`}
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMinute(m);
                      }}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
          </div>

          {/* Mode indicator */}
          <div className="clock-mode-label">
            {mode === 'hour' ? 'Select Hour' : 'Select Minutes'}
          </div>

          {/* Actions */}
          <div className="clock-picker-actions">
            <button type="button" className="clock-action-btn clear" onClick={handleClear}>
              Clear
            </button>
            <div className="clock-action-right">
              <button type="button" className="clock-action-btn cancel" onClick={handleCancel}>
                <X size={14} /> Cancel
              </button>
              <button type="button" className="clock-action-btn confirm" onClick={handleConfirm}>
                <Check size={14} /> Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
