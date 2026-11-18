import { handle, readJson } from "@/server/http";
import { createGroup, listGroups } from "@/server/splitsmart";

export const dynamic = "force-dynamic";

// FR1: view existing groups
export async function GET() {
  return handle(() => listGroups());
}

// FR1: create a group
export async function POST(request: Request) {
  return handle(async () => createGroup(await readJson(request)), 201);
}
