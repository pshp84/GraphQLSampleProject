/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import {
  GET_EVENTS,
  CREATE_EVENT,
  JOIN_EVENT,
  ADD_COMMENT,
} from "@/graphql/mutations";

type EventItem = {
  id: string;
  title: string;
  description?: string;
  date: string;
  createdBy: {
    id: string;
    name: string;
  };
  attendees: { id: string; name: string }[];
  comments: {
    id: string;
    text: string;
    author: { id: string; name: string };
  }[];
};

type GetEventsData = {
  events: EventItem[];
  totalEventsCount: number;
};

type GetEvents = {
  search?: string;
  limit?: number;
  offset?: number;
};

export default function EventsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const defaultLimit = 5;

  useEffect(() => {
    if (!token) {
      toast.error("Please login to view events");
      router.push("/login");
    }
  }, [token, router]);

  const [search, setSearch] = useState("");
  const [limit] = useState<number>(defaultLimit);
  const [offset, setOffset] = useState<number>(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
  });
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [inlineError, setInlineError] = useState<string | null>(null);

  const queryVars = useMemo<GetEvents>(
    () => ({ search: search || "", limit, offset }),
    [search, limit, offset]
  );

  const { data, loading, error, refetch } = useQuery<
    GetEventsData,
    GetEvents
  >(GET_EVENTS, {
    variables: queryVars,
    skip: !token,
    fetchPolicy: "network-only",
    context: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  const [createEventMut] = useMutation(CREATE_EVENT, {
    context: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
    onCompleted: () => {
      toast.success("Event created");
      setCreating(false);
      setShowCreate(false);
      setNewEvent({ title: "", description: "", date: "" });
      refetch();
    },
    onError: (err: { message: any }) => {
      setCreating(false);
      toast.error(err.message || "Failed to create event");
    },
  });

  const [joinEventMut] = useMutation(JOIN_EVENT, {
    context: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
    onCompleted: () => {
      toast.success("Joined event");
      refetch();
    },
    onError: (err: { message: any }) => {
      toast.error(err.message || "Failed to join event");
    },
  });

  const [addCommentMut] = useMutation(ADD_COMMENT, {
    context: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
    onCompleted: () => {
      toast.success("Comment added");
      refetch();
    },
    onError: (err: { message: any }) => {
      toast.error(err.message || "Failed to add comment");
    },
  });

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setOffset(0);
    try {
      await refetch({ ...queryVars, offset: 0 });
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    if (!newEvent.title || !newEvent.date) {
      setInlineError("Title & date are required");
      return;
    }
    setCreating(true);
    try {
      await createEventMut({
        variables: {
          input: {
            title: newEvent.title,
            description: newEvent.description,
            date: newEvent.date,
          },
        },
      });
    } catch (err) {
      setCreating(false);
      setInlineError((err as any)?.message || "Create failed");
    }
  };

  const handleJoin = async (eventId: string) => {
    try {
      await joinEventMut({ variables: { eventId } });
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddComment = async (eventId: string) => {
    const text = commentText[eventId]?.trim();
    if (!text) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await addCommentMut({
        variables: { input: { eventId, text } },
      });
      setCommentText((prev) => ({ ...prev, [eventId]: "" }));
    } catch (err) {
      console.log(err);
    }
  };

  const handleLogout = ()=>{
    localStorage.clear();
    router.push("/")
  }

  const events = data?.events ?? [];

  const disablePrev = offset === 0;
  const disableNext = events.length < limit;

  if (!token) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events List</h1>
        <div className="flex items-center gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="px-3 py-2 border rounded w-64"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-200 rounded cursor-pointer"
            >
              Search
            </button>
          </form>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer"
          >
            + Add New Event
          </button>
          <button
          onClick={handleLogout}
          type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-600">Loading events...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}

      {!loading && events.length === 0 && (
        <p className="text-gray-600">No events found.</p>
      )}

      <ul className="space-y-4">
        {events.map((ev: EventItem) => {
          const isAttending = ev.attendees.some(
            (a: { id: string | undefined }) => a.id === user?.id
          );
          return (
            <li
              key={ev.id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{ev.title}</h2>
                  <p className="text-sm text-gray-500">
                    Event is on {new Date(ev.date).toLocaleDateString()} created
                    by <strong className="text-black">{ev.createdBy.name}</strong>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleJoin(String(ev.id))}
                    disabled={isAttending}
                    className={`px-3 py-1 rounded ${
                      isAttending
                        ? "bg-gray-300"
                        : "bg-green-600 cursor-pointer text-white"
                    }`}
                  >
                    {isAttending ? "Joined" : "Join"}
                  </button>
                  <div className="text-sm text-gray-600">
                    Attendees: {ev.attendees.length}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-gray-700">{ev.description}</p>
              </div>

              {/* comments */}
              <div className="mt-4 border-t pt-3">
                <div className="space-y-2">
                  {ev.comments.length === 0 ? (
                    <div className="text-sm text-gray-500">No comments yet</div>
                  ) : (
                    ev.comments.map((c: any) => (
                      <div key={c.id} className="text-sm">
                        <strong className="mr-2">{c.author.name}</strong>
                        <span className="text-gray-700">{c.text}</span>
                        <div className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* add comment */}
                <div className="mt-3 flex gap-2">
                  <input
                    value={commentText[String(ev.id)] ?? ""}
                    onChange={(e) =>
                      setCommentText((p) => ({
                        ...p,
                        [String(ev.id)]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment..."
                    className="flex-1 border px-3 py-2 rounded"
                  />
                  <button
                    onClick={() => handleAddComment(String(ev.id))}
                    className="px-3 py-2 bg-blue-600 text-white rounded cursor-pointer"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setOffset((p) => Math.max(p - limit, 0))}
          disabled={disablePrev}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
        >
          Previous
        </button>

        <div className="text-sm text-gray-600">
          {data?.totalEventsCount ? (
            <>
              Showing {offset + 1}–
              {Math.min(offset + events.length, data.totalEventsCount)} of{" "}
              {data.totalEventsCount} results
            </>
          ) : (
            <>Showing {events.length} results</>
          )}
        </div>

        <button
          onClick={() => setOffset((p) => p + limit)}
          disabled={disableNext}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 cursor-pointer"
        >
          Next
        </button>
      </div>

      {/* create modal */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded shadow p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Create Event</h3>
            {inlineError && (
              <div className="text-red-500 mb-2">{inlineError}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Title"
                className="w-full border px-3 py-2 rounded"
                required
              />
              <textarea
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Description"
                className="w-full border px-3 py-2 rounded"
              />
              <input
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, date: e.target.value }))
                }
                type="date"
                className="w-full border px-3 py-2 rounded"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 border rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-2 bg-blue-600 text-white rounded cursor-pointer"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
