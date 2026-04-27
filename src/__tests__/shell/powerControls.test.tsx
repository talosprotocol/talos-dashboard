// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpstreamsPage from "../../app/(shell)/llm/upstreams/page";
import ModelGroupsPage from "../../app/(shell)/llm/models/page";
import McpServersPage from "../../app/(shell)/mcp/servers/page";

const { toastMock, dataSourceMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  dataSourceMock: {
    listUpstreams: vi.fn(),
    updateUpstream: vi.fn(),
    listModelGroups: vi.fn(),
    updateModelGroup: vi.fn(),
    listMcpServers: vi.fn(),
    updateMcpServer: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/data/DataSource", () => ({
  dataSource: dataSourceMock,
}));

describe("dashboard shell power controls", () => {
  beforeEach(() => {
    toastMock.mockReset();
    dataSourceMock.listUpstreams.mockReset();
    dataSourceMock.updateUpstream.mockReset();
    dataSourceMock.listModelGroups.mockReset();
    dataSourceMock.updateModelGroup.mockReset();
    dataSourceMock.listMcpServers.mockReset();
    dataSourceMock.updateMcpServer.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("toggles upstream enabled state through the data source", async () => {
    dataSourceMock.listUpstreams.mockResolvedValue([
      {
        id: "openai-main",
        provider: "openai",
        endpoint: "https://api.openai.com/v1",
        credentials_ref: "secret:openai",
        tags: { tier: "pro" },
        enabled: true,
        version: 1,
      },
    ]);
    dataSourceMock.updateUpstream.mockResolvedValue({
      id: "openai-main",
      provider: "openai",
      endpoint: "https://api.openai.com/v1",
      credentials_ref: "secret:openai",
      tags: { tier: "pro" },
      enabled: false,
      version: 2,
    });

    render(<UpstreamsPage />);

    const toggle = await screen.findByRole("button", {
      name: /disable upstream openai-main/i,
    });
    await userEvent.click(toggle);

    await waitFor(() =>
      expect(dataSourceMock.updateUpstream).toHaveBeenCalledWith(
        "openai-main",
        { enabled: false },
        1,
      ),
    );
    expect(await screen.findByText("Disabled")).toBeTruthy();
  });

  it("toggles model group enabled state through the data source", async () => {
    dataSourceMock.listModelGroups.mockResolvedValue([
      {
        id: "gpt-4-prod",
        name: "GPT-4 Production",
        deployments: [],
        fallback_groups: [],
        routing_policy_id: "default",
        enabled: true,
        version: 4,
      },
    ]);
    dataSourceMock.updateModelGroup.mockResolvedValue({
      id: "gpt-4-prod",
      name: "GPT-4 Production",
      deployments: [],
      fallback_groups: [],
      routing_policy_id: "default",
      enabled: false,
      version: 5,
    });

    render(<ModelGroupsPage />);

    const toggle = await screen.findByRole("button", {
      name: /disable model group gpt-4-prod/i,
    });
    await userEvent.click(toggle);

    await waitFor(() =>
      expect(dataSourceMock.updateModelGroup).toHaveBeenCalledWith(
        "gpt-4-prod",
        { enabled: false },
        4,
      ),
    );
    expect(await screen.findByText("Disabled")).toBeTruthy();
  });

  it("toggles MCP server enabled state through the data source", async () => {
    dataSourceMock.listMcpServers.mockResolvedValue([
      {
        id: "filesystem",
        name: "Filesystem",
        endpoint: "stdio://cat",
        enabled: true,
        version: 2,
      },
    ]);
    dataSourceMock.updateMcpServer.mockResolvedValue({
      id: "filesystem",
      name: "Filesystem",
      endpoint: "stdio://cat",
      enabled: false,
      version: 3,
    });

    render(<McpServersPage />);

    const toggle = await screen.findByRole("button", {
      name: /disable MCP server filesystem/i,
    });
    await userEvent.click(toggle);

    await waitFor(() =>
      expect(dataSourceMock.updateMcpServer).toHaveBeenCalledWith(
        "filesystem",
        { enabled: false },
        2,
      ),
    );
    expect(await screen.findByText("Offline")).toBeTruthy();
  });
});
