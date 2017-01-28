(function () {
  function applyTreeCrossts(github, crosstsBaseUrl, crossts) {
    github.path.getRealRef(function (ref) {
      var crosstsUrl = Path.join([crosstsBaseUrl, ref, "crossts.json"]);
      Request.getJson(crosstsUrl, function (json) {
        crossts.applyJson(json);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function applyPullSplitCrossts(github, crosstsBaseUrl, crossts) {
    github.path.getRealRefs(function (refs, repoNames) {
      var oldRef = refs[0];
      var newRef = refs[1];
      var crosstsUrlOld = Path.join([crosstsBaseUrl, oldRef, "crossts.json"]);
      Request.getJson(crosstsUrlOld, function (oldJson) {
        crossts.applyJson(CROSSDART_PULL_OLD, oldJson, oldRef);
      }, Errors.showUrlError);
      var crosstsUrlNew = Path.join([crosstsBaseUrl, newRef, "crossts.json"]);
      Request.getJson(crosstsUrlNew, function (newJson) {
        crossts.applyJson(CROSSDART_PULL_NEW, newJson, newRef);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function applyPullUnifiedCrossts(github, crosstsBaseUrl, crossts) {
    github.path.getRealRefs(function (refs, repoNames) {
      var oldRef = refs[0];
      var newRef = refs[1];
      var crosstsUrlOld = Path.join([crosstsBaseUrl, oldRef, "crossts.json"]);
      Request.getJson(crosstsUrlOld, function (oldJson) {
        crossts.applyJson(CROSSDART_PULL_OLD, oldJson, oldRef);
      }, Errors.showUrlError);
      var crosstsUrlNew = Path.join([crosstsBaseUrl, newRef, "crossts.json"]);
      Request.getJson(crosstsUrlNew, function (newJson) {
        crossts.applyJson(CROSSDART_PULL_NEW, newJson, newRef);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function checkRef(index, github, baseUrl, ref, repoName, callback) {
    var url = baseUrl + repoName + "/" + ref + "/crossts.json";
    Request.head(url, function () {
      Status.show(index, ref, "done");
      callback();
    },
    function () {
      Request.get(baseUrl + repoName + "/" + ref + "/status.txt", function (status) {
        Status.show(index, ref, status);
        if (status !== "error") {
          setTimeout(function () {
            checkRef(index, github, baseUrl, ref, repoName, callback);
          }, 1000);
        }
      }, function () {
        Request.post("https://metadata.crossts.info/analyze", {
          url: "https://github.com/" + repoName,
          sha: ref,
          token: Github.token
        }, function () {
          setTimeout(function () {
            checkRef(index, github, baseUrl, ref, repoName, callback);
          }, 1000);
        });
      });
    });
  }

  function fetchMetadataUrl(shouldReuseCrossts) {
    var github = new Github();
    var baseUrl = "https://www.crossts.info/metadata/";
    if (github.type === Github.PULL_REQUEST) {
      github.path.getRealRefs(function (refs, repoNames) {
        var isOneDone = false;
        checkRef(0, github, baseUrl, refs[0], repoNames[0], function () {
          if (isOneDone) {
            applyCrossts(baseUrl, shouldReuseCrossts);
          }
          isOneDone = true;
        });
        checkRef(1, github, baseUrl, refs[1], repoNames[1], function () {
          if (isOneDone) {
            applyCrossts(baseUrl, shouldReuseCrossts);
          }
          isOneDone = true;
        });
      });
    } else {
      github.path.getRealRef(function (ref) {
        checkRef(0, github, baseUrl, ref, github.basePath, function () {
          applyCrossts(baseUrl, shouldReuseCrossts);
        });
      });
    }
  }

  var crossts;
  function applyCrossts(crosstsBaseUrl, shouldReuseCrossts) {
    if (enabled) {
      if (!crosstsBaseUrl || crosstsBaseUrl.toString().trim() === "") {
        fetchMetadataUrl();
      } else {
        var github = new Github();
        if (Github.isTree()) {
          if (!shouldReuseCrossts || !crossts) {
            crossts = new CrosstsTree(github);
          }
          applyTreeCrossts(github, crosstsBaseUrl, crossts);
        } else if (Github.isPullSplit()) {
          if (!shouldReuseCrossts || !crossts) {
            crossts = new CrosstsPullSplit(github);
          }
          applyPullSplitCrossts(github, crosstsBaseUrl, crossts);
        } else if (Github.isPullUnified()) {
          if (!shouldReuseCrossts || !crossts) {
            crossts = new CrosstsPullUnified(github);
          }
          applyPullUnifiedCrossts(github, crosstsBaseUrl, crossts);
        }
      }
    }
  }

  chrome.extension.sendMessage({crossts: {action: 'initPopup'}});

  var jsonUrl;
  var enabled;
  chrome.runtime.onMessage.addListener(function (request) {
    if (request.crossts) {
      if (request.crossts.action === 'popupInitialized' || request.crossts.action === 'apply') {
        window.Github.token = request.crossts.token;
        jsonUrl = request.crossts.jsonUrl;
        enabled = request.crossts.enabled;
        if (enabled) {
          applyCrossts(jsonUrl, request.crossts.action === 'apply');
        }
      } else if (request.crossts.action === 'tokenLink') {
        location.href = request.crossts.url;
      }
    }
  });

  document.addEventListener(EVENT.LOCATION_CHANGE, function (e) {
    var oldPath = e.detail.before.pathname;
    var newPath = e.detail.now.pathname;
    var condition = false;
    condition = condition || (oldPath !== newPath && Path.isTree(newPath));
    condition = condition || (!Path.isPull(oldPath) && Path.isPull(newPath));
    if (condition) {
      applyCrossts(jsonUrl);
    }
  });

  document.body.addEventListener("click", function (e) {
    var className = e.target.className;
    if (className.includes("octicon-unfold") || className.includes("diff-expander")) {
      setTimeout(function () {
        applyCrossts(jsonUrl, true);
      }, 500);
    }
  });

  var tooltip;
  document.addEventListener("click", function (e) {
    const element = findDeclarationElement(e.target);
    if (element != null) {
      var content = declarationTooltipContent(element);
      if (tooltip) {
        tooltip.destroy();
      }
      tooltip = new Tooltip(e.target, {tooltipOffset: {x: 0, y: 8}});

      var documentBodyListener = function (e) {
        tooltip.hide();
        document.body.removeEventListener("click", documentBodyListener);
      };
      document.body.addEventListener("click", documentBodyListener);

      tooltip.setContent(content);
      tooltip.show();
    }
  });

  function declarationTooltipContent(element) {
    var references = JSON.parse(element.attributes["data-references"].value);
    var ref = element.attributes["data-ref"].value;
    var div = document.createElement("div");
    div.className = "crossts-declaration--contents";
    var label = document.createElement("div");
    label.className = "crossts-declaration--contents--label";
    label.appendChild(document.createTextNode("Usages:"));
    div.appendChild(label);
    var ul = document.createElement("ul");
    references.forEach(function (reference) {
      var a = document.createElement("a");
      var href = new TreePath(new Github(), ref, reference.remotePath).absolutePath();
      a.setAttribute("href", href);
      a.appendChild(document.createTextNode(reference.remotePath));
      var li = document.createElement("li");
      li.appendChild(a);
      ul.appendChild(li);
    });
    div.appendChild(ul);
    return div;
  }

  function findDeclarationElement(element) {
    while (element.parentNode != null) {
      if (element.className.indexOf("crossts-declaration") !== -1) {
        return element;
      }
      element = element.parentNode;
    }
    return null;
  }

}());
