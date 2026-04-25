// ============================================================
//  TypingIndicator.tsx
//  Animated three-dot "bot is thinking" indicator.
//  Displayed in the message list while isTyping === true.
// ============================================================

export default function TypingIndicator() {
  return (
    <div className="typing-dots">
      {/* Three dots with staggered animation delays via inline style */}
      <span className="typing-dot" />
      <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
      <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}