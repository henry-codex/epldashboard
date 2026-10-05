import type { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { queryClient } from "./trpc";

vi.mock("@epl-fellows-platform/env/web", () => ({
  env: { NEXT_PUBLIC_SERVER_URL: "http://localhost:4300" },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

function clickRetry() {
  const action = vi.mocked(toast.error).mock.calls.at(-1)?.[1]?.action;
  if (!action || typeof action !== "object" || !("onClick" in action)) {
    throw new Error("Expected an error toast with a Retry action");
  }
  // A button invokes this callback without the Query instance as its receiver.
  const onClick = action.onClick;
  onClick({} as MouseEvent<HTMLButtonElement>);
}

describe("query error toast", () => {
  it("retries the failed query without crashing or refetching other queries", async () => {
    const queryKey = ["members"];
    const failedQuery = vi.fn()
      .mockRejectedValueOnce(new Error("Could not load members"))
      .mockResolvedValueOnce(["Ama"]);
    const otherQuery = vi.fn().mockResolvedValue(["Other hub"]);

    await queryClient.fetchQuery({ queryKey: ["members", "other-hub"], queryFn: otherQuery });
    await expect(queryClient.fetchQuery({
      queryKey, queryFn: failedQuery, retry: false,
    })).rejects.toThrow("Could not load members");

    expect(() => clickRetry()).not.toThrow();
    await waitFor(() => expect(queryClient.getQueryData(queryKey)).toEqual(["Ama"]));
    expect(failedQuery).toHaveBeenCalledTimes(2);
    expect(otherQuery).toHaveBeenCalledTimes(1);
  });

  it("reports a failed retry through the toast without an unhandled rejection", async () => {
    const failedQuery = vi.fn().mockRejectedValue(new Error("Server unavailable"));
    await expect(queryClient.fetchQuery({
      queryKey: ["members"], queryFn: failedQuery, retry: false,
    })).rejects.toThrow("Server unavailable");

    expect(() => clickRetry()).not.toThrow();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryState(["members"])?.status).toBe("error");
    expect(failedQuery).toHaveBeenCalledTimes(2);
  });
});
