import { handle } from "@/server/http";
import { getGroupDetail, parseId } from "@/server/splitsmart";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

// FR2/FR4/FR5: members, expense history and balances of one group
export async function GET(_request: Request, { params }: Ctx) {
  return handle(async () => getGroupDetail(parseId((await params).groupId, "Group")));
}
