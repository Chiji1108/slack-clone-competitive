"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

type Channel = {
  id: Id<"channels">;
  name: string;
};

type Message = {
  id: Id<"messages">;
  authorId: Id<"users">;
  authorName: string;
  body: string;
  createdAt: number;
};

type Viewer = {
  userId: Id<"users">;
  email: string;
  displayName: string;
  hasCustomName: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Something went wrong.";
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const channels = useQuery(
    api.channels.list,
    isAuthenticated ? {} : "skip",
  );
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const [selectedChannelId, setSelectedChannelId] = useState<
    Id<"channels"> | null
  >(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const createChannel = useMutation(api.channels.create);
  const sendMessage = useMutation(api.messages.send);
  const updateName = useMutation(api.users.setName);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (
      selectedChannelId === null &&
      channels !== undefined &&
      channels.length > 0
    ) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const selectedChannel = useMemo(() => {
    if (channels === undefined || selectedChannelId === null) {
      return null;
    }
    for (const channel of channels) {
      if (channel.id === selectedChannelId) {
        return channel;
      }
    }
    return null;
  }, [channels, selectedChannelId]);

  const messages = useQuery(
    api.messages.list,
    selectedChannelId === null
      ? "skip"
      : { channelId: selectedChannelId },
  );

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  if (!viewer) {
    return <LoadingScreen />;
  }

  const handleCreateChannel = async (name: string) => {
    try {
      setChannelError(null);
      const created = await createChannel({ name });
      setSelectedChannelId(created.id);
    } catch (error) {
      setChannelError(getErrorMessage(error));
    }
  };

  const handleSendMessage = async (body: string) => {
    if (selectedChannelId === null) {
      return;
    }
    try {
      setMessageError(null);
      await sendMessage({ channelId: selectedChannelId, body });
    } catch (error) {
      setMessageError(getErrorMessage(error));
    }
  };

  const handleNameSubmit = async (name: string) => {
    try {
      setNameError(null);
      await updateName({ name });
    } catch (error) {
      setNameError(getErrorMessage(error));
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <ChannelSidebar
        channels={channels ?? []}
        selectedChannelId={selectedChannelId}
        onSelect={setSelectedChannelId}
        onCreate={handleCreateChannel}
        error={channelError}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div>
            <h1 className="text-xl font-semibold">Slack Clone</h1>
            {selectedChannel ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                #{selectedChannel.name}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create a channel to get started.
              </p>
            )}
          </div>
          <UserMenu
            displayName={viewer.displayName}
            onSignOut={() => {
              void signOut().then(() => {
                router.push("/signin");
              });
            }}
          />
        </header>
        {!viewer.hasCustomName && (
          <DisplayNameBanner
            onSubmit={handleNameSubmit}
            error={nameError}
            defaultValue={viewer.displayName}
          />
        )}
        <div className="flex flex-1 flex-col">
          <MessagePanel
            channel={selectedChannel}
            messages={messages ?? undefined}
            onSend={handleSendMessage}
            error={messageError}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace…</p>
    </div>
  );
}

type ChannelSidebarProps = {
  channels: Channel[];
  selectedChannelId: Id<"channels"> | null;
  onSelect: (channelId: Id<"channels">) => void;
  onCreate: (name: string) => Promise<void> | void;
  error: string | null;
};

function ChannelSidebar({
  channels,
  selectedChannelId,
  onSelect,
  onCreate,
  error,
}: ChannelSidebarProps) {
  const [name, setName] = useState("");
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      return;
    }
    const nextName = name;
    setName("");
    const maybePromise = onCreate(nextName);
    if (maybePromise instanceof Promise) {
      void maybePromise.catch(() => {
        setName(nextName);
      });
    }
  };

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Channels
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {channels.length === 0 ? (
          <p className="px-2 text-sm text-slate-500 dark:text-slate-400">
            No channels yet.
          </p>
        ) : (
          channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(channel.id)}
              className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
                channel.id === selectedChannelId
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              #{channel.name}
            </button>
          ))
        )}
      </nav>
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 px-3 py-4 dark:border-slate-800"
      >
        <label
          htmlFor="channel-name"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Channel name
        </label>
        <input
          id="channel-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mb-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="Channel name"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Add channel
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </form>
    </aside>
  );
}

type MessagePanelProps = {
  channel: Channel | null;
  messages: Message[] | undefined;
  onSend: (body: string) => Promise<void> | void;
  error: string | null;
};

function MessagePanel({ channel, messages, onSend, error }: MessagePanelProps) {
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0 || isSending) {
      return;
    }
    setIsSending(true);
    const maybePromise = onSend(trimmed);
    if (maybePromise instanceof Promise) {
      maybePromise
        .then(() => {
          setBody("");
        })
        .catch(() => undefined)
        .finally(() => {
          setIsSending(false);
        });
    } else {
      setBody("");
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        {channel === null ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create or select a channel to start chatting.
            </p>
          </div>
        ) : messages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading messages…
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Be the first to say something in #{channel.name}.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {message.authorName}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {formatter.format(new Date(message.createdAt))}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="sr-only" htmlFor="message-body">
          Message body
        </label>
        <textarea
          id="message-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            channel === null
              ? "Select a channel to start typing"
              : `Message #${channel.name}`
          }
          className="h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          disabled={channel === null}
        />
        <div className="mt-3 flex items-center justify-between">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={channel === null || isSending}
            className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

type DisplayNameBannerProps = {
  onSubmit: (name: string) => Promise<void> | void;
  error: string | null;
  defaultValue: string;
};

function DisplayNameBanner({ onSubmit, error, defaultValue }: DisplayNameBannerProps) {
  const [name, setName] = useState(defaultValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }
    const maybePromise = onSubmit(trimmed);
    if (maybePromise instanceof Promise) {
      void maybePromise.catch(() => {
        setName(trimmed);
      });
    }
  };

  return (
    <div className="border-b border-slate-200 bg-slate-100 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/60">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            htmlFor="display-name"
          >
            Choose a display name to finish setting up your account
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This name appears next to your messages.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="display-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Your display name"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Save name
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}

type UserMenuProps = {
  displayName: string;
  onSignOut: () => void;
};

function UserMenu({ displayName, onSignOut }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {displayName}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        Sign out
      </button>
    </div>
  );
}
