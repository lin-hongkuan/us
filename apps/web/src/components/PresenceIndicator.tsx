import React from 'react';
import { UserType } from '../types';
import { usePresenceStatus } from '../hooks/usePresenceStatus';
import { PresenceBurst } from './PresenceBurst';
import { PresenceCard } from './PresenceCard';

interface PresenceIndicatorProps {
  currentUser: UserType | null;
  darkMode?: boolean;
}

const PRESENCE_ANIMATION_STYLES = `
        .pr-burst-glow-1 {
          animation: _prGlow1 1.6s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow1 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(4.5); opacity: 0; }
        }

        .pr-burst-glow-2 {
          animation: _prGlow2 1.3s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow2 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        .pr-burst-glow-3 {
          animation: _prGlow3 0.9s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow3 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .pr-burst-particle {
          animation: _prBurst 2.2s cubic-bezier(0.15, 0.85, 0.3, 1) both;
        }
        @keyframes _prBurst {
          0% {
            opacity: 0;
            transform: rotate(var(--pr-angle,0deg)) translateY(0) scale(0) rotate(0deg);
          }
          10% {
            opacity: 1;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-0.3)) scale(calc(var(--pr-size,1)*1.2)) rotate(calc(var(--pr-spin,0deg)*0.3));
          }
          75% {
            opacity: 0.9;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-0.9)) scale(var(--pr-size,1)) rotate(calc(var(--pr-spin,0deg)*0.8));
          }
          100% {
            opacity: 0;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-1)) scale(0) rotate(var(--pr-spin,0deg));
          }
        }

        .pr-glow-pulse {
          animation: _prGlowPulse 3s ease-in-out infinite;
        }
        @keyframes _prGlowPulse {
          0%,100% { opacity: 0.45; transform: scale(1); }
          50%     { opacity: 0.75; transform: scale(1.06); }
        }

        .pr-border-spin {
          animation: _prBorderSpin 4s linear infinite;
        }
        @keyframes _prBorderSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .pr-card-float {
          animation: _prFloat 4s ease-in-out infinite;
        }
        @keyframes _prFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }

        .pr-nudge-left {
          animation: _prNudgeL 2.8s ease-in-out infinite;
        }
        @keyframes _prNudgeL {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(2px); }
        }

        .pr-nudge-right {
          animation: _prNudgeR 2.8s ease-in-out infinite;
        }
        @keyframes _prNudgeR {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(-2px); }
        }

        .pr-heart-beat {
          animation: _prHeartBeat 1.2s ease-in-out infinite;
        }
        @keyframes _prHeartBeat {
          0%,100% { transform: scale(1); }
          15%     { transform: scale(1.3); }
          30%     { transform: scale(0.95); }
          45%     { transform: scale(1.25); }
          60%     { transform: scale(1); }
        }

        .pr-ring-pulse {
          animation: _prRingPulse 2.6s ease-in-out infinite;
        }
        @keyframes _prRingPulse {
          0%,100% { opacity: 0.25; transform: scale(1); }
          50%     { opacity: 0.55; transform: scale(1.18); }
        }

        .pr-twinkle {
          animation: _prTwinkle 2s ease-in-out infinite;
        }
        @keyframes _prTwinkle {
          0%,100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50%     { opacity: 0.45; transform: scale(0.75) rotate(180deg); }
        }

        .pr-particle {
          animation: _prParticle 3s ease-in-out infinite;
        }
        @keyframes _prParticle {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          15%  { opacity: 0.8; transform: translateY(-8px) scale(1); }
          100% { transform: translateY(-55px) scale(0); opacity: 0; }
        }
      `;

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = React.memo(({
  currentUser,
  darkMode = false,
}) => {
  const {
    available,
    partnerUser,
    isVisible,
    message,
    showBurst,
    isGoodbye,
    dismiss,
  } = usePresenceStatus(currentUser);

  if (!available || !currentUser) return null;

  return (
    <>
      {showBurst && <PresenceBurst />}
      <PresenceCard
        currentUser={currentUser}
        partnerUser={partnerUser}
        darkMode={darkMode}
        isVisible={isVisible}
        isGoodbye={isGoodbye}
        message={message}
        onDismiss={dismiss}
      />
      <style>{PRESENCE_ANIMATION_STYLES}</style>
    </>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

export default PresenceIndicator;
