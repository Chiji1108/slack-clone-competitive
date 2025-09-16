"use client";

import { Id } from "@/convex/_generated/dataModel";

interface Channel {
  _id: Id<"channels">;
  _creationTime: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: Id<"users">;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: Id<"channels"> | null;
  onChannelSelect: (channelId: Id<"channels">) => void;
}

export default function ChannelList({
  channels,
  selectedChannelId,
  onChannelSelect,
}: ChannelListProps) {
  const publicChannels = channels.filter((channel) => !channel.isPrivate);
  const privateChannels = channels.filter((channel) => channel.isPrivate);

  const ChannelItem = ({ channel }: { channel: Channel }) => (
    <button
      onClick={() => onChannelSelect(channel._id)}
      className={`w-full text-left p-2 rounded flex items-center gap-2 ${
        selectedChannelId === channel._id
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-700 hover:text-white"
      }`}
      type="button"
    >
      <span className="text-slate-400">
        {channel.isPrivate ? "🔒" : "#"}
      </span>
      <span className="truncate">{channel.name}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Public Channels */}
      {publicChannels.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Public Channels
          </h4>
          <div className="space-y-1">
            {publicChannels.map((channel) => (
              <ChannelItem key={channel._id} channel={channel} />
            ))}
          </div>
        </div>
      )}

      {/* Private Channels */}
      {privateChannels.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Private Channels
          </h4>
          <div className="space-y-1">
            {privateChannels.map((channel) => (
              <ChannelItem key={channel._id} channel={channel} />
            ))}
          </div>
        </div>
      )}

      {channels.length === 0 && (
        <div className="text-slate-400 text-sm">
          No channels yet. Create one to get started!
        </div>
      )}
    </div>
  );
}
