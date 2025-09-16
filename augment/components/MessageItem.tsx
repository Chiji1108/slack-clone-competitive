"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  channelId: Id<"channels">;
  authorId: Id<"users">;
  content: string;
  parentMessageId?: Id<"messages">;
  author: {
    _id: Id<"users">;
    email?: string;
    name?: string;
  };
  replyCount: number;
}

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendMessage = useMutation(api.messages.sendMessage);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await sendMessage({
        channelId: message.channelId,
        content: replyContent.trim(),
        parentMessageId: message._id,
      });
      setReplyContent("");
      setShowReplyForm(false);
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group rounded p-3 hover:bg-gray-50">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 font-medium text-sm text-white">
          {(message.author.name || message.author.email || "U")
            .charAt(0)
            .toUpperCase()}
        </div>

        {/* Message Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {message.author.name || message.author.email || "Unknown User"}
            </span>
            <span className="text-gray-500 text-xs">
              {formatTime(message._creationTime)}
            </span>
          </div>

          {/* Message Text */}
          <div className="whitespace-pre-wrap break-words text-gray-900">
            {message.content}
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-4 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-700"
              onClick={() => setShowReplyForm(!showReplyForm)}
              type="button"
            >
              💬 Reply
            </button>

            {message.replyCount > 0 && (
              <span className="text-gray-500 text-xs">
                {message.replyCount}{" "}
                {message.replyCount === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <form className="mt-3" onSubmit={handleReplySubmit}>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Reply to this message..."
                  type="text"
                  value={replyContent}
                />
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!replyContent.trim() || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "..." : "Send"}
                </button>
                <button
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
