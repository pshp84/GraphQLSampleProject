import { buildSchema } from "graphql";

// schema
export const schema = buildSchema(`
  type Post {
    id: ID!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
    updatePost(id: ID!, title: String, content: String): Post!
    deletePost(id: ID!): Boolean!
  }
`);

type Post = { id: string; title: string; content: string };

const posts: Post[] = [];

// Resolvers
export const root = {
  posts: () => posts,
  post: ({ id }: { id: string }) => posts.find((p) => p.id === id),
  createPost: ({ title, content }: { title: string; content: string }) => {
    const newPost = { id: String(posts.length + 1), title, content };
    posts.push(newPost);
    return newPost;
  },
  updatePost: ({ id, title, content }: { id: string; title?: string; content?: string }) => {
    const post = posts.find((p) => p.id === id);
    if (!post) throw new Error("Post not found");
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    return post;
  },
  deletePost: ({ id }: { id: string }) => {
    const index = posts.findIndex((p) => p.id === id);
    if (index === -1) return false;
    posts.splice(index, 1);
    return true;
  },
};
