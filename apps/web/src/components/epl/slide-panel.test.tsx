import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ theme: "dark" }) }));
import { SlidePanel } from "./slide-panel";
afterEach(cleanup);
it("labels the dialog, traps keyboard focus, and restores the opener after Escape", async () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Invite user</button><SlidePanel open={open} onClose={() => setOpen(false)} title="Invite user" footer={<button>Send</button>}><input aria-label="Name" autoFocus /></SlidePanel></>;
  }
  render(<Example />);
  const opener = screen.getByRole("button", { name: "Invite user" }); opener.focus(); fireEvent.click(opener);
  await screen.findByRole("dialog", { name: "Invite user" });
  screen.getByRole("button", { name: "Send" }).focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(opener);
});
