import { gql } from "@apollo/client";

export const REGISTER_USER = gql`
  mutation RegisterUser($input: CreateUserInput!) {
    registerUser(input: $input) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const LOGIN_USER = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents($search: String, $limit: Int, $offset: Int) {
    events(search: $search, limit: $limit, offset: $offset) {
      id
      title
      description
      date
      createdBy {
        id
        name
      }
      attendees {
        id
        name
      }
      comments {
        id
        text
        createdAt
        author {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      description
      date
      createdBy { id name }
    }
  }
`;

export const JOIN_EVENT = gql`
  mutation JoinEvent($eventId: ID!) {
    joinEvent(eventId: $eventId) {
      id
      attendees { id name }
    }
  }
`;

export const ADD_COMMENT = gql`
  mutation AddComment($input: CreateCommentInput!) {
    addComment(input: $input) {
      id
      text
      createdAt
      author { id name }
      event { id }
    }
  }
`;