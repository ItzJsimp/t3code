# Use one browser across AI accounts

The shared browser keeps website logins in a dedicated profile on one computer.
Claude accounts, Codex, and other providers with Leonidas Code browser tools use that same profile.
It does not need the Claude in Chrome extension or a matching Claude account.

## Connect

1. Open **Settings > Browser**.
2. Select the computer that will run the browser.
3. Turn on **Shared browser** under **Website logins**.
4. Select **Open shared browser**. The app checks browser startup and opens the browser in a chat.
5. Enter your site's address in the browser and sign in yourself.

If this computer has no saved chat, create a chat first. Then return to this setting.
Sign-ins stay in this profile after closing the browser or restarting the app.
Your normal Chrome profile and ordinary Preview profiles keep their own sign-ins.

Ask an agent to open a logged-in site, such as your Whop course.
The agent checks browser status and opens its own tab in the shared profile.
Development servers and public pages keep using ordinary Preview profiles.
You handle passwords, MFA, and CAPTCHA. Agents ask before purchases, posts, or messages.

## Disconnect

Turn off **Shared browser**. Existing agent sessions lose access to that profile.
Saved website logins remain on the computer for the next connection.
The normal Preview tools remain available if **AI browser access** is on.
Turning off the shared connection adds no browser tool definitions to new sessions.

## Troubleshoot

- **Disabled:** enable Shared browser on the computer that owns the profile.
- **Profile in use:** close the other browser using this dedicated profile, then try again.
- **Browser could not start:** check the computer's browser setup and available disk space. Retry Open shared browser.
- **Connection lost:** select Open shared browser again.
- **No shared profile in agent status:** check Shared browser and AI browser access, then start a new agent session.
- **Provider has no browser tools:** use a provider session that exposes Leonidas Code's Preview tools. A setting cannot add unsupported provider capabilities.

When you connect from another device, the browser runs on the selected computer.
Each computer has its own shared profile. Website logins do not sync between computers.
