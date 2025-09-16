"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Workspace {
  _id: Id<"workspaces">;
  name: string;
  description?: string;
  ownerId: Id<"users">;
  createdAt: number;
  role: "owner" | "admin" | "member";
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}

export default function WorkspaceSelector({
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
}: WorkspaceSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const createWorkspace = useMutation(api.workspaceFunctions.createWorkspace);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    try {
      const workspaceId = await createWorkspace({
        name: workspaceName.trim(),
        description: workspaceDescription.trim() || undefined,
      });
      onSelectWorkspace(workspaceId);
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  if (showCreateForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
              Create a new workspace
            </h2>
            <p className="mt-2 text-center text-gray-600 text-sm">
              Set up your team's workspace to start collaborating
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleCreateWorkspace}>
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label className="sr-only" htmlFor="workspace-name">
                  Workspace name
                </label>
                <input
                  className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  id="workspace-name"
                  name="workspace-name"
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  required
                  type="text"
                  value={workspaceName}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="workspace-description">
                  Description (optional)
                </label>
                <input
                  className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  id="workspace-description"
                  name="workspace-description"
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Description (optional)"
                  type="text"
                  value={workspaceDescription}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-sm text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                type="submit"
              >
                Create workspace
              </button>
              <button
                className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => setShowCreateForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <svg
              className="h-8 w-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
            Select a workspace
          </h2>
          <p className="mt-2 text-center text-gray-600 text-sm">
            Choose a workspace to continue or create a new one
          </p>
        </div>

        <div className="space-y-3">
          {workspaces.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-gray-500 text-sm">No workspaces found</p>
              <button
                className="font-medium text-indigo-600 hover:text-indigo-500"
                onClick={() => setShowCreateForm(true)}
              >
                Create your first workspace
              </button>
            </div>
          ) : (
            <>
              {workspaces.map((workspace) => (
                <button
                  className="w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                  key={workspace._id}
                  onClick={() => onSelectWorkspace(workspace._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">
                        {workspace.name}
                      </h3>
                      {workspace.description && (
                        <p className="mt-1 text-gray-500 text-sm">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 font-medium text-indigo-800 text-xs">
                        {workspace.role}
                      </span>
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M9 5l7 7-7 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}

              <button
                className="w-full rounded-lg border-2 border-gray-300 border-dashed p-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                onClick={() => setShowCreateForm(true)}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                  <span className="font-medium text-gray-600 text-sm">
                    Create new workspace
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
