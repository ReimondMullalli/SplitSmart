import { handle, readJson } from "@/server/http";
import { addExpense, parseId } from "@/server/splitsmart";

type Ctx = { params: Promise<{ groupId: string }> };

// FR3: record an expense split equally among selected participants
export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const groupId = parseId((await params).groupId, "Group");
    return addExpense(groupId, await readJson(request));
  }, 201);
}
