"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

type OnlineUsersProps = {
  workspaceId: Id<"workspaces">;
};

type UserItemProps = {
  user: { _id: Id<"users">; email?: string; name?: string };
  isOnline: boolean;
  lastSeen: number;
  formatLastSeen: (timestamp: number) => string;
};

function UserItem({ user, isOnline, lastSeen, formatLastSeen }: UserItemProps) {
  return (
    <div className="flex items-center gap-2 rounded p-2 hover:bg-slate-700">
      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 font-medium text-sm text-white">
          {(user.name || user.email || "U").charAt(0).toUpperCase()}
        </div>
        <div
          className={`-bottom-0.5 -right-0.5 absolute h-3 w-3 rounded-full border-2 border-slate-800 ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm text-white">
          {user.name || user.email || "Unknown User"}
        </div>
        {!isOnline && (
          <div className="text-slate-400 text-xs">
            {formatLastSeen(lastSeen)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnlineUsers({ workspaceId }: OnlineUsersProps) {
  const presence = useQuery(api.presence.getWorkspacePresence, {
    workspaceId,
  });

  const updatePresence = useMutation(api.presence.updatePresence);
  const markOffline = useMutation(api.presence.markOffline);

  // Update presence when component mounts and periodically
  useEffect(() => {
    const PRESENCE_UPDATE_INTERVAL = 30_000; // 30 seconds

    const updateOnlineStatus = async () => {
      await updatePresence({
        workspaceId,
        isOnline: true,
      });
    };

    // Initial update
    updateOnlineStatus().catch(console.error);

    // Update every 30 seconds
    const interval = setInterval(() => {
      updateOnlineStatus().catch(console.error);
    }, PRESENCE_UPDATE_INTERVAL);

    // Mark offline when component unmounts or page unloads
    const handleBeforeUnload = () => {
      markOffline({ workspaceId }).catch(console.error);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      markOffline({ workspaceId }).catch(console.error);
    };
  }, [workspaceId, updatePresence, markOffline]);

  if (!presence) {
    return null;
  }

  const onlineUsers = presence.filter((p) => p.isOnline);
  const offlineUsers = presence.filter((p) => !p.isOnline);

  const formatLastSeen = (timestamp: number) => {
    const MILLISECONDS_PER_MINUTE =
      MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
    const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * MINUTES_PER_HOUR;
    const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * HOURS_PER_DAY;

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / MILLISECONDS_PER_MINUTE);
    const hours = Math.floor(diff / MILLISECONDS_PER_HOUR);
    const days = Math.floor(diff / MILLISECONDS_PER_DAY);

    if (minutes < 1) {
      return "Just now";
    }
    if (minutes < SECONDS_PER_MINUTE) {
      return `${minutes}m ago`;
    }
    if (hours < HOURS_PER_DAY) {
      return `${hours}h ago`;
    }
    return `${days}d ago`;
  };

  return (
    <div className="border-slate-700 border-t p-4">
      {onlineUsers.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 font-semibold text-slate-300 text-sm uppercase tracking-wide">
            Online ({onlineUsers.length})
          </h3>
          <div className="space-y-1">
            {onlineUsers.map((userPresence) => (
              <UserItem
                formatLastSeen={formatLastSeen}
                isOnline={userPresence.isOnline}
                key={userPresence.userId}
                lastSeen={userPresence.lastSeen}
                user={userPresence.user}
              />
            ))}
          </div>
        </div>
      )}

      {offlineUsers.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-slate-300 text-sm uppercase tracking-wide">
            Offline ({offlineUsers.length})
          </h3>
          <div className="space-y-1">
            {offlineUsers.map((userPresence) => (
              <UserItem
                formatLastSeen={formatLastSeen}
                isOnline={userPresence.isOnline}
                key={userPresence.userId}
                lastSeen={userPresence.lastSeen}
                user={userPresence.user}
              />
            ))}
          </div>
        </div>
      )}

      {presence.length === 0 && (
        <div className="text-slate-400 text-sm">
          No users in this workspace yet.
        </div>
      )}
    </div>
  );
}
