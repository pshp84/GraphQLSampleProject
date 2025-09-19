import { schema, root } from "../../../../lib/schema";
import { graphql } from "graphql";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query, variables } = await req.json();

  const result = await graphql({
    schema,
    source: query,
    rootValue: root,
    variableValues: variables,
  });

  return NextResponse.json(result);
}
