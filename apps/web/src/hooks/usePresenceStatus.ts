import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserType } from '../types';
import {
  cleanupPresence,
  initPresence,
  isPresenceAvailable,
  subscribeToPresence,
} from '../services/presenceService';

const SWEET_MESSAGES = [
  '对方也正在想你噢',
  'TA 也在看呢~',
  '你们同时在线啦',
  '心有灵犀一点通',
  '思念是双向的哦',
  '不约而同地想起了对方',
  '此刻你们在一起',
  '两颗心在同一个频率',
];

const GOODBYE_MESSAGES = [
  'TA 暂时离开了',
  '对方去忙了，记得想 TA 哦',
  'TA 下线了，但心还在',
  '暂别片刻，思念不减',
];

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const randomItem = (items: string[]): string => items[Math.floor(Math.random() * items.length)];

export const usePresenceStatus = (currentUser: UserType | null) => {
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerUser, setPartnerUser] = useState<UserType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [message, setMessage] = useState(SWEET_MESSAGES[0]);
  const [showBurst, setShowBurst] = useState(false);
  const [isGoodbye, setIsGoodbye] = useState(false);
  const dismissTimeoutRef = useRef<number | null>(null);
  const goodbyeTimeoutRef = useRef<number | null>(null);
  const burstTimeoutRef = useRef<number | null>(null);
  const heartAudioCtxRef = useRef<AudioContext | null>(null);
  const hasPlayedSound = useRef(false);
  const wasOnlineRef = useRef(false);
  const lastPartnerUserRef = useRef<UserType | null>(null);
  const available = useMemo(() => isPresenceAvailable(), []);

  const playHeartSound = useCallback(() => {
    const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!heartAudioCtxRef.current || heartAudioCtxRef.current.state === 'closed') {
        heartAudioCtxRef.current = new AudioContextClass();
      }

      const ctx = heartAudioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const note = (freq: number, t: number, dur: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        oscillator.start(t);
        oscillator.stop(t + dur);
      };

      note(523, now, 0.15);
      note(659, now + 0.12, 0.2);
      note(784, now + 0.25, 0.3);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !available) return;

    hasPlayedSound.current = false;
    wasOnlineRef.current = false;
    lastPartnerUserRef.current = null;
    setPartnerOnline(false);
    setPartnerUser(null);
    setIsGoodbye(false);
    setIsDismissed(false);

    initPresence(currentUser).catch(() => {});

    const unsubscribe = subscribeToPresence((online, user) => {
      setPartnerOnline(online);

      if (online) {
        if (user) {
          lastPartnerUserRef.current = user;
          setPartnerUser(user);
        }

        if (!hasPlayedSound.current) {
          setMessage(randomItem(SWEET_MESSAGES));
          setIsGoodbye(false);
          playHeartSound();
          hasPlayedSound.current = true;
          setShowBurst(true);
          if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
          burstTimeoutRef.current = window.setTimeout(() => setShowBurst(false), 2800);
          setIsDismissed(false);
        }

        wasOnlineRef.current = true;
        return;
      }

      if (wasOnlineRef.current) {
        const goodbyePartner = user ?? lastPartnerUserRef.current;
        setPartnerUser(goodbyePartner);
        setMessage(randomItem(GOODBYE_MESSAGES));
        setIsGoodbye(true);
        setIsDismissed(false);
        hasPlayedSound.current = false;
        wasOnlineRef.current = false;
        if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
        goodbyeTimeoutRef.current = window.setTimeout(() => {
          setIsDismissed(true);
          setPartnerUser(null);
          lastPartnerUserRef.current = null;
        }, 3500);
        return;
      }

      setPartnerUser(null);
      lastPartnerUserRef.current = null;
      hasPlayedSound.current = false;
    });

    return () => {
      unsubscribe();
      cleanupPresence();
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
      lastPartnerUserRef.current = null;
    };
  }, [available, currentUser, playHeartSound]);

  useEffect(() => {
    if ((partnerOnline || isGoodbye) && !isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 120);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
  }, [partnerOnline, isDismissed, isGoodbye]);

  useEffect(() => () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
    if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    const audioCtx = heartAudioCtxRef.current;
    if (audioCtx && audioCtx.state !== 'closed') {
      void audioCtx.close();
    }
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = window.setTimeout(() => setIsDismissed(true), 500);
  };

  return {
    available,
    partnerUser,
    isVisible,
    message,
    showBurst,
    isGoodbye,
    dismiss,
  };
};
