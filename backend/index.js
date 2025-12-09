import { ApolloServer, gql } from "apollo-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { MONGODB_URI, JWT_SECRET = "SUPER_SECRET_KEY", PORT = 4000 } = process.env;

if (!MONGODB_URI) {
  console.error("Please set MONGODB_URI in your environment.");
  process.exit(1);
}

const { Schema, model, Types } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
});

const EventSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

const CommentSchema = new Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
});

const User = model("User", UserSchema);
const Event = model("Event", EventSchema);
const Comment = model("Comment", CommentSchema);

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
    date: String!  # ISO date string expected
  }

  input CreateCommentInput {
    eventId: ID!
    text: String!
  }

  type Query {
    me: User
    users(limit: Int, offset: Int): [User!]!
    events(search: String, limit: Int, offset: Int): [Event!]!
    totalEventsCount(search: String): Int!
    event(id: ID!): Event
    comments(eventId: ID!): [Comment!]!
  }

  type Mutation {
    registerUser(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createEvent(input: CreateEventInput!): Event!
    joinEvent(eventId: ID!): Event!
    addComment(input: CreateCommentInput!): Comment!
  }
`;

const getUserFromToken = async (authHeader) => {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) return null;
    const user = await User.findById(decoded.userId);
    return user || null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const resolvers = {
  User: {
    events: async (parent) =>
      Event.find({ $or: [{ createdBy: parent._id }, { attendees: parent._id }] }).exec(),
    comments: async (parent) => Comment.find({ author: parent._id }).exec(),
  },

  Event: {
    createdBy: async (parent) => User.findById(parent.createdBy).exec(),
    attendees: async (parent) => User.find({ _id: { $in: parent.attendees || [] } }).exec(),
    comments: async (parent) => Comment.find({ event: parent._id }).populate("author").exec(),
    date: (parent) => parent.date?.toISOString(),
  },

  Comment: {
    author: async (parent) => User.findById(parent.author).exec(),
    event: async (parent) => Event.findById(parent.event).exec(),
    createdAt: (parent) => parent.createdAt?.toISOString(),
  },

  Query: {
    me: (_, __, { user }) => user || null,

    users: async (_, { limit = 10, offset = 0 }) =>
      User.find().skip(offset).limit(limit).exec(),

    events: async (_, { search = "", limit = 10, offset = 0 }) => {
      const filter = {};
      if (search && typeof search === "string" && search.trim().length > 0) {
        filter.title = { $regex: search, $options: "i" };
      }
      return Event.find(filter)
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .populate("createdBy")
        .populate("attendees")
        .exec();
    },

    totalEventsCount: async (_, { search = "" }) => {
      const filter = {};
      if (search && typeof search === "string" && search.trim().length > 0) {
        filter.title = { $regex: search, $options: "i" };
      }
      const count = await Event.countDocuments(filter).exec();
      return typeof count === "number" ? count : 0;
    },

    event: async (_, { id }) => {
      if (!Types.ObjectId.isValid(id)) return null;
      return Event.findById(id).populate("createdBy").populate("attendees").exec();
    },

    comments: async (_, { eventId }) => {
      if (!Types.ObjectId.isValid(eventId)) return [];
      return Comment.find({ event: eventId }).populate("author").exec();
    },
  },

  Mutation: {
    registerUser: async (_, { input }) => {
      const { name, email, password, confirmPassword } = input;
      if (!name || !email || !password || !confirmPassword) {
        throw new Error("All fields are required");
      }
      if (password !== confirmPassword) throw new Error("Passwords do not match");
      const existing = await User.findOne({ email }).exec();
      if (existing) throw new Error("Email already registered");

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashed });

      const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "1d" });
      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email }).exec();
      if (!user) throw new Error("User not found");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid password");                                  
      const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "1d" });
      return { token, user };
    },

    createEvent: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const { title, description = "", date } = input;
      if (!title || !date) throw new Error("Title and date are required");

      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");

      const ev = await Event.create({
        title,
        description,
        date: parsed,
        createdBy: user._id,
        attendees: [],
      });

      return Event.findById(ev._id).populate("createdBy").populate("attendees").exec();
    },

    joinEvent: async (_, { eventId }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      if (!Types.ObjectId.isValid(eventId)) throw new Error("Invalid event id");
      const ev = await Event.findById(eventId).exec();
      if (!ev) throw new Error("Event not found");
      const already = ev.attendees.some((id) => id.equals(user._id));
      if (!already) {
        ev.attendees.push(user._id);
        await ev.save();
      }
      return Event.findById(ev._id).populate("attendees").populate("createdBy").exec();
    },

    addComment: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const { eventId, text } = input;
      if (!Types.ObjectId.isValid(eventId)) throw new Error("Invalid event id");
      if (!text || text.trim().length === 0) throw new Error("Comment text is required");

      const ev = await Event.findById(eventId).exec();
      if (!ev) throw new Error("Event not found");

      const comment = await Comment.create({
        text,
        author: user._id,
        event: ev._id,
        createdAt: new Date(),
      });

      return Comment.findById(comment._id).populate("author").populate("event").exec();
    },
  },
};

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req }) => {
        const auth = req.headers.authorization || "";
        const currentUser = await getUserFromToken(auth);
        return { user: currentUser };
      },
      formatError: (err) => {
        console.error("GraphQL Error:", err);
        return err;
      },
    });

    const { url } = await server.listen({ port: Number(PORT) });
    console.log(`Server ready at ${url}`);
  } catch (e) {
    console.error("Failed to start server:", e);
  }
}

start();

