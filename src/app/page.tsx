"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

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
    <div className="flex h-screen flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-800 border-b border-gray-700 p-4 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-cyan-500">AI Chat</h1>
          {messages.length > 0 && (
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all"
            >
              Share Chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pt-20 pb-32">
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-cyan-600 text-white"
                      : "bg-gray-800 border border-gray-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.urls && message.urls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <p className="text-sm text-gray-400">Sources:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {message.urls.map((url, idx) => (
                          <li key={idx}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-400 hover:text-cyan-300 break-all"
                            >
                              {url}
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
            <div className="text-center text-gray-500">
              {isLoadingShared ? "Loading shared chat..." : "No messages yet"}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-cyan-600 text-white px-5 py-3 rounded-xl hover:bg-cyan-700 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
