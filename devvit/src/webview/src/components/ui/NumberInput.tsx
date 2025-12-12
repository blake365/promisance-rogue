import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

type PresetType = 'zero' | 'quarter' | 'half' | 'threeQuarter' | 'max';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  steps?: number[];
  presets?: PresetType[];
  showMax?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  label?: string;
}

const PRESET_LABELS: Record<PresetType, string> = {
  zero: 'Zero',
  quarter: '25%',
  half: 'Half',
  threeQuarter: '75%',
  max: 'Max',
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

function formatStep(step: number): string {
  if (step >= 1000) {
    return (step / 1000) + 'K';
  }
  return step.toString();
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  steps = [1, 10],
  presets = ['zero', 'half', 'max'],
  showMax = true,
  size = 'md',
  disabled = false,
  className,
  label,
}: NumberInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const clampValue = useCallback((val: number) => {
    return Math.max(min, Math.min(max, Math.floor(val)));
  }, [min, max]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(value.toString());
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEndEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const adjustValue = (delta: number) => {
    if (disabled) return;
    onChange(clampValue(value + delta));
  };

  const handlePreset = (preset: PresetType) => {
    if (disabled) return;
    switch (preset) {
      case 'zero':
        onChange(min);
        break;
      case 'quarter':
        onChange(clampValue(Math.floor(max * 0.25)));
        break;
      case 'half':
        onChange(clampValue(Math.floor(max * 0.5)));
        break;
      case 'threeQuarter':
        onChange(clampValue(Math.floor(max * 0.75)));
        break;
      case 'max':
        onChange(max);
        break;
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'w-10 h-10 text-sm',
      display: 'text-xl min-w-[80px]',
      preset: 'px-2 py-1 text-xs',
    },
    md: {
      button: 'w-12 h-12 text-base',
      display: 'text-2xl min-w-[100px]',
      preset: 'px-3 py-2 text-sm',
    },
    lg: {
      button: 'w-14 h-14 text-lg',
      display: 'text-3xl min-w-[120px]',
      preset: 'px-4 py-2 text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {label && (
        <div className="text-label text-center">{label}</div>
      )}

      {/* Main input row: decrease buttons - display - increase buttons */}
      <div className="flex items-center justify-center gap-2">
        {/* Decrease buttons */}
        <div className="flex gap-1">
          {[...steps].reverse().map((step) => (
            <button
              key={`dec-${step}`}
              onClick={() => adjustValue(-step)}
              disabled={disabled || value <= min}
              className={clsx(
                'number-btn',
                sizes.button,
                'text-red-400 hover:text-red-300',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              aria-label={`Decrease by ${step}`}
            >
              -{formatStep(step)}
            </button>
          ))}
        </div>

        {/* Value display / edit field */}
        <div
          className={clsx(
            'text-center cursor-pointer transition-all',
            sizes.display,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={handleStartEdit}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && handleStartEdit()}
          aria-label="Click to edit value"
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEndEdit}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              className={clsx(
                'w-full text-center font-stats bg-bg-primary border-2 border-accent rounded-lg',
                'focus:outline-none',
                sizes.display,
                'py-1'
              )}
            />
          ) : (
            <div className="flex flex-col items-center">
              <span className="font-stats text-accent">
                {formatNumber(value)}
              </span>
              {showMax && (
                <span className="text-xs text-text-muted">
                  / {formatNumber(max)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Increase buttons */}
        <div className="flex gap-1">
          {steps.map((step) => (
            <button
              key={`inc-${step}`}
              onClick={() => adjustValue(step)}
              disabled={disabled || value >= max}
              className={clsx(
                'number-btn',
                sizes.button,
                'text-green-400 hover:text-green-300',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              aria-label={`Increase by ${step}`}
            >
              +{formatStep(step)}
            </button>
          ))}
        </div>
      </div>

      {/* Preset buttons */}
      {presets.length > 0 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              disabled={disabled}
              className={clsx(
                'btn-secondary rounded-md transition-all',
                sizes.preset,
                'min-h-[44px]',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact variant for inline use (like in building rows)
interface CompactNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  showMax?: boolean;
}

export function CompactNumberInput({
  value,
  onChange,
  min = 0,
  max,
  disabled = false,
  showMax = false,
}: CompactNumberInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const clampValue = useCallback((val: number) => {
    return Math.max(min, Math.min(max, Math.floor(val)));
  }, [min, max]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(value.toString());
    setIsEditing(true);
  };

  const handleEndEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEndEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(clampValue(value - 10))}
        disabled={disabled || value <= min}
        className="number-btn w-10 h-10 text-xs text-red-400 disabled:opacity-40"
      >
        -10
      </button>
      <button
        onClick={() => onChange(clampValue(value - 1))}
        disabled={disabled || value <= min}
        className="number-btn w-10 h-10 text-red-400 disabled:opacity-40"
      >
        -
      </button>

      <div
        className="min-w-[60px] text-center cursor-pointer"
        onClick={handleStartEdit}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEndEdit}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            className="w-16 text-center font-stats text-lg bg-bg-primary border border-accent rounded px-1 py-0.5"
          />
        ) : (
          <div className="flex flex-col">
            <span className="font-stats text-xl text-accent">{value}</span>
            {showMax && <span className="text-xs text-text-muted">/ {max}</span>}
          </div>
        )}
      </div>

      <button
        onClick={() => onChange(clampValue(value + 1))}
        disabled={disabled || value >= max}
        className="number-btn w-10 h-10 text-green-400 disabled:opacity-40"
      >
        +
      </button>
      <button
        onClick={() => onChange(clampValue(value + 10))}
        disabled={disabled || value >= max}
        className="number-btn w-10 h-10 text-xs text-green-400 disabled:opacity-40"
      >
        +10
      </button>
    </div>
  );
}
