"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string;
  _creationTime: number;
}

interface SidebarProps {
  workspaceId: string;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  user: User;
  onSignOut: () => void;
}

export default function Sidebar({
  workspaceId,
  selectedChannelId,
  onSelectChannel,
  user,
  onSignOut,
}: SidebarProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const workspace = useQuery(api.workspaceFunctions.getWorkspace, {
    workspaceId: workspaceId as Id<"workspaces">,
  });
  const channels = useQuery(api.channelFunctions.getWorkspaceChannels, {
    workspaceId: workspaceId as Id<"workspaces">,
  });
  const createChannel = useMutation(api.channelFunctions.createChannel);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    try {
      const channelId = await createChannel({
        workspaceId: workspaceId as Id<"workspaces">,
        name: channelName.trim(),
        description: channelDescription.trim() || undefined,
        isPrivate,
      });
      onSelectChannel(channelId);
      setShowCreateChannel(false);
      setChannelName("");
      setChannelDescription("");
      setIsPrivate(false);
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-gray-700 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="truncate font-semibold text-lg">
            {workspace?.name || "Workspace"}
          </h1>
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => setShowCreateChannel(true)}
            title="Create channel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
        {workspace?.description && (
          <p className="mt-1 truncate text-gray-400 text-sm">
            {workspace.description}
          </p>
        )}
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <h2 className="font-semibold text-gray-400 text-xs uppercase tracking-wider">
              Channels
            </h2>
          </div>
          <div className="mt-1 space-y-1">
            {channels?.map((channel: any) => (
              <button
                className={`flex w-full items-center rounded px-2 py-1 text-left text-sm hover:bg-gray-800 ${
                  selectedChannelId === channel._id ? "bg-gray-800" : ""
                }`}
                key={channel._id}
                onClick={() => onSelectChannel(channel._id)}
              >
                <span className="mr-2">{channel.isPrivate ? "🔒" : "#"}</span>
                <span className="truncate">{channel.name}</span>
                {channel.isPrivate && (
                  <span className="ml-auto text-gray-500 text-xs">
                    {channel.memberCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="border-gray-700 border-t p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {user.image ? (
              <img
                alt={user.name || "User"}
                className="h-8 w-8 rounded-full"
                src={user.image}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500">
                <span className="font-medium text-sm text-white">
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {user.name || user.email || "User"}
            </p>
            <p className="truncate text-gray-400 text-xs">{user.email}</p>
          </div>
          <button
            className="text-gray-400 hover:text-white"
            onClick={onSignOut}
            title="Sign out"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-96 max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 font-medium text-gray-900 text-lg">
              Create a new channel
            </h3>
            <form className="space-y-4" onSubmit={handleCreateChannel}>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="channel-name"
                >
                  Channel name
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  id="channel-name"
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g. general"
                  required
                  type="text"
                  value={channelName}
                />
              </div>
              <div>
                <label
                  className="block font-medium text-gray-700 text-sm"
                  htmlFor="channel-description"
                >
                  Description (optional)
                </label>
                <input
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  id="channel-description"
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  type="text"
                  value={channelDescription}
                />
              </div>
              <div className="flex items-center">
                <input
                  checked={isPrivate}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  id="is-private"
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  type="checkbox"
                />
                <label
                  className="ml-2 block text-gray-900 text-sm"
                  htmlFor="is-private"
                >
                  Make this channel private
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="submit"
                >
                  Create
                </button>
                <button
                  className="flex-1 rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  onClick={() => setShowCreateChannel(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
