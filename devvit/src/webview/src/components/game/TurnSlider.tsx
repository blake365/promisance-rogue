import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { clsx } from 'clsx';

interface TurnSliderProps {
  maxTurns: number;
  initialValue?: number;
  defaultToMax?: boolean;
  label?: string;
  description?: string;
  extraInfo?: ReactNode;
  onConfirm: (turns: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function TurnSlider({
  maxTurns,
  initialValue,
  defaultToMax = true,
  label = 'Turns',
  description,
  extraInfo,
  onConfirm,
  onCancel,
  disabled,
}: TurnSliderProps) {
  // Default to max turns unless initialValue is explicitly provided
  const [turns, setTurns] = useState(
    initialValue !== undefined ? Math.min(initialValue, maxTurns) : (defaultToMax ? maxTurns : 1)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    if (disabled) return;
    setEditValue(turns.toString());
    setIsEditing(true);
  };

  const endEdit = () => {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setTurns(Math.max(1, Math.min(maxTurns, parsed)));
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      endEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const adjustTurns = useCallback(
    (delta: number) => {
      setTurns((prev) => Math.max(1, Math.min(maxTurns, prev + delta)));
    },
    [maxTurns]
  );

  const setAll = useCallback(() => {
    setTurns(maxTurns);
  }, [maxTurns]);

  const setHalf = useCallback(() => {
    setTurns(Math.max(1, Math.floor(maxTurns / 2)));
  }, [maxTurns]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-display text-lg text-cyan-400">{label}</h3>
        {description && <p className="text-sm text-gray-400">{description}</p>}
      </div>

      {/* Extra Info */}
      {extraInfo && (
        <div className="bg-game-card rounded-lg border border-game-border p-3">
          {extraInfo}
        </div>
      )}

      {/* Value Display */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => adjustTurns(-10)}
          disabled={disabled || turns <= 1}
          className="number-btn text-red-400 disabled:opacity-30"
        >
          -10
        </button>
        <button
          onClick={() => adjustTurns(-1)}
          disabled={disabled || turns <= 1}
          className="number-btn text-red-400 disabled:opacity-30"
        >
          -1
        </button>

        <div className="w-24 text-center cursor-pointer" onClick={startEdit}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={endEdit}
              onKeyDown={handleEditKeyDown}
              min={1}
              max={maxTurns}
              className="w-20 text-center font-stats text-2xl bg-bg-primary border-2 border-accent rounded px-1 py-0.5"
            />
          ) : (
            <div className="font-stats text-3xl text-gold">{turns}</div>
          )}
          <div className="text-xs text-gray-500">/ {maxTurns}</div>
        </div>

        <button
          onClick={() => adjustTurns(1)}
          disabled={disabled || turns >= maxTurns}
          className="number-btn text-green-400 disabled:opacity-30"
        >
          +1
        </button>
        <button
          onClick={() => adjustTurns(10)}
          disabled={disabled || turns >= maxTurns}
          className="number-btn text-green-400 disabled:opacity-30"
        >
          +10
        </button>
      </div>

      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min={1}
          max={maxTurns}
          value={turns}
          onChange={(e) => setTurns(parseInt(e.target.value))}
          disabled={disabled}
          className={clsx(
            'w-full h-3 rounded-full appearance-none cursor-pointer',
            'bg-game-dark border border-game-border',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-300',
            '[&::-webkit-slider-thumb]:shadow-blue-glow',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>

      {/* Quick Buttons */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setTurns(1)}
          disabled={disabled}
          className="btn-secondary btn-md min-h-[44px]"
        >
          Min
        </button>
        <button
          onClick={setHalf}
          disabled={disabled}
          className="btn-secondary btn-md min-h-[44px]"
        >
          Half
        </button>
        <button
          onClick={setAll}
          disabled={disabled}
          className="btn-secondary btn-md min-h-[44px]"
        >
          Max
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="btn-secondary btn-lg flex-1"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(turns)}
          disabled={disabled}
          className="btn-primary btn-lg flex-1"
        >
          Confirm ({turns} {turns === 1 ? 'turn' : 'turns'})
        </button>
      </div>
    </div>
  );
}

// Compact inline version for simpler use cases
export function TurnInput({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        className="number-btn w-10 h-10 text-red-400 disabled:opacity-30"
      >
        -
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.max(1, Math.min(max, v)));
        }}
        disabled={disabled}
        className="number-input w-16"
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="number-btn w-10 h-10 text-green-400 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
