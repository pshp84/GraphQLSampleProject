/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildSchema, graphql } from "graphql";

const schema = buildSchema(`

  type User {
    id: ID!
    name: String!
    email: String!
    events: [Event!]!
    comments: [Comment!]!
  }

  type Event {
    id: ID!
    title: String!
    description: String
    date: String!
    createdBy: User!
    attendees: [User!]!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    text: String!
    createdAt: String!
    author: User!
    event: Event!
  }

  type Query {
    me: User
    users(limit: Int, offset: Int): [User!]!
    events(search: String, limit: Int, offset: Int): [Event!]!   # required
    event(id: ID!): Event
    comments(eventId: ID!): [Comment!]!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    confirmPassword: String!
  }

  input CreateEventInput {
    title: String!
    description: String
    date: String!
  }

  input CreateCommentInput {
    eventId: ID!
    text: String!
  }

  type Mutation {
    registerUser(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    
    createEvent(input: CreateEventInput!): Event!
    joinEvent(eventId: ID!): Event!
    
    addComment(input: CreateCommentInput!): Comment!
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`);

const users: any[] = [];
const events: any[] = [];
const comments: any[] = [];

const root = {
  me: () => users[0] || null,

  users: ({ limit, offset }: any) =>
    users.slice(offset || 0, (offset || 0) + (limit || users.length)),

  events: ({ search, limit, offset }: any) => {
    let result = events;
    if (search) {
      result = result.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    return result.slice(offset || 0, (offset || 0) + (limit || result.length));
  },

  event: ({ id }: any) => events.find((e) => e.id === id),

  comments: ({ eventId }: any) => comments.filter((c) => c.eventId === eventId),

  registerUser: ({ input }: any) => {
    const user = {
      id: String(users.length + 1),
      ...input,
      events: [],
      comments: [],
    };
    users.push(user);
    return { token: "mock-token", user };
  },

  login: ({ email, password }: any) => {
    const user = users.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) throw new Error("Invalid credentials");
    return { token: "mock-token", user };
  },

  createEvent: ({ input }: any) => {
    const creator = users[0] || {
      id: "0",
      name: "Anonymous",
      email: "anon@mail.com",
      events: [],
      comments: [],
    };
    const event = {
      id: String(events.length + 1),
      ...input,
      createdBy: creator,
      attendees: [],
      comments: [],
    };
    events.push(event);
    return event;
  },

  joinEvent: ({ eventId }: any) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) throw new Error("Event not found");
    event.attendees.push(users[0]);
    return event;
  },

  addComment: ({ input }: any) => {
    const author = users[0] || {
      id: "0",
      name: "Anonymous",
      email: "anon@mail.com",
    };
    const event = events.find((e) => e.id === input.eventId);
    if (!event) throw new Error("Event not found");
    const comment = {
      id: String(comments.length + 1),
      text: input.text,
      createdAt: new Date().toISOString(),
      author,
      event,
      eventId: input.eventId,
    };
    comments.push(comment);
    return comment;
  },
};

export async function POST(req: Request) {
  const { query, variables } = await req.json();
  const result = await graphql({
    schema,
    source: query,
    rootValue: root,
    variableValues: variables,
  });
  return Response.json(result);
}

export async function GET() {
  return Response.json({ message: "EventHub GraphQL API running 🚀" });
}
