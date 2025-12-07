// hooks/useProgress.ts
"use client";

import { useState, useCallback, useRef } from "react";

type ProgressState = {
  progress: number;
  message?: string;
  isCancelled: boolean;
};

export function useProgress() {
  const [state, setState] = useState<ProgressState>({
    progress: 0,
    message: undefined,
    isCancelled: false,
  });
  const cancelRef = useRef<(() => void) | null>(null);

  const start = useCallback((message?: string) => {
    setState({
      progress: 0,
      message,
      isCancelled: false,
    });
  }, []);

  const update = useCallback((progress: number, message?: string) => {
    setState((prev) => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message ?? prev.message,
    }));
  }, []);

  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      progress: 100,
    }));
    setTimeout(() => {
      setState({
        progress: 0,
        message: undefined,
        isCancelled: false,
      });
    }, 500);
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCancelled: true,
    }));
    if (cancelRef.current) {
      cancelRef.current();
    }
  }, []);

  const setCancelHandler = useCallback((handler: () => void) => {
    cancelRef.current = handler;
  }, []);

  const reset = useCallback(() => {
    setState({
      progress: 0,
      message: undefined,
      isCancelled: false,
    });
    cancelRef.current = null;
  }, []);

  return {
    progress: state.progress,
    message: state.message,
    isCancelled: state.isCancelled,
    start,
    update,
    complete,
    cancel,
    setCancelHandler,
    reset,
  };
}

