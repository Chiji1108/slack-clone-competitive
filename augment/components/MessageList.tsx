"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";

interface MessageListProps {
  channelId: Id<"channels">;
}

export default function MessageList({ channelId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const messages = useQuery(api.messages.getChannelMessages, {
    channelId,
    limit: 50,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <div className="text-lg font-medium mb-2">No messages yet</div>
          <div className="text-sm">Be the first to send a message in this channel!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message._id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
