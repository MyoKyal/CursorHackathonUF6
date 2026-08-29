import { ThreadView } from "@/components/messages";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <ThreadView threadId={threadId} />;
}
