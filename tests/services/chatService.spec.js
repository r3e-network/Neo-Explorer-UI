import { beforeEach, describe, expect, it, vi } from "vitest";

describe("chatService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("fetches unread notifications with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        unreadCount: 2,
        notifications: [{ roomId: "room-1" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { chatService } = await import("../../src/services/chatService.js");
    const result = await chatService.getNotifications();

    expect(fetchMock).toHaveBeenCalledWith("/api/chat/notifications", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
    expect(result.unreadCount).toBe(2);
    expect(result.notifications[0]).toEqual(
      expect.objectContaining({ roomId: "room-1" })
    );
  });

  it("posts chat messages to the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        message: { id: "msg-1", body: "hello" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { chatService } = await import("../../src/services/chatService.js");
    const result = await chatService.sendMessage({
      roomId: "room-1",
      recipientAddress: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
      body: "hello",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/chat/messages", expect.objectContaining({
      method: "POST",
      credentials: "include",
    }));
    expect(result).toEqual(
      expect.objectContaining({ id: "msg-1", body: "hello", content: "hello" })
    );
  });
});
