import type { MessageState } from "@/types/domain";

const RANK: Record<MessageState, number> = {
  prepared: 0,
  awaiting_approval: 0,
  approved: 0,
  not_sent_demo: 0,
  blocked_consent: 0,
  skipped_duplicate: 0,
  failed: 1,
  send_accepted: 2,
  sent: 3,
  delivered: 4,
  read: 5,
  replied: 6,
};

export function nextMessageState(
  current: MessageState,
  incoming: "sent" | "delivered" | "read" | "failed" | "replied",
): MessageState | null {
  if (incoming === "failed") {
    if (current === "send_accepted" || current === "sent") return "failed";
    return null;
  }
  const next = incoming as MessageState;
  if (RANK[next] > RANK[current]) return next;
  return null;
}

export function isTerminalSend(state: MessageState) {
  return ["send_accepted", "sent", "delivered", "read", "replied", "not_sent_demo", "skipped_duplicate"].includes(state);
}
