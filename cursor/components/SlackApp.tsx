"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import ChannelView from "./ChannelView";
import Sidebar from "./Sidebar";
import WorkspaceSelector from "./WorkspaceSelector";

export default function SlackApp() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );
  const { signOut } = useAuthActions();
  const router = useRouter();

  const user = useQuery(api.authFunctions.getCurrentUser);
  const workspaces = useQuery(api.workspaceFunctions.getUserWorkspaces);

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-indigo-600 border-b-2" />
      </div>
    );
  }

  // If no workspace is selected, show workspace selector
  if (!selectedWorkspaceId) {
    return (
      <WorkspaceSelector
        onCreateWorkspace={() => {
          // This will be handled by the WorkspaceSelector component
        }}
        onSelectWorkspace={setSelectedWorkspaceId}
        workspaces={workspaces || []}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        onSelectChannel={setSelectedChannelId}
        onSignOut={handleSignOut}
        selectedChannelId={selectedChannelId}
        user={user}
        workspaceId={selectedWorkspaceId}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {selectedChannelId ? (
          <ChannelView
            channelId={selectedChannelId}
            user={user}
            workspaceId={selectedWorkspaceId}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <svg
                  className="h-8 w-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h3 className="mt-2 font-medium text-gray-900 text-sm">
                No channel selected
              </h3>
              <p className="mt-1 text-gray-500 text-sm">
                Choose a channel from the sidebar to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
