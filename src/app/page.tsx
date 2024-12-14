"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Send, Link2, MessageCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system"; // Fix role types
  content: string;
  urls?: string[];
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const initializeChat = async () => {
      // Initialize sessionId
      const storedSessionId = localStorage.getItem("chatSessionId");
      const newSessionId = storedSessionId || uuidv4();
      setSessionId(newSessionId);

      if (!storedSessionId) {
        localStorage.setItem("chatSessionId", newSessionId);
      }

      // Check for shared chat first
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get("share");
      if (sharedId) {
        setIsLoadingShared(true);
        try {
          await loadSharedChat(sharedId, newSessionId);
        } catch (error) {
          console.error("Failed to load shared chat:", error);
          // Fall back to stored messages
          loadStoredMessages();
        } finally {
          setIsLoadingShared(false);
        }
      } else {
        loadStoredMessages();
      }
    };

    const loadStoredMessages = () => {
      try {
        const storedMessages = localStorage.getItem("chatHistory");
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.error("Failed to load stored messages:", error);
      }
    };

    initializeChat();
  }, []);

  // src/app/page.tsx
  const loadSharedChat = async (shareId: string, newSessionId: string) => {
    try {
      // First load shared chat data
      const response = await fetch("/api/chat/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.messages) {
        throw new Error("No messages found in shared chat");
      }

      // Set messages in state
      setMessages(data.messages);

      // Continue conversation with new session
      const continueResponse = await fetch("/api/chat/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId,
          newSessionId,
          messages: data.messages, // Pass messages explicitly
        }),
      });

      if (!continueResponse.ok) {
        throw new Error(`Failed to continue chat: ${continueResponse.status}`);
      }

      // Remove share parameter from URL
      window.history.pushState({}, "", window.location.pathname);

      // Store messages in localStorage
      localStorage.setItem("chatHistory", JSON.stringify(data.messages));

      return data.messages;
    } catch (error) {
      console.error("Failed to load shared chat:", error);
      // Clear invalid share ID from URL
      window.history.pushState({}, "", window.location.pathname);
      throw error;
    }
  };

  // Add to page.tsx
  const handleShare = async () => {
    try {
      const response = await fetch("/api/chat/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const { shareId } = await response.json();

      // Create shareable URL
      const shareUrl = `${window.location.origin}?share=${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          sessionId,
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        role: "assistant",
        content: data.answer,
        urls: data.urls,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get response:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error." },
      ]);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  // TODO: Modify the color schemes, fonts, and UI as needed for a good user experience
  // Refer to the Tailwind CSS docs here: https://tailwindcss.com/docs/customizing-colors, and here: https://tailwindcss.com/docs/hover-focus-and-other-states
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-cyan-400" strokeWidth={2} />
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
              AI Companion
            </h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleShare}
              className="group flex items-center space-x-2 px-4 py-2 bg-slate-700 text-cyan-300 rounded-full hover:bg-slate-600 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <Link2 className="w-5 h-5 group-hover:rotate-6 transition-transform" />
              <span className="font-medium">Share Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto pt-20 pb-36 bg-transparent custom-scrollbar">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                <div
                  className={`relative max-w-[85%] p-4 rounded-2xl shadow-xl transition-all duration-300 ease-in-out ${
                    message.role === "user"
                      ? "bg-gradient-to-tr from-cyan-600 to-blue-700 text-white transform hover:-translate-y-1"
                      : "bg-slate-800 border border-slate-700 text-gray-200 hover:bg-slate-750"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-base">
                    {message.content}
                  </p>
                  {message.urls && message.urls.length > 0 && (
                    <div className="mt-3 border-t border-slate-600/50 pt-2">
                      <p className="text-sm text-gray-400 font-semibold mb-1">
                        Referenced Sources:
                      </p>
                      <ul className="space-y-1">
                        {message.urls.map((url, idx) => (
                          <li key={idx} className="flex items-center">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-300 hover:text-cyan-200 truncate max-w-full transition-colors flex items-center space-x-1"
                            >
                              <Link2 className="w-4 h-4 inline-block" />
                              <span className="underline underline-offset-2">
                                {url}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 italic flex flex-col items-center justify-center h-full space-y-4 mt-20">
              <MessageCircle
                className="w-16 h-16 text-slate-600 opacity-50"
                strokeWidth={1.5}
              />
              <p className="text-lg">
                {isLoadingShared
                  ? "Loading shared chat..."
                  : "Start a conversation"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full rounded-full border border-slate-700 bg-slate-900/60 pl-6 pr-12 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500 transition-all duration-300 ease-in-out"
                disabled={isLoading}
              />
              {input && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                  {input.length}/500
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500 transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <div className="animate-spin">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
