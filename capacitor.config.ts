import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boopathi.teamkitty',
  appName: 'TeamKitty',
  webDir: 'dist',
  plugins: {
    // iOS's default keyboard handling ("native") resizes the WKWebView's
    // own scroll view when the keyboard shows/hides. When a form submit
    // (creating a season, a ledger entry, etc.) blurs the focused input
    // programmatically -- as a side effect of a React state update rather
    // than a direct user tap -- WKWebView's resize sometimes fails to
    // fully restore, leaving the page laid out for a keyboard that's no
    // longer there until the app is force-closed and reopened. "body"
    // mode has Capacitor resize the <body> element itself based on the
    // keyboard's reported height instead, which sidesteps that bug.
    Keyboard: {
      resize: 'body'
    }
  }
};

export default config;
