"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b-2 border-slate-200 dark:border-slate-800">
        <h1 className="font-bold">Slack Clone</h1>
        <SignOutButton />
      </header>
      <MainArea />
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
          className="bg-slate-200 dark:bg-slate-800 text-foreground rounded-md px-2 py-1"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </button>
      )}
    </>
  );
}

function MainArea() {
  const ensureOnboarded = useMutation(api.channels.ensureOnboarded);
  const channels = useQuery(api.channels.listMyChannels, {});

  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);

  useEffect(() => {
    // Ensure default #general exists and user is a member
    void ensureOnboarded({}).catch(() => {});
  }, [ensureOnboarded]);

  // choose a default selected channel when channels load
  useEffect(() => {
    if (!channels || channels.length === 0) return;
    if (selectedChannelId) return;
    const general = channels.find((c) => c.name === "general");
    setSelectedChannelId((general ?? channels[0])._id as Id<"channels">);
  }, [channels, selectedChannelId]);

  const selectedChannel = useMemo(() => {
    if (!channels || !selectedChannelId) return null;
    return channels.find((c) => (c._id as unknown as string) === (selectedChannelId as unknown as string)) ?? null;
  }, [channels, selectedChannelId]);

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelect={(id) => setSelectedChannelId(id)}
      />
      <ChatWindow channelId={selectedChannelId} channelName={selectedChannel?.name ?? null} />
    </div>
  );
}

function Sidebar({
  channels,
  selectedChannelId,
  onSelect,
}: {
  channels: { _id: Id<"channels">; name: string; isDefault: boolean }[] | undefined;
  selectedChannelId: Id<"channels"> | null;
  onSelect: (id: Id<"channels">) => void;
}) {
  const createChannel = useMutation(api.channels.createChannel);
  const [name, setName] = useState("");

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const { channelId } = await createChannel({ name: trimmed });
      setName("");
      onSelect(channelId as Id<"channels">);
    } catch (e) {
      // ignore for now; in production you'd show a toast
    }
  };

  return (
    <aside className="w-64 border-r-2 border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-3 overflow-y-auto">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Channels</p>
        <ul className="mt-2 flex flex-col">
          {channels === undefined ? (
            <li className="text-sm text-slate-500">Loading…</li>
          ) : channels.length === 0 ? (
            <li className="text-sm text-slate-500">No channels</li>
          ) : (
            channels.map((c) => (
              <li key={c._id.toString()}>
                <button
                  className={`w-full text-left px-2 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 ${
                    selectedChannelId === (c._id as Id<"channels">)
                      ? "bg-slate-200 dark:bg-slate-800"
                      : ""
                  }`}
                  onClick={() => onSelect(c._id as Id<"channels">)}
                >
                  # {c.name}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="mt-auto flex gap-2">
        <input
          className="flex-1 bg-background text-foreground rounded-md px-2 py-1 border-2 border-slate-200 dark:border-slate-800"
          placeholder="new-channel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onCreate();
            }
          }}
        />
        <button
          className="bg-foreground text-background rounded-md px-2"
          onClick={() => void onCreate()}
        >
          +
        </button>
      </div>
    </aside>
  );
}

function ChatWindow({ channelId, channelName }: { channelId: Id<"channels"> | null; channelName: string | null }) {
  const messages = useQuery(
    api.messages.listMessages,
    channelId ? { channelId, limit: 100 } : "skip"
  );
  const sendMessage = useMutation(api.messages.sendMessage);
  const [body, setBody] = useState("");

  const title = useMemo(() => (channelId ? `# ${channelName ?? "channel"}` : "#"), [channelId, channelName]);

  const onSend = async () => {
    const text = body.trim();
    if (!text || !channelId) return;
    try {
      await sendMessage({ channelId, body: text });
      setBody("");
    } catch (e) {
      // ignore; show toast in real app
    }
  };

  return (
    <section className="flex-1 flex flex-col min-w-0">
      <div className="border-b-2 border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {channelId == null ? (
          <p className="text-slate-500">Select or create a channel</p>
        ) : messages === undefined ? (
          <p className="text-slate-500">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <MessageItem
              key={m._id.toString()}
              author={m.authorEmail}
              time={new Date(m._creationTime).toLocaleTimeString()}
              body={m.body}
            />
          ))
        )}
      </div>
      <div className="p-3 border-t-2 border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          className="flex-1 bg-background text-foreground rounded-md px-3 py-2 border-2 border-slate-200 dark:border-slate-800"
          placeholder={channelId ? `Message #${channelName ?? "channel"}` : "Select a channel first"}
          value={body}
          disabled={!channelId}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
        />
        <button
          className="bg-foreground text-background rounded-md px-4"
          disabled={!channelId}
          onClick={() => void onSend()}
        >
          Send
        </button>
      </div>
    </section>
  );
}

function MessageItem({
  author,
  time,
  body,
}: {
  author: string;
  time: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs">
        {author.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="text-sm">
          <span className="font-semibold mr-2">{author}</span>
          <span className="text-slate-500">{time}</span>
        </div>
        <div className="whitespace-pre-wrap text-sm">{body}</div>
      </div>
    </div>
  );
}
