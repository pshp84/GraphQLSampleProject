import type { Metadata } from "next";
import "./globals.css";
import ApolloWrapper from "../components/ApolloWrapper";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "EventHub",
  description: "Event management app with GraphQL + Apollo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApolloWrapper>
          <AuthProvider>
            {children}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              pauseOnHover
            />
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
