/* eslint-disable @typescript-eslint/no-explicit-any */
export async function gqlRequest(query: string, variables: any = {}) {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      : "";

  const res = await fetch(`${baseUrl}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store", // disable caching in server components
  });

  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}

