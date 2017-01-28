chrome.extension.onMessage.addListener(function(message, sender) {
  if (message && message.crosshub) {
    if (message.crosshub.action === 'initPopup') {
        chrome.pageAction.show(sender.tab.id);
        var pathname = decodeURIComponent(sender.tab.url.replace(/https?:\/\/(www.)?github.com\//, ""));
        var basePath = pathname.split("/").slice(0, 2).join("/");
        var token = localStorage.getItem(basePath + "/crosshubToken");
        var jsonUrl = localStorage.getItem(basePath + "/crosshubUrl");
        var enabled = localStorage.getItem(basePath + "/crosshubEnabled").toString() === "true";
        chrome.tabs.sendMessage(
          sender.tab.id, {crosshub: {action: 'popupInitialized', jsonUrl: jsonUrl, token: token, enabled: enabled}});
    }
  }
});
