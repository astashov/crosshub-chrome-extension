chrome.extension.onMessage.addListener(function(message, sender) {
  if (message && message.crossts) {
    if (message.crossts.action === 'initPopup') {
        chrome.pageAction.show(sender.tab.id);
        var pathname = decodeURIComponent(sender.tab.url.replace(/https?:\/\/(www.)?github.com\//, ""));
        var basePath = pathname.split("/").slice(0, 2).join("/");
        var token = localStorage.getItem(basePath + "/crosstsToken");
        var jsonUrl = localStorage.getItem(basePath + "/crosstsUrl");
        var enabled = localStorage.getItem(basePath + "/crosstsEnabled").toString() === "true";
        chrome.tabs.sendMessage(
          sender.tab.id, {crossts: {action: 'popupInitialized', jsonUrl: jsonUrl, token: token, enabled: enabled}});
    }
  }
});
