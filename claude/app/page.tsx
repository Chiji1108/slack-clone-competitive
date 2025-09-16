"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Id } from "../convex/_generated/dataModel";
import ChannelModal from "../components/ChannelModal";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div>Redirecting to sign in...</div>;
  }

  return <SlackClone />;
}

function SlackClone() {
  const user = useQuery(api.myFunctions.getCurrentUser);
  const workspaces = useQuery(api.myFunctions.getWorkspaces);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<Id<"workspaces"> | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Id<"channels"> | null>(
    null
  );
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]._id);
    }
  }, [workspaces, selectedWorkspace]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-purple-600 text-white flex flex-col">
        <div className="p-4 border-b border-purple-500">
          <h1 className="text-xl font-bold">Slack Clone</h1>
          <p className="text-sm text-purple-200">{user?.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <WorkspaceList
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onSelectWorkspace={setSelectedWorkspace}
            onShowModal={() => setShowWorkspaceModal(true)}
          />

          {selectedWorkspace && (
            <ChannelList
              workspaceId={selectedWorkspace}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
              onShowChannelModal={() => setShowChannelModal(true)}
            />
          )}
        </div>

        <SignOutButton />
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <Chat channelId={selectedChannel} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start chatting
          </div>
        )}
      </div>

      {showWorkspaceModal && (
        <WorkspaceModal onClose={() => setShowWorkspaceModal(false)} />
      )}

      {showChannelModal && selectedWorkspace && (
        <ChannelModal
          workspaceId={selectedWorkspace}
          onClose={() => setShowChannelModal(false)}
        />
      )}
    </div>
  );
}

function WorkspaceList({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  onShowModal,
}: {
  workspaces: any[] | undefined;
  selectedWorkspace: Id<"workspaces"> | null;
  onSelectWorkspace: (id: Id<"workspaces">) => void;
  onShowModal: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-purple-200">Workspaces</h2>
        <button
          onClick={onShowModal}
          className="text-xs bg-purple-500 hover:bg-purple-400 px-2 py-1 rounded"
        >
          +
        </button>
      </div>
      {workspaces?.map((workspace) => (
        <button
          key={workspace._id}
          onClick={() => onSelectWorkspace(workspace._id)}
          className={`block w-full text-left p-2 rounded text-sm ${
            selectedWorkspace === workspace._id
              ? "bg-purple-500"
              : "hover:bg-purple-500"
          }`}
        >
          {workspace.name}
        </button>
      ))}
    </div>
  );
}

function ChannelList({
  workspaceId,
  selectedChannel,
  onSelectChannel,
  onShowChannelModal,
}: {
  workspaceId: Id<"workspaces">;
  selectedChannel: Id<"channels"> | null;
  onSelectChannel: (id: Id<"channels">) => void;
  onShowChannelModal: () => void;
}) {
  const channels = useQuery(api.myFunctions.getChannels, { workspaceId });

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannel) {
      onSelectChannel(channels[0]._id);
    }
  }, [channels, selectedChannel, onSelectChannel]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-purple-200">Channels</h2>
        <button
          onClick={onShowChannelModal}
          className="text-xs bg-purple-500 hover:bg-purple-400 px-2 py-1 rounded"
        >
          +
        </button>
      </div>
      {channels?.map((channel) => (
        <button
          key={channel._id}
          onClick={() => onSelectChannel(channel._id)}
          className={`block w-full text-left p-2 rounded text-sm ${
            selectedChannel === channel._id
              ? "bg-purple-500"
              : "hover:bg-purple-500"
          }`}
        >
          # {channel.name}
        </button>
      ))}
    </div>
  );
}

function Chat({ channelId }: { channelId: Id<"channels"> }) {
  const messages = useQuery(api.myFunctions.getMessages, { channelId });
  const sendMessage = useMutation(api.myFunctions.sendMessage);
  const [newMessage, setNewMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage({
      content: newMessage.trim(),
      channelId,
    });
    setNewMessage("");
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message) => (
          <div key={message._id} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-400 rounded flex items-center justify-center text-white text-sm">
              {message.user.name?.[0] ?? "U"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">
                  {message.user.name ?? "Unknown User"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message._creationTime).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm mt-1">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Send
          </button>
        </div>
      </form>
    </>
  );
}

function WorkspaceModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [workspaceName, setWorkspaceName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const createWorkspace = useMutation(api.myFunctions.createWorkspace);
  const joinWorkspace = useMutation(api.myFunctions.joinWorkspace);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await createWorkspace({ name: workspaceName });
      setResult(`Workspace created! Join code: ${response.joinCode}`);
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinWorkspace({ joinCode });
      setResult("Successfully joined workspace!");
      setTimeout(onClose, 1500);
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Workspace</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex mb-4">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === "create"
                ? "border-b-2 border-purple-500 text-purple-600"
                : "text-gray-500"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab("join")}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              activeTab === "join"
                ? "border-b-2 border-purple-500 text-purple-600"
                : "text-gray-500"
            }`}
          >
            Join
          </button>
        </div>

        {activeTab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Create Workspace
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Join Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Join Workspace
            </button>
          </form>
        )}

        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <p className="text-sm">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="p-4 border-t border-purple-500">
      <button
        onClick={() =>
          void signOut().then(() => {
            router.push("/signin");
          })
        }
        className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-400 rounded text-sm"
      >
        Sign out
      </button>
    </div>
  );
}
