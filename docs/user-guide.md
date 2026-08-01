# AI Message Assistant User Guide

AI Message Assistant helps you improve a message draft before you send it. It
uses a Chrome extension and a small local companion app. The extension never
stores your OpenAI API key; the companion app keeps it in Windows Credential
Manager.

> **Availability:** The Chrome Web Store listing is available after its review
> is approved. The native-host package is already published on npm.

## What you need

- Windows
- Google Chrome
- Node.js 24 or later (includes npm)
- An OpenAI API key if you want live AI suggestions
- The AI Message Assistant Chrome extension

The supported browser editors are Microsoft Teams for Web and WhatsApp Web.
The assistant supports plain-text message drafts only. It does not support
attachments, images, cards, mentions, tables, code blocks, or other rich
content.

## 1. Install the Chrome extension

1. Open the [AI Message Assistant Chrome Web Store listing](https://chromewebstore.google.com/detail/ejlijmigpbfmfajlfihclmakonpgdoap).
2. Select **Add to Chrome** and confirm the requested permissions.
3. Optionally pin the extension from Chrome's Extensions menu so its icon is
   always visible.

The extension ID is `ejlijmigpbfmfajlfihclmakonpgdoap`. You do not need to copy
or enter this ID during a normal installation.

## 2. Install Node.js and npm

Download and install Node.js 24 or later from [nodejs.org](https://nodejs.org/).
After the installer finishes, open a new PowerShell window and check the
version:

```powershell
node --version
```

The result must be `v24` or newer.

## 3. Install the local companion app

In PowerShell, run:

```powershell
npm.cmd install --global @duyphamhong/ai-message-host
```

The installation automatically registers the local companion with Chrome for
the production extension. No extension ID or manual registry edit is required.

If PowerShell reports that `npm.ps1` cannot run because scripts are disabled,
continue to use `npm.cmd` as shown above. Alternatively, you can enable local
PowerShell scripts for your Windows account:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

If you installed with `--ignore-scripts`, registration did not run
automatically. Complete it manually:

```powershell
ai-message-host install
```

## 4. Check the connection

1. Close and reopen Chrome, or reload the extension from `chrome://extensions`.
2. Select the AI Message Assistant icon in Chrome.
3. Select **Run health check**.

The status should be **Connected**. You can also check from PowerShell:

```powershell
ai-message-host status
```

`registered: true` confirms that Chrome can find the local companion app.

## 5. Configure your OpenAI API key

To configure live suggestions, run the following command in an interactive
PowerShell window:

```powershell
ai-message-host configure
```

When prompted, paste your OpenAI API key and press Enter. The characters are
not displayed while you type. The key is stored only in Windows Credential
Manager under `com.appzihub.ai-message-assistant`; it is not stored in Chrome,
the extension, an npm file, or a Native Messaging request.

Run this command to confirm the setup without revealing the key:

```powershell
ai-message-host status
```

You should see `apiKeyConfigured: true` and the model configured by the app.

## 6. Improve a message

### Microsoft Teams for Web

1. Open a supported Teams web chat and type a plain-text draft.
2. Select **Polish with AI** in the message composer.
3. Review the suggested text and tone in the preview.
4. Choose **Replace draft** only if you want to use the suggestion.
5. Review the resulting draft, then send it yourself.

The extension reads the draft only after you select **Polish with AI**. It does
not send messages, click Teams' Send button, or submit keyboard send shortcuts.

### WhatsApp Web

1. Open [WhatsApp Web](https://web.whatsapp.com/) and type a plain-text draft.
2. Select **Polish with AI**.
3. Review the suggestion.
4. Select **Copy suggested draft**, then paste it into WhatsApp yourself.
5. Review and send the message yourself.

For WhatsApp Web, the extension only copies the approved suggestion. It never
replaces or sends your WhatsApp draft.

## Test the assistant without Teams or WhatsApp

1. Select the extension icon in Chrome.
2. Select **Open options**.
3. Enter a short draft, choose an operation, and select **Improve message**.

This is a convenient way to confirm the extension, native host, and configured
OpenAI API key are working.

## Updating

Update the local companion whenever a new version is released:

```powershell
npm.cmd update --global @duyphamhong/ai-message-host
```

The update registers the companion again automatically. Reload the Chrome
extension afterwards if Chrome was already running.

Chrome updates the extension automatically after a new Store version is
available. You can also open `chrome://extensions`, enable **Developer mode**,
and select **Update** to request an update check.

## Troubleshooting

### The extension says the local host is disconnected

1. Confirm Node.js is installed: `node --version`.
2. Confirm the companion is registered: `ai-message-host status`.
3. If `registered` is `false`, run `ai-message-host install`.
4. Reload the extension or restart Chrome, then run the health check again.

### `ai-message-host` is not recognized

Close and reopen PowerShell after the npm installation. If it is still not
available, run `npm.cmd prefix --global` to locate npm's global bin directory
and ensure that directory is on your Windows `PATH`.

### An API key or provider error appears

Run:

```powershell
ai-message-host status
ai-message-host doctor
```

Then re-run `ai-message-host configure` in an interactive terminal. Do not
paste an API key into Chrome, a chat, a configuration file, or a support
ticket.

### The editor is not supported

Use one visible, enabled, plain-text composer on Microsoft Teams for Web or
WhatsApp Web. Remove unsupported rich content and try again. The extension does
not support Slack or arbitrary web text editors.

## Uninstalling

First remove the Chrome registration, then remove the npm package:

```powershell
ai-message-host uninstall
npm.cmd uninstall --global @duyphamhong/ai-message-host
```

Finally, remove the extension from `chrome://extensions` if you no longer want
to use it.

The uninstall command intentionally retains your API key in Windows Credential
Manager. To remove it too, open **Credential Manager** > **Windows
Credentials**, locate `com.appzihub.ai-message-assistant`, and remove that
credential.

## Privacy and control

- Your message draft is processed only after you explicitly invoke the
  assistant.
- Only the active draft required for the requested improvement is sent to the
  local companion and, in live mode, to OpenAI over HTTPS.
- The extension never receives your OpenAI API key.
- Suggestions remain advisory: you decide whether to replace, paste, send, or
  discard them.

Read the [Privacy Policy](privacy-policy.md) for more detail.
