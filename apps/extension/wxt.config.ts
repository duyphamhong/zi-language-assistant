export default {
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AI Message Assistant',
    description: 'Improve message drafts through a local native host.',
    version: '0.1.0',
    permissions: ['nativeMessaging', 'storage'],
    action: { default_popup: 'popup.html' },
    options_page: 'options.html',
  },
};
