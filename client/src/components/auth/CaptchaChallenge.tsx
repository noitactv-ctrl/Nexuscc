import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeCaptcha() {
  return Array.from({ length: 5 }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join("");
}

export function useCaptcha() {
  const [code, setCode] = useState(makeCaptcha);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => {
    setCode(makeCaptcha());
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(timer);
  }, []);

  return { code, tick, refresh };
}

export function CaptchaChallenge({
  code,
  tick,
  value,
  onChange,
  onRefresh,
  disabled,
}: {
  code: string;
  tick: number;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const width = 128;
  const height = 44;
  const cellWidth = width / code.length;

  return (
    <div className="spider-captcha" aria-label="Human verification">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Verification code">
        <rect width={width} height={height} rx="7" fill="#202020" />
        {Array.from({ length: 5 }, (_, index) => (
          <line
            key={`line-${index}-${tick}`}
            x1={randomInt(0, width)}
            y1={randomInt(0, height)}
            x2={randomInt(0, width)}
            y2={randomInt(0, height)}
            stroke="#8e3035"
            strokeWidth="1"
            opacity=".6"
          />
        ))}
        {code.split("").map((character, index) => {
          const x = cellWidth * index + cellWidth / 2 + randomInt(-2, 2);
          const y = height / 2 + randomInt(-3, 3);
          const rotation = randomInt(-16, 16);
          return (
            <text
              key={`${character}-${index}`}
              x={x}
              y={y}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize={randomInt(20, 26)}
              fill="#f5f5f5"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
              transform={`rotate(${rotation},${x},${y})`}
            >
              {character}
            </text>
          );
        })}
      </svg>
      <input
        className="spider-captcha-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Verification code"
        autoComplete="off"
        aria-label="Enter the verification code"
        disabled={disabled}
        data-testid="input-captcha"
      />
      <button
        className="spider-captcha-refresh"
        type="button"
        onClick={onRefresh}
        aria-label="Refresh verification code"
        data-testid="btn-refresh-captcha"
      >
        <RefreshCw aria-hidden="true" />
      </button>
    </div>
  );
}
