// @vitest-environment jsdom
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import type { SettingsScopeSearch } from "./settingsScope";

interface ScopeState {
  readonly search: SettingsScopeSearch;
  readonly environmentId: string | null;
}

const state = vi.hoisted(() => ({
  pathname: "/settings/providers",
  mobile: false,
  scope: { search: {}, environmentId: null } as ScopeState,
}));
vi.mock("../../hooks/useMediaQuery", () => ({ useIsMobile: () => state.mobile }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: { component: () => ReactNode }) => ({
    options,
    useSearch: () => state.scope.search,
    useNavigate: () => vi.fn(),
  }),
  useLocation: (options?: { select: (location: unknown) => unknown }) => {
    const location = { pathname: state.pathname, hash: "", state: {} };
    return options ? options.select(location) : location;
  },
  useNavigate: () => vi.fn(),
  Navigate: ({ to }: { to: string }) => <div data-navigate={to} />,
  Outlet: () => <StatefulContent />,
  redirect: vi.fn(),
}));
vi.mock("./SettingsScopeContext", async () => {
  const { createContext, useContext } = await import("react");
  const Scope = createContext<ScopeState>(state.scope);
  return {
    SettingsScopeProvider: ({ children }: { children: ReactNode }) => (
      <Scope value={state.scope}>{children}</Scope>
    ),
    useSettingsScope: () => {
      const { search, environmentId } = useContext(Scope);
      return {
        search,
        scope: { kind: "all" },
        environment: environmentId ? { environmentId } : null,
        connectedEnvironments: environmentId ? [{}] : [],
      };
    },
  };
});
vi.mock("../../state/environments", () => ({ useEnvironments: () => ({ environments: [] }) }));
vi.mock("../AppRouteModal", () => ({
  AppRouteModal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AppRouteModalClose: () => null,
}));
vi.mock("./SettingsSidebarNav", () => ({ SettingsSidebarNav: () => null }));
vi.mock("./settingsLayout", () => ({
  SettingsPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("./SettingsBreadcrumb", () => ({ SettingsBreadcrumb: () => null }));
vi.mock("../sidebar/mainAppLocation", () => ({ useNavigateToMainApp: () => vi.fn() }));
vi.mock("./SettingsPanels", () => ({ useSettingsRestore: () => ({ changedSettingLabels: [] }) }));

import { Route } from "../../routes/_chat.settings";

function StatefulContent() {
  const [value, setValue] = useState(0);
  return (
    <button aria-label="Retained value" onClick={() => setValue(value + 1)}>
      {value}
    </button>
  );
}

let root: Root;
let container: HTMLDivElement;
const Layout = Route.options.component!;
await Layout.preload?.();

async function render(scope: ScopeState) {
  state.scope = scope;
  await act(async () => root.render(<Layout />));
}
function retainedValue() {
  return container.querySelector('button[aria-label="Retained value"]')?.textContent ?? null;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.mobile = false;
  vi.stubGlobal("matchMedia", () => ({ matches: state.mobile }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const first = { search: { machine: "first", project: "one" }, environmentId: "first" };
const otherProject = { search: { machine: "first", project: "two" }, environmentId: "first" };
const otherMachine = { search: { machine: "second", project: "one" }, environmentId: "second" };
const implicitFirst = { search: { project: "one" }, environmentId: "first" };
const implicitSecond = { search: { project: "one" }, environmentId: "second" };

const disconnected = { search: first.search, environmentId: null };

it.each([
  ["/settings/providers", "another project", "1", first, otherProject],
  ["/settings/providers", "another environment", "0", first, otherMachine],
  ["/settings/providers", "an implicit environment change", "0", implicitFirst, implicitSecond],
  ["/settings/providers", "a disconnect", "0", first, disconnected],
  ["/settings/keybindings", "another project", "0", first, otherProject],
])("%s after %s shows %s", async (pathname, _change, expected, before, after) => {
  state.pathname = pathname;
  await render(before);
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[aria-label="Retained value"]')?.click(),
  );
  expect(retainedValue()).toBe("1");

  await render(after);

  expect(retainedValue()).toBe(expected);
});

it.each([
  ["/settings/integrations", "", "?machine=m1", "/settings/browser?machine=m1"],
  ["/settings/storage", "", "", "/settings/maintenance"],
  ["/settings/connections", "network-access", "", "/settings/access#network-access"],
  ["/settings", "", "", null],
])("%s%s redirects old links", async (pathname, hash, searchStr, href) => {
  const { redirect } = await import("@tanstack/react-router");
  vi.mocked(redirect).mockClear();
  try {
    Route.options.beforeLoad?.({ location: { pathname, hash, searchStr } } as never);
  } catch {
    // The mocked redirect returns nothing, so the throw carries no payload.
  }
  expect(redirect).toHaveBeenCalledTimes(1);
  expect(redirect).toHaveBeenCalledWith(
    href === null ? { to: "/settings/general", replace: true } : { href, replace: true },
  );
});

it("keeps /settings as the section list on phones", async () => {
  const { redirect } = await import("@tanstack/react-router");
  vi.mocked(redirect).mockClear();
  state.mobile = true;
  Route.options.beforeLoad?.({
    location: { pathname: "/settings", hash: "", searchStr: "" },
  } as never);
  expect(redirect).not.toHaveBeenCalled();
});

it("sends a window that grew past phone width from /settings to General", async () => {
  state.pathname = "/settings";
  await render(first);
  expect(container.querySelector("[data-navigate]")?.getAttribute("data-navigate")).toBe(
    "/settings/general",
  );
});
