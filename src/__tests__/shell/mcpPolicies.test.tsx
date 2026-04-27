// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import McpPoliciesPage from "../../app/(shell)/mcp/policies/page";

const { toastMock, dataSourceMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  dataSourceMock: {
    listMcpPolicies: vi.fn(),
    upsertMcpPolicy: vi.fn(),
    deleteMcpPolicy: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/data/DataSource", () => ({
  dataSource: dataSourceMock,
}));

describe("dashboard shell MCP policies", () => {
  beforeEach(() => {
    toastMock.mockReset();
    dataSourceMock.listMcpPolicies.mockReset();
    dataSourceMock.upsertMcpPolicy.mockReset();
    dataSourceMock.deleteMcpPolicy.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and displays policies", async () => {
    dataSourceMock.listMcpPolicies.mockResolvedValue([
      {
        id: "test-policy",
        team_id: "test-team",
        allowed_servers: ["fs", "github"],
        allowed_tools: ["read_file", "search"],
      },
    ]);

    render(<McpPoliciesPage />);

    expect(await screen.findByText("test-policy")).toBeTruthy();
    expect(await screen.findByText("test-team")).toBeTruthy();
    expect(await screen.findByText("fs")).toBeTruthy();
    expect(await screen.findByText("github")).toBeTruthy();
    expect(await screen.findByText("read_file, search")).toBeTruthy();
  });

  it("creates a new policy", async () => {
    dataSourceMock.listMcpPolicies.mockResolvedValue([]);
    dataSourceMock.upsertMcpPolicy.mockResolvedValue({
      id: "new-policy",
      team_id: "new-team",
      allowed_servers: ["memory"],
      allowed_tools: ["*"],
    });

    render(<McpPoliciesPage />);

    const newBtn = await screen.findByRole("button", { name: /New Policy/i });
    await userEvent.click(newBtn);

    const idInput = await screen.findByPlaceholderText("e.g. engineering-full");
    const teamInput = await screen.findByPlaceholderText("e.g. engineering");
    const serversInput = await screen.findByPlaceholderText("filesystem, memory, slack");
    const toolsInput = await screen.findByPlaceholderText("*");

    await userEvent.clear(idInput);
    await userEvent.type(idInput, "new-policy");
    await userEvent.clear(teamInput);
    await userEvent.type(teamInput, "new-team");
    await userEvent.clear(serversInput);
    await userEvent.type(serversInput, "memory");
    await userEvent.clear(toolsInput);
    await userEvent.type(toolsInput, "my-tool");

    const createBtn = await screen.findByRole("button", { name: /Create Policy/i });
    await userEvent.click(createBtn);

    await waitFor(() => {
      expect(dataSourceMock.upsertMcpPolicy).toHaveBeenCalledWith({
        id: "new-policy",
        team_id: "new-team",
        allowed_servers: ["memory"],
        allowed_tools: ["my-tool"],
      });
    });

    expect(await screen.findByText("new-policy")).toBeTruthy();
  });

  it("deletes a policy", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    
    dataSourceMock.listMcpPolicies.mockResolvedValue([
      {
        id: "test-policy",
        team_id: "test-team",
        allowed_servers: [],
        allowed_tools: ["*"],
      },
    ]);

    render(<McpPoliciesPage />);

    expect(await screen.findByText("test-policy")).toBeTruthy();

    // Hover over the row isn't necessary for screen reader to find the button
    // But we need to make sure the delete button is accessible or we find it by some means
    // Since it's an icon button, we might need to find by title or role
    // Wait for the policy to be rendered and find the button
    const deleteBtn = await screen.findByRole("button", { name: "" }, {
        // the button has no aria-label, but we can find it by looking for the Trash2 icon or just queryAllByRole
    });

    // Actually, in the page.tsx, the button has no aria-label but has a trash icon. We can just select it by querying button that doesn't have "New Policy" text if there's only one.
    // Wait, let's just grab the second button on the page (first is New Policy, second is edit, third is delete).
    const buttons = await screen.findAllByRole("button");
    const del = buttons[buttons.length - 1]; // delete button is the last one
    
    await userEvent.click(del);

    await waitFor(() => {
      expect(dataSourceMock.deleteMcpPolicy).toHaveBeenCalledWith("test-policy");
    });
    
    confirmSpy.mockRestore();
  });
});