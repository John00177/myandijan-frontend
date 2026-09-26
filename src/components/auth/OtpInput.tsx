import { motion } from "framer-motion";
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useShouldAnimate } from "../../lib/motion-config";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length: number;
  /** Renders the boxes in the error state and shakes them once on each new error. */
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmented one-time-code input.
 *
 * The digits live in the parent as a single string; each box is a view onto one
 * index of it. Padding to a fixed length rather than trimming keeps index N
 * addressable even when N-1 is still blank, so filling boxes out of order (which
 * happens constantly with autofill) can't shift digits left into the wrong slot.
 */
export default function OtpInput({ value, onChange, length, error = false, autoFocus = false }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldAnimate = useShouldAnimate();

  function commit(chars: string[]) {
    // Trailing blanks are dropped so `value.length` still reports how many
    // digits have actually been entered, which is what submit-enabling reads.
    onChange(chars.join("").replace(/\s+$/, ""));
  }

  function charsOf(): string[] {
    return value.padEnd(length, " ").slice(0, length).split("");
  }

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = charsOf();
    chars[index] = digit || " ";
    commit(chars);

    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = charsOf();
      if (chars[index] !== " ") {
        // Clear the current box and stay put — one backspace, one digit gone.
        chars[index] = " ";
        commit(chars);
        return;
      }
      if (index > 0) {
        // Already empty: step back AND clear, so holding backspace walks the
        // code away instead of stalling on an empty box.
        chars[index - 1] = " ";
        commit(chars);
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <motion.div
      className="flex justify-between gap-2"
      onPaste={handlePaste}
      // Keyed on the error flag so a repeated wrong code shakes again rather
      // than animating once and sitting still for every attempt after it.
      key={error ? "otp-error" : "otp-idle"}
      animate={error && shouldAnimate ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
      transition={{ duration: 0.4 }}
    >
      {Array.from({ length }).map((_, i) => {
        const char = value[i];
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={char && char !== " " ? char : ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            // Lets iOS/Android offer the SMS code straight from the notification,
            // and is what the WebOTP API keys off.
            autoComplete="one-time-code"
            aria-label={`${i + 1}-raqam`}
            aria-invalid={error || undefined}
            autoFocus={autoFocus && i === 0}
            maxLength={1}
            className={`h-14 w-full max-w-[52px] rounded-xl border-2 bg-elevated text-center text-xl font-bold text-ink outline-none transition-colors focus:ring-4 ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-white/[0.10] focus:border-primary focus:ring-primary/20"
            }`}
          />
        );
      })}
    </motion.div>
  );
}
