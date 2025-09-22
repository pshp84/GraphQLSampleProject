"use client";

import { useState, useEffect } from "react";

type Post = { id: string; title: string; content: string };

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [required, setRequired] = useState<boolean>(false);

  // Fetch all posts
  async function fetchPosts() {
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query { posts { id title content } }`,
      }),
    });

    const json = await res.json();
    console.log("GraphQL response:", json);

    if (json.data?.posts) {
      setPosts(json.data.posts);
    } else {
      setPosts([]);
    }
  }

  // Create or Update post
  async function createOrUpdatePost() {
    if (!title || !content) {
      setRequired(true);
      return;
    }
    const query = editing
      ? `mutation Update($id: ID!, $title: String, $content: String) {
          updatePost(id: $id, title: $title, content: $content) {
            id title content
          }
        }`
      : `mutation Create($title: String!, $content: String!) {
          createPost(title: $title, content: $content) {
            id title content
          }
        }`;

    const variables = editing
      ? { id: editing.id, title, content }
      : { title, content };

    await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    setTitle("");
    setContent("");
    setEditing(null);
    setRequired(false)
    fetchPosts();
  }

  // Delete post
  async function deletePost(id: string) {
    await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation Delete($id: ID!) { deletePost(id: $id) }`,
        variables: { id },
      }),
    });
    fetchPosts();
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Posts CRUD (GraphQL API)</h1>

      {/* Form */}
      <div className="space-y-2 w-[60%]">
        <div className="flex gap-2">
          <div className="w-1/2">
            <input
              className={`border p-2 rounded w-full ${
                required && !title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Title"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {!title && required && <p className="mt-1 text-sm text-red-500">Title is required.</p>}
          </div>
          <div className="w-1/2">
          <input
             className={`border p-2 rounded w-full ${
                required && !content ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="Description"
            id="description"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {required && !content && (
              <p className="mt-1 text-sm text-red-500">
                Description is required.
              </p>
            )}
          </div>
        </div>
      </div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
        onClick={createOrUpdatePost}
      >
        {editing ? "Update Post" : "Create Post"}
      </button>
      {/* Posts List */}
      <div className="space-y-3 mt-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="border rounded p-3 flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold">{post.title}</h2>
              <p className="text-sm">{post.content}</p>
            </div>
            <div className="space-x-2">
              <button
                className="px-3 py-1 bg-yellow-400 rounded cursor-pointer"
                onClick={() => {
                  setEditing(post);
                  setTitle(post.title);
                  setContent(post.content);
                }}
              >
                Edit
              </button>
              <button
                className="px-3 py-1 bg-red-500 text-white rounded cursor-pointer"
                onClick={() => deletePost(post.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
