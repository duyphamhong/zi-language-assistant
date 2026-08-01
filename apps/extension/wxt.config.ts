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
      'https://app.slack.com/*',
    ],
    icons: {
      '16': 'icon-16.png',
      '32': 'icon-32.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png',
    },
    action: {
      default_icon: {
        '16': 'icon-16.png',
        '32': 'icon-32.png',
        '48': 'icon-48.png',
      },
      default_popup: 'popup.html',
    },
    options_page: 'options.html',
  },
};
