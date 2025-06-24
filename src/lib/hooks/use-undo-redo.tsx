"use client";

import { useRef, useCallback } from "react";

interface UndoAction {
  doWithData(): void;
  undoWithData(): void;
}

interface UndoStack {
  past: UndoAction[];
  future: UndoAction[];
  push<T extends unknown[]>(
    doFn: (...args: T) => void,
    undoFn: (...args: T) => void,
    ...withArgumentsToClone: T
  ): void;
  undo(): void;
  redo(): void;
  undoAvailable: boolean;
  redoAvailable: boolean;
  clear(): boolean;
}

function createUndoStack(): UndoStack {
  const past: UndoAction[] = [];
  const future: UndoAction[] = [];

  return {
    past,
    future,
    push<T extends unknown[]>(
      doFn: (...args: T) => void,
      undoFn: (...args: T) => void,
      ...withArgumentsToClone: T
    ) {
      const clonedArgs = structuredClone(withArgumentsToClone) as T;
      const action: UndoAction = {
        doWithData() {
          doFn(...clonedArgs);
        },
        undoWithData() {
          undoFn(...clonedArgs);
        },
      };
      action.doWithData();

      // Adding a new action wipes the redoable steps
      past.push(action);
      future.length = 0;
    },
    undo() {
      const action = past.pop();
      if (action) {
        action.undoWithData();
        future.unshift(action);
      }
    },
    redo() {
      const action = future.shift();
      if (action) {
        action.doWithData();
        past.push(action);
      }
    },
    get undoAvailable() {
      return past.length > 0;
    },
    get redoAvailable() {
      return future.length > 0;
    },
    clear() {
      past.length = 0;
      future.length = 0;
      return true;
    },
  };
}

export interface UseUndoStackReturn {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  undoAvailable: boolean;
  redoAvailable: boolean;
  pushAction: <T extends unknown[]>(
    doFn: (...args: T) => void,
    undoFn: (...args: T) => void,
    ...args: T
  ) => void;
  pushManualAction: (doFn: () => void, undoFn: () => void) => void;
}

export function useUndoStack(): UseUndoStackReturn {
  const undoStackRef = useRef<UndoStack>(createUndoStack());

  const undo = useCallback(() => {
    undoStackRef.current.undo();
  }, []);

  const redo = useCallback(() => {
    undoStackRef.current.redo();
  }, []);

  const clear = useCallback(() => {
    undoStackRef.current.clear();
  }, []);

  const pushAction = useCallback(
    <T extends unknown[]>(
      doFn: (...args: T) => void,
      undoFn: (...args: T) => void,
      ...args: T
    ) => {
      undoStackRef.current.push(doFn, undoFn, ...args);
    },
    []
  );

  const pushManualAction = useCallback(
    (doFn: () => void, undoFn: () => void) => {
      const action: UndoAction = {
        doWithData: doFn,
        undoWithData: undoFn,
      };

      // Manually add to past without executing (for text input)
      undoStackRef.current.past.push(action);
      undoStackRef.current.future.length = 0;
    },
    []
  );

  return {
    undo,
    redo,
    clear,
    undoAvailable: undoStackRef.current.undoAvailable,
    redoAvailable: undoStackRef.current.redoAvailable,
    pushAction,
    pushManualAction,
  };
}
