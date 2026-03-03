'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Snackbar } from 'react-native-paper';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { countNewQueueMovements } from '@/lib/movements';

const STORAGE_KEY_PREFIX = 'sismovbe:lastSeenQueueAt:';
const POLL_INTERVAL_MS = 60_000;

type QueueNotificationContextType = {
  badgeCount: number;
  markAsSeen: () => Promise<void>;
};

const QueueNotificationContext = createContext<QueueNotificationContextType | null>(null);

export function useQueueNotification() {
  const ctx = useContext(QueueNotificationContext);
  return ctx;
}

export function QueueNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [badgeCount, setBadgeCount] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const prevCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTech = profile?.role === 'TECH';

  const getStorageKey = useCallback(() => {
    return user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;
  }, [user?.id]);

  const markAsSeen = useCallback(async () => {
    const key = getStorageKey();
    if (!key) return;
    const now = new Date().toISOString();
    try {
      await AsyncStorage.setItem(key, now);
    } catch {
      // silenciar
    }
    prevCountRef.current = 0;
    setBadgeCount(0);
  }, [getStorageKey]);

  useEffect(() => {
    if (!isTech || !user?.id) return;

    const key = getStorageKey();
    if (!key) return;

    const poll = async () => {
      let lastSeenAt: string;
      try {
        const stored = await AsyncStorage.getItem(key);
        lastSeenAt = stored ?? new Date().toISOString();
      } catch {
        return;
      }

      const { count, error } = await countNewQueueMovements(lastSeenAt);
      if (error) return;

      if (count > 0) {
        const prev = prevCountRef.current;
        prevCountRef.current = count;
        setBadgeCount(count);
        if (count > prev) {
          setSnackbarMessage(`Novas solicitações na fila: ${count}`);
          setSnackbarVisible(true);
        }
      } else {
        prevCountRef.current = 0;
        setBadgeCount(0);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTech, user?.id, getStorageKey]);

  const value: QueueNotificationContextType = {
    badgeCount,
    markAsSeen,
  };

  return (
    <QueueNotificationContext.Provider value={value}>
      {children}
      {isTech && (
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
          }}
          duration={4000}
        >
          {snackbarMessage}
        </Snackbar>
      )}
    </QueueNotificationContext.Provider>
  );
}
