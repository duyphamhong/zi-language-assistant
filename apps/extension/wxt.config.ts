export default {
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Message Assistant',
    description: 'Improve message drafts through a local native host.',
    version: '0.1.0',
    permissions: [
      'nativeMessaging',
      'storage',
      'scripting',
      'debugger',
      'clipboardWrite',
    ],
    host_permissions: [
      'https://teams.microsoft.com/*',
      'https://teams.cloud.microsoft/*',
      'https://teams.live.com/*',
      'https://web.whatsapp.com/*',
    ],
    action: { default_popup: 'popup.html' },
    options_page: 'options.html',
  },
};
