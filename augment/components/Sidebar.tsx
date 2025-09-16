"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ChannelList from "./ChannelList";
import CreateChannelModal from "./CreateChannelModal";
import OnlineUsers from "./OnlineUsers";
import WorkspaceSelector from "./WorkspaceSelector";

type SidebarProps = {
  selectedWorkspaceId: Id<"workspaces"> | null;
  selectedChannelId: Id<"channels"> | null;
  onWorkspaceSelect: (workspaceId: Id<"workspaces">) => void;
  onChannelSelect: (channelId: Id<"channels">) => void;
};

export default function Sidebar({
  selectedWorkspaceId,
  selectedChannelId,
  onWorkspaceSelect,
  onChannelSelect,
}: SidebarProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const workspace = useQuery(
    api.workspaces.getWorkspace,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  );

  const channels = useQuery(
    api.channels.getWorkspaceChannels,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip"
  );

  return (
    <div className="flex h-full w-64 flex-col bg-slate-800 text-white">
      {/* Workspace Header */}
      <div className="border-slate-700 border-b p-4">
        <WorkspaceSelector
          onWorkspaceSelect={onWorkspaceSelect}
          selectedWorkspaceId={selectedWorkspaceId}
        />
      </div>

      {/* Workspace Info */}
      {workspace && (
        <div className="border-slate-700 border-b px-4 py-2">
          <h2 className="truncate font-semibold text-lg">{workspace.name}</h2>
          {workspace.description && (
            <p className="truncate text-slate-300 text-sm">
              {workspace.description}
            </p>
          )}
        </div>
      )}

      {/* Channels Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wide">
              Channels
            </h3>
            {selectedWorkspaceId && (
              <button
                className="text-lg text-slate-400 leading-none hover:text-white"
                onClick={() => setShowCreateChannel(true)}
                title="Create channel"
                type="button"
              >
                +
              </button>
            )}
          </div>

          {channels && (
            <ChannelList
              channels={channels}
              onChannelSelect={onChannelSelect}
              selectedChannelId={selectedChannelId}
            />
          )}
        </div>

        {/* Online Users Section */}
        {selectedWorkspaceId && (
          <OnlineUsers workspaceId={selectedWorkspaceId} />
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && selectedWorkspaceId && (
        <CreateChannelModal
          onChannelCreated={(channelId) => {
            onChannelSelect(channelId);
            setShowCreateChannel(false);
          }}
          onClose={() => setShowCreateChannel(false)}
          workspaceId={selectedWorkspaceId}
        />
      )}
    </div>
  );
}
