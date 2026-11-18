import { handle, readJson } from "@/server/http";
import { addMember, parseId } from "@/server/splitsmart";

type Ctx = { params: Promise<{ groupId: string }> };

// FR2: add a member to a group
export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const groupId = parseId((await params).groupId, "Group");
    return addMember(groupId, await readJson(request));
  }, 201);
}
