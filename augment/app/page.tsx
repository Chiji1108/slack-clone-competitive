"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MessageInput from "@/components/MessageInput";
import MessageList from "@/components/MessageList";
import Sidebar from "@/components/Sidebar";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState<Id<"workspaces"> | null>(null);
  const [selectedChannelId, setSelectedChannelId] =
    useState<Id<"channels"> | null>(null);

  const workspaces = useQuery(api.workspaces.getUserWorkspaces) ?? [];
  const selectedChannel = useQuery(
    api.channels.getChannel,
    selectedChannelId ? { channelId: selectedChannelId } : "skip"
  );

  // Auto-select first workspace and channel if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0]._id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const channels =
    useQuery(
      api.channels.getWorkspaceChannels,
      selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
    ) ?? [];

  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0]._id);
    }
  }, [channels, selectedChannelId]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (isAuthenticated === false) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        onChannelSelect={setSelectedChannelId}
        onWorkspaceSelect={(workspaceId) => {
          setSelectedWorkspaceId(workspaceId);
          setSelectedChannelId(null); // Reset channel selection when workspace changes
        }}
        selectedChannelId={selectedChannelId}
        selectedWorkspaceId={selectedWorkspaceId}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-gray-200 border-b bg-white p-4">
          <div className="flex items-center gap-2">
            {selectedChannel && (
              <>
                <span className="text-gray-500">
                  {selectedChannel.isPrivate ? "🔒" : "#"}
                </span>
                <h1 className="font-semibold text-lg">
                  {selectedChannel.name}
                </h1>
                {selectedChannel.description && (
                  <span className="text-gray-500 text-sm">
                    | {selectedChannel.description}
                  </span>
                )}
              </>
            )}
          </div>
          <SignOutButton />
        </header>

        {/* Messages Area */}
        {selectedChannelId ? (
          <>
            <MessageList channelId={selectedChannelId} />
            <MessageInput
              channelId={selectedChannelId}
              channelName={selectedChannel?.name || ""}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="mb-4 text-4xl">👋</div>
              <div className="mb-2 font-medium text-lg">
                Welcome to Slack Clone!
              </div>
              <div className="text-sm">
                {workspaces.length === 0
                  ? "Create a workspace to get started"
                  : "Select a channel to start chatting"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="rounded-md bg-slate-200 px-2 py-1 text-foreground dark:bg-slate-800"
          onClick={async () => {
            await signOut();
            router.push("/signin");
          }}
          type="button"
        >
          Sign out
        </button>
      )}
    </>
  );
}
