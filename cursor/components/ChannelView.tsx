"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string;
  _creationTime: number;
}

interface ChannelViewProps {
  channelId: string;
  workspaceId: string;
  user: User;
}

export default function ChannelView({
  channelId,
  workspaceId,
  user,
}: ChannelViewProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channel = useQuery(api.channelFunctions.getChannel, {
    channelId: channelId as Id<"channels">,
  });
  const messages = useQuery(api.messageFunctions.getChannelMessages, {
    channelId: channelId as Id<"channels">,
  });
  const sendMessage = useMutation(api.messageFunctions.sendMessage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage({
        channelId: channelId as Id<"channels">,
        content: message.trim(),
        messageType: "text",
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-indigo-600 border-b-2" />
          <p className="mt-4 text-gray-500">Loading channel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Channel Header */}
      <div className="border-gray-200 border-b px-6 py-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{channel.isPrivate ? "🔒" : "#"}</span>
          <div>
            <h1 className="font-semibold text-gray-900 text-lg">
              {channel.name}
            </h1>
            {channel.description && (
              <p className="text-gray-500 text-sm">{channel.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages?.map((msg: any) => (
          <div className="flex space-x-3" key={msg._id}>
            <div className="flex-shrink-0">
              {msg.author.image ? (
                <img
                  alt={msg.author.name || "User"}
                  className="h-8 w-8 rounded-full"
                  src={msg.author.image}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500">
                  <span className="font-medium text-sm text-white">
                    {(msg.author.name || msg.author.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline space-x-2">
                <h4 className="font-medium text-gray-900 text-sm">
                  {msg.author.name || msg.author.email || "User"}
                </h4>
                <span className="text-gray-500 text-xs">
                  {formatTime(msg.createdAt)}
                </span>
                {msg.editedAt && (
                  <span className="text-gray-400 text-xs">(edited)</span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-gray-700 text-sm">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-gray-200 border-t px-6 py-4">
        <form className="flex space-x-3" onSubmit={handleSendMessage}>
          <div className="flex-1">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message ${channel.name}`}
              type="text"
              value={message}
            />
          </div>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!message.trim()}
            type="submit"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
