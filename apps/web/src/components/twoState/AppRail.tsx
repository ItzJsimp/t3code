import { Link, useLocation, useParams } from "@tanstack/react-router";
import {
  AudioLinesIcon,
  BellIcon,
  BotIcon,
  BrainIcon,
  ChartNoAxesColumnIcon,
  ClapperboardIcon,
  FolderKanbanIcon,
  FolderOpenIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  ListChecksIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  SettingsIcon,
  SunIcon,
  TerminalSquareIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { APP_VERSION_LABEL } from "~/branding";
import { openReleaseHistoryDialog } from "~/components/desktop/ReleaseHistoryDialog";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { WorkspaceSwitcher } from "~/components/workspace/WorkspaceSwitcher";
import { useActiveAiosWorkspace } from "~/components/workspace/useActiveAiosWorkspace";
import { useWorkspacePictures, WorkspacePicture } from "~/components/workspace/WorkspacePicture";
import { isElectron } from "~/env";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { cn, isMacPlatform } from "~/lib/utils";
import { usePrimaryEnvironment } from "~/state/environments";
import {
  EMPTY_SETUP_STATE,
  SETUP_STATE_STORAGE_KEY,
  SetupStateSchema,
} from "~/onboarding/setupState.logic";
import { resolveThreadRouteTarget } from "~/threadRoutes";

import {
  activeRailId,
  badgeAnnouncement,
  railItems,
  railLinkLabel,
  type RailItem,
} from "./railItems";
import { Tip } from "./Tip";
import { useTwoStateStore } from "./twoStateStore";
import { useTwoStateCounts } from "./useTwoStateData";

const ICONS: Readonly<Record<string, LucideIcon>> = {
  "command-center": LayoutDashboardIcon,
  chat: MessageSquareIcon,
  scribe: AudioLinesIcon,
  inbox: BellIcon,
  today: SunIcon,
  tasks: ListChecksIcon,
  projects: FolderKanbanIcon,
  memory: BrainIcon,
  library: LibraryIcon,
  content: MegaphoneIcon,
  deals: ClapperboardIcon,
  images: ImageIcon,
  files: FolderOpenIcon,
  subagents: BotIcon,
  team: UsersIcon,
  developer: TerminalSquareIcon,
  usage: ChartNoAxesColumnIcon,
  settings: SettingsIcon,
};

const TARGET_CLASS =
  "relative inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none [-webkit-app-region:no-drag]";
const ACTIVE_CLASS = "border-border bg-surface-raised text-foreground";

/** "99+" past 99, so the badge stays small. */
export const badgeText = (count: number) => (count > 99 ? "99+" : String(count));

/** The only app navigation: one icon per page. Chat opens the last chat, else the chat start page. */
export function AppRail({ expanded = false }: { readonly expanded?: boolean }) {
  const { active } = useActiveAiosWorkspace();
  const [setup] = useLocalStorage(SETUP_STATE_STORAGE_KEY, EMPTY_SETUP_STATE, SetupStateSchema);
  const lastThread = useTwoStateStore((state) => state.lastThread);
  // Same number as the Needs you tile and card: the badge counts what needs you.
  const unread = useTwoStateCounts().needsYou;
  const [announcement, setAnnouncement] = useState("");
  const previousUnread = useRef<number | null>(null);
  useEffect(() => {
    const text = badgeAnnouncement(previousUnread.current, unread);
    previousUnread.current = unread;
    if (text) setAnnouncement(text);
  }, [unread]);
  const pathname = useLocation({ select: (location) => location.pathname });
  const onChat = useParams({
    strict: false,
    select: (params) => resolveThreadRouteTarget(params) !== null,
  });
  const scribeSupported =
    usePrimaryEnvironment()?.serverConfig?.environment.platform.os === "windows";
  const { main, bottom } = railItems({
    business: active?.type === "business",
    builder: setup.coder === true,
    scribe: scribeSupported,
  });
  const current = activeRailId(pathname, onChat);
  const renderItem = (item: RailItem) => (
    <RailLink
      key={item.id}
      item={item}
      current={item.id === current}
      lastThread={lastThread}
      expanded={expanded}
      badge={item.id === "inbox" ? (unread ?? 0) : 0}
    />
  );
  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex h-full shrink-0 flex-col gap-1 border-r border-border bg-card pb-2",
        // Empty rail space moves the window, as a title bar does. Its links and buttons stay clickable.
        isElectron && "drag-region",
        expanded ? "w-full items-stretch px-2" : "w-[52px] items-center",
        isElectron && isMacPlatform(navigator.platform) ? "pt-10" : "pt-2",
      )}
    >
      <WorkspaceAvatar />
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div
        className="mt-1 flex min-h-0 flex-1 flex-col items-center gap-1 scrollbar-gutter-both overflow-y-auto data-[expanded=true]:items-stretch"
        data-expanded={expanded}
      >
        {main.map(renderItem)}
      </div>
      <div
        className="flex flex-col items-center gap-1 data-[expanded=true]:items-stretch"
        data-expanded={expanded}
      >
        {bottom.map(renderItem)}
      </div>
      {expanded ? (
        // The drawer is the phone's only menu, so the version lives here. Tap for what changed.
        <button
          type="button"
          onClick={openReleaseHistoryDialog}
          className="mt-1 h-11 rounded-md px-2.5 text-left text-xs text-muted-foreground tabular-nums outline-hidden ring-ring focus-visible:ring-2 focus-visible:ring-inset"
        >
          Leonidas v{APP_VERSION_LABEL} · what changed
        </button>
      ) : null}
    </nav>
  );
}

function RailLink({
  item,
  current,
  lastThread,
  expanded,
  badge,
}: {
  readonly item: RailItem;
  readonly current: boolean;
  readonly lastThread: ReturnType<typeof useTwoStateStore.getState>["lastThread"];
  readonly expanded: boolean;
  readonly badge: number;
}) {
  const Icon = ICONS[item.id] ?? LayoutDashboardIcon;
  const label = railLinkLabel(item.label, badge);
  const common = {
    "aria-label": label,
    "aria-current": current ? ("page" as const) : undefined,
    className: cn(
      TARGET_CLASS,
      expanded && "w-full justify-start gap-3 px-2.5",
      current && ACTIVE_CLASS,
    ),
  };
  const content: ReactNode = (
    <>
      <Icon aria-hidden className="size-5 shrink-0" />
      {expanded ? <span className="text-sm">{item.label}</span> : null}
      {badge > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 min-w-4 rounded-full bg-warning px-1 text-center text-3xs leading-4 font-semibold text-background tabular-nums"
        >
          {badgeText(badge)}
        </span>
      ) : null}
    </>
  );
  return (
    <Tip text={item.tooltip}>
      {item.id === "chat" && lastThread ? (
        <Link
          to="/$environmentId/$threadId"
          params={{ environmentId: lastThread.environmentId, threadId: lastThread.threadId }}
          {...common}
        >
          {content}
        </Link>
      ) : (
        <Link to={item.to} {...common}>
          {content}
        </Link>
      )}
    </Tip>
  );
}

/** The round workspace avatar. It opens the workspace switcher. */
function WorkspaceAvatar() {
  const { active } = useActiveAiosWorkspace();
  const { pictures } = useWorkspacePictures();
  const name = active?.name ?? "Leonidas";
  return (
    <Popover>
      <Tip text={`Workspace: ${name}`}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Workspace: ${name}. Switch workspace`}
              className="inline-flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised text-xs font-semibold text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [-webkit-app-region:no-drag]"
            />
          }
        >
          <WorkspacePicture
            workspaceId={active?.id}
            name={name}
            pictures={pictures}
            className="size-full text-xs"
          />
        </PopoverTrigger>
      </Tip>
      <PopoverPopup side="right" align="start" className="w-64">
        <p className="px-2 pb-1 text-sm font-medium">{name}</p>
        <WorkspaceSwitcher editPictures />
      </PopoverPopup>
    </Popover>
  );
}
