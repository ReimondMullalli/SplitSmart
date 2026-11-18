import { NextResponse } from "next/server";
import { AppError } from "./splitsmart";

/** Run a handler and turn thrown errors into JSON `{ error }` responses. */
export async function handle<T>(fn: () => Promise<T>, successStatus = 200) {
  try {
    const data = await fn();
    return NextResponse.json(data, { status: successStatus });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
  }
}

/** Parse a JSON request body, rejecting malformed JSON with a 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  throw new AppError("Request body must be a JSON object.");
}
