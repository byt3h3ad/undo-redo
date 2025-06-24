"use client";

import type React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Undo2, Redo2, RotateCcw } from "lucide-react";
import { useUndoStack } from "@/lib/hooks/use-undo-redo";

export default function Editor() {
  const [text, setText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const {
    undo,
    redo,
    clear: clearUndoStack,
    undoAvailable,
    redoAvailable,
    pushAction,
    pushManualAction,
  } = useUndoStack();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUndoRedoOperation = useRef(false);
  const historyRef = useRef<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedText = localStorage.getItem("textbox-content");
      const savedHistory = localStorage.getItem("textbox-history");

      const initialText = savedText || "";
      setText(initialText);

      if (savedHistory) {
        try {
          const history = JSON.parse(savedHistory) as string[];
          historyRef.current = history;

          // Reconstruct undo stack from history
          if (history.length > 1) {
            for (let i = 1; i < history.length; i++) {
              const newText = history[i];
              const oldText = history[i - 1];

              pushAction(
                (text: string) => {
                  isUndoRedoOperation.current = true;
                  setText(text);
                  isUndoRedoOperation.current = false;
                },
                (text: string) => {
                  isUndoRedoOperation.current = true;
                  setText(text);
                  isUndoRedoOperation.current = false;
                },
                newText,
                oldText
              );
            }
          }
        } catch (error) {
          console.error("Failed to parse history from localStorage:", error);
          historyRef.current = [initialText];
        }
      } else {
        historyRef.current = [initialText];
      }

      setIsLoaded(true);
    }
  }, [pushAction]);

  // Save to localStorage whenever text changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("textbox-content", text);
    }
  }, [text, isLoaded]);

  const saveHistoryToStorage = useCallback((history: string[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("textbox-history", JSON.stringify(history));
    }
  }, []);

  const updateText = useCallback(
    (newText: string, oldText: string) => {
      if (isUndoRedoOperation.current) {
        // Don't create undo actions for undo/redo operations themselves
        setText(newText);
        return;
      }

      // First, update the text state normally
      setText(newText);

      // Update history
      const newHistory = [...historyRef.current, newText];
      historyRef.current = newHistory;
      saveHistoryToStorage(newHistory);

      // Create an action for undo/redo (but don't execute it immediately)
      pushManualAction(
        () => {
          isUndoRedoOperation.current = true;
          setText(newText);
          isUndoRedoOperation.current = false;
        },
        () => {
          isUndoRedoOperation.current = true;
          setText(oldText);
          isUndoRedoOperation.current = false;
        }
      );
    },
    [saveHistoryToStorage, pushManualAction]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const oldText = text;
    updateText(newText, oldText);
  };

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleClear = useCallback(() => {
    const oldText = text;
    setText("");

    // Clear history and save to localStorage
    const newHistory = [""];
    historyRef.current = newHistory;
    saveHistoryToStorage(newHistory);

    clearUndoStack();
    // Add the clear action to the stack so it can be undone
    pushAction(
      () => {
        isUndoRedoOperation.current = true;
        setText("");
        isUndoRedoOperation.current = false;
      },
      (text: string) => {
        isUndoRedoOperation.current = true;
        setText(text);
        isUndoRedoOperation.current = false;
        // Restore history when undoing clear
        const restoredHistory = [...historyRef.current, text];
        historyRef.current = restoredHistory;
        saveHistoryToStorage(restoredHistory);
      },
      "",
      oldText
    );
  }, [text, saveHistoryToStorage, clearUndoStack, pushAction]);

  const handleClearStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("textbox-content");
      localStorage.removeItem("textbox-history");
      const defaultText =
        "Type something here to test undo/redo functionality...";
      setText(defaultText);
      historyRef.current = [defaultText];
      clearUndoStack();
    }
  }, [clearUndoStack]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Don't render until loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Textbox with Typed Undo/Redo Hook & Local Storage
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={!undoAvailable}
                className="bg-white text-black"
              >
                <Undo2 className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={!redoAvailable}
                className="bg-white text-black"
              >
                <Redo2 className="w-4 h-4 mr-1" />
                Redo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="bg-white text-black"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Start typing to test undo/redo functionality..."
            className="min-h-[200px] resize-none"
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <strong>Keyboard shortcuts:</strong>
            </p>
            <p>• Ctrl+Z (or Cmd+Z): Undo</p>
            <p>• Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y/Cmd+Shift+Z): Redo</p>
            <p className="mt-2">
              <strong>Status:</strong> Undo:{" "}
              {undoAvailable ? "Available" : "Not available"} | Redo:{" "}
              {redoAvailable ? "Available" : "Not available"}
            </p>
            <p className="mt-2">
              <strong>Storage:</strong> Content and history are automatically
              saved to localStorage
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearStorage}
              className="mt-2 bg-white text-black"
            >
              Clear Storage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
