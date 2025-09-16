"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface WorkspaceSelectorProps {
  selectedWorkspaceId: Id<"workspaces"> | null;
  onWorkspaceSelect: (workspaceId: Id<"workspaces">) => void;
}

export default function WorkspaceSelector({
  selectedWorkspaceId,
  onWorkspaceSelect,
}: WorkspaceSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

  const workspaces = useQuery(api.workspaces.getUserWorkspaces) ?? [];
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  const selectedWorkspace = workspaces.find((w) => w._id === selectedWorkspaceId);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const workspaceId = await createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDescription.trim() || undefined,
      });
      onWorkspaceSelect(workspaceId);
      setNewWorkspaceName("");
      setNewWorkspaceDescription("");
      setShowCreateForm(false);
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full text-left p-2 rounded hover:bg-slate-700 flex items-center justify-between"
        type="button"
      >
        <span className="truncate">
          {selectedWorkspace ? selectedWorkspace.name : "Select Workspace"}
        </span>
        <span className="text-slate-400">▼</span>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded shadow-lg z-10 max-h-64 overflow-y-auto">
          {workspaces.map((workspace) => (
            <button
              key={workspace._id}
              onClick={() => {
                onWorkspaceSelect(workspace._id);
                setShowDropdown(false);
              }}
              className="w-full text-left p-3 hover:bg-slate-600 border-b border-slate-600 last:border-b-0"
              type="button"
            >
              <div className="font-medium">{workspace.name}</div>
              {workspace.description && (
                <div className="text-sm text-slate-300 truncate">
                  {workspace.description}
                </div>
              )}
              <div className="text-xs text-slate-400 mt-1">
                Role: {workspace.role}
              </div>
            </button>
          ))}

          <div className="border-t border-slate-600">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full text-left p-3 hover:bg-slate-600 text-slate-300"
                type="button"
              >
                + Create New Workspace
              </button>
            ) : (
              <form onSubmit={handleCreateWorkspace} className="p-3">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full p-2 mb-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  className="w-full p-2 mb-2 bg-slate-800 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewWorkspaceName("");
                      setNewWorkspaceDescription("");
                    }}
                    className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
