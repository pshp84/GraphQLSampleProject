import { ApolloServer, gql } from "apollo-server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

let users = [];
let events = [];
let comments = [];

let userId = 1;
let eventId = 1;
let commentId = 1;

const JWT_SECRET = "SUPER_SECRET_KEY";

const typeDefs = gql`
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

  type AuthPayload {
    token: String!
    user: User!
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

  type Query {
    me: User
    users(limit: Int, offset: Int): [User!]!
    events(search: String, limit: Int, offset: Int): [Event!]!
    event(id: ID!): Event
    comments(eventId: ID!): [Comment!]!
    totalEventsCount(search: String): Int!
  }

  type Mutation {
    registerUser(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createEvent(input: CreateEventInput!): Event!
    joinEvent(eventId: ID!): Event!
    addComment(input: CreateCommentInput!): Comment!
  }
`;

const resolvers = {
  User: {
    events: (parent) =>
      events.filter(
        (e) => e.createdById === parent.id || e.attendees.includes(parent.id)
      ),
    comments: (parent) => comments.filter((c) => c.authorId === parent.id),
  },
  Event: {
    createdBy: (parent) => users.find((u) => u.id === parent.createdById),
    attendees: (parent) => users.filter((u) => parent.attendees.includes(u.id)),
    comments: (parent) => comments.filter((c) => c.eventId === parent.id),
  },
  Comment: {
    author: (parent) => users.find((u) => u.id === parent.authorId),
    event: (parent) => events.find((e) => e.id === parent.eventId),
  },
  Query: {
    me: (_, __, { user }) => user || null,
    users: (_, { limit = users.length, offset = 0 }) =>
      users.slice(offset, offset + limit),
    events: (_, { search = "", limit = events.length, offset = 0 }) =>
      events
        .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
        .slice(offset, offset + limit),
    event: (_, { id }) => events.find((e) => e.id === parseInt(id)),
    comments: (_, { eventId }) =>
      comments.filter((c) => c.eventId === parseInt(eventId)),
   
  },
  Mutation: {
    registerUser: async (_, { input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const newUser = { id: userId++, ...input, password: hashedPassword };
      users.push(newUser);

      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
        expiresIn: "1d",
      });
      return { token, user: newUser };
    },
    login: async (_, { email, password }) => {
      const user = users.find((u) => u.email === email);
      if (!user) throw new Error("User not found");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid password");
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "1d",
      });
      return { token, user };
    },
    createEvent: (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const newEvent = {
        id: eventId++,
        ...input,
        createdById: user.id,
        attendees: [],
      };
      events.push(newEvent);
      return newEvent;
    },
    joinEvent: (_, { eventId }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const event = events.find((e) => e.id === parseInt(eventId));
      if (!event) throw new Error("Event not found");
      if (!event.attendees.includes(user.id)) event.attendees.push(user.id);
      return event;
    },
    addComment: (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated.");
      const event = events.find((e) => e.id === parseInt(input.eventId));
      if (!event) throw new Error("Event not found.");
      const newComment = {
        id: commentId++,
        text: input.text,
        createdAt: new Date().toISOString(),
        authorId: user.id,
        eventId: event.id,
      };
      comments.push(newComment);
      return newComment;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find((u) => u.id === decoded.userId);
        return { user };
      } catch (e) {
        console.log("JWT Error:", e.message);
      }
    }
    return {};
  },
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
