import { SHARED_BROWSER_PROFILE_ID } from "@t3tools/contracts";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { browserMiniPlayerSource, usePreviewMiniPlayerStore } from "~/previewMiniPlayerStore";
import { useThreadShells } from "~/state/entities";
import { previewEnvironment } from "~/state/preview";
import { useAtomCommand } from "~/state/use-atom-command";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { SettingsRow } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

/** The browser lives on the selected environment, independently of provider accounts. */
export function SharedBrowserSetting() {
  const { scope, target } = useSettingsScope();
  const enabled = useScopedSettings((settings) => settings.enableSharedBrowser);
  const browserAccess = useScopedSettings((settings) => settings.enableAgentBrowserAccess);
  const mixed = useScopedSettingsMixed(["enableSharedBrowser"]);
  const update = useUpdateScopedSettings();
  const navigate = useNavigate();
  const threads = useThreadShells();
  const eligible = (candidate: (typeof threads)[number]) =>
    candidate.environmentId === target?.environmentId && candidate.lineage.parentThreadId === null;
  const thread =
    threads.find((candidate) => eligible(candidate) && candidate.archivedAt === null) ??
    threads.find(eligible);
  const open = useAtomCommand(previewEnvironment.open, { reportFailure: false });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const environmentScope = scope.kind !== "project" && scope.kind !== "checkout";
  const openBrowser = async () => {
    if (!target || !thread || pending) return;
    setPending(true);
    setResult(null);
    try {
      const outcome = await open({
        environmentId: target.environmentId,
        input: {
          threadId: thread.id,
          profileId: SHARED_BROWSER_PROFILE_ID,
          runtime: "server",
          reveal: true,
        },
      });
      if (outcome._tag === "Failure") throw squashAtomCommandFailure(outcome);
      setResult(
        `Browser opened on ${target.label}. Sign in to your sites there. Providers with Preview tools use these saved logins.`,
      );
      await navigate({
        to: "/$environmentId/$threadId",
        params: {
          environmentId: target.environmentId,
          threadId: thread.id,
        },
      });
      usePreviewMiniPlayerStore
        .getState()
        .open(
          { environmentId: target.environmentId, threadId: thread.id },
          browserMiniPlayerSource(outcome.value.tabId),
        );
    } catch (cause) {
      setResult(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <SettingsRow
      serverScoped
      settingKeys={["enableSharedBrowser"]}
      title="Shared browser"
      description={
        <span className="block space-y-2">
          <span className="block">
            Use one website login profile on {target?.label ?? "the selected computer"}. Sign-ins
            stay on that server, including when you connect from a phone.
          </span>
          <span className="block">
            Disconnect keeps saved logins. Your normal Chrome profile stays separate.
          </span>
          <span className="block">
            Provider support requires Leonidas Code Preview tools. Providers without those tools
            cannot use this connection.
          </span>
          {!browserAccess ? (
            <span className="block">
              AI browser access is off. Turn it on above to let agents use this profile.
            </span>
          ) : null}
          {!environmentScope ? (
            <span className="block">Select a computer in Settings to change this connection.</span>
          ) : null}
          {enabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!target || !thread || pending}
              onClick={() => void openBrowser()}
            >
              {pending ? "Opening browser..." : "Open shared browser"}
            </Button>
          ) : null}
          {enabled && !thread ? (
            <span className="block">
              Create a thread on the selected server, then open the shared browser.
            </span>
          ) : null}
          <span className="block" role="status">
            {result ??
              (enabled
                ? "Enabled for AI access. Open the browser to sign in or check a site."
                : "Disconnected. AI accounts cannot use this profile.")}
          </span>
        </span>
      }
      control={
        <Switch
          aria-label="Shared browser"
          mixed={mixed}
          checked={mixed ? false : enabled}
          disabled={!target || !environmentScope}
          onCheckedChange={(value) => {
            setResult(null);
            update({ enableSharedBrowser: value });
          }}
        />
      }
    />
  );
}
