(function () {
  function applyTreeCrosshub(github, crosshubBaseUrl, crosshub) {
    github.path.getRealRef(function (ref) {
      var crosshubUrl = Path.join([crosshubBaseUrl, ref, "crosshub.json"]);
      Request.getJson(crosshubUrl, function (json) {
        crosshub.applyJson(json);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function applyPullSplitCrosshub(github, crosshubBaseUrl, crosshub) {
    github.path.getRealRefs(function (refs, repoNames) {
      var oldRef = refs[0];
      var newRef = refs[1];
      var crosshubUrlOld = Path.join([crosshubBaseUrl, oldRef, "crosshub.json"]);
      Request.getJson(crosshubUrlOld, function (oldJson) {
        crosshub.applyJson(CROSSDART_PULL_OLD, oldJson, oldRef);
      }, Errors.showUrlError);
      var crosshubUrlNew = Path.join([crosshubBaseUrl, newRef, "crosshub.json"]);
      Request.getJson(crosshubUrlNew, function (newJson) {
        crosshub.applyJson(CROSSDART_PULL_NEW, newJson, newRef);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function applyPullUnifiedCrosshub(github, crosshubBaseUrl, crosshub) {
    github.path.getRealRefs(function (refs, repoNames) {
      var oldRef = refs[0];
      var newRef = refs[1];
      var crosshubUrlOld = Path.join([crosshubBaseUrl, oldRef, "crosshub.json"]);
      Request.getJson(crosshubUrlOld, function (oldJson) {
        crosshub.applyJson(CROSSDART_PULL_OLD, oldJson, oldRef);
      }, Errors.showUrlError);
      var crosshubUrlNew = Path.join([crosshubBaseUrl, newRef, "crosshub.json"]);
      Request.getJson(crosshubUrlNew, function (newJson) {
        crosshub.applyJson(CROSSDART_PULL_NEW, newJson, newRef);
      }, Errors.showUrlError);
    }, Errors.showTokenError);
  }

  function checkRef(index, github, baseUrl, ref, repoName, callback) {
    var url = baseUrl + repoName + "/" + ref + "/crosshub.json";
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
        Request.post("https://metadata.crosshub.info/analyze", {
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

  function fetchMetadataUrl(shouldReuseCrosshub) {
    var github = new Github();
    var baseUrl = "https://www.crosshub.info/metadata/";
    if (github.type === Github.PULL_REQUEST) {
      github.path.getRealRefs(function (refs, repoNames) {
        var isOneDone = false;
        checkRef(0, github, baseUrl, refs[0], repoNames[0], function () {
          if (isOneDone) {
            applyCrosshub(baseUrl, shouldReuseCrosshub);
          }
          isOneDone = true;
        });
        checkRef(1, github, baseUrl, refs[1], repoNames[1], function () {
          if (isOneDone) {
            applyCrosshub(baseUrl, shouldReuseCrosshub);
          }
          isOneDone = true;
        });
      });
    } else {
      github.path.getRealRef(function (ref) {
        checkRef(0, github, baseUrl, ref, github.basePath, function () {
          applyCrosshub(baseUrl, shouldReuseCrosshub);
        });
      });
    }
  }

  var crosshub;
  function applyCrosshub(crosshubBaseUrl, shouldReuseCrosshub) {
    if (enabled) {
      if (!crosshubBaseUrl || crosshubBaseUrl.toString().trim() === "") {
        fetchMetadataUrl();
      } else {
        var github = new Github();
        if (Github.isTree()) {
          if (!shouldReuseCrosshub || !crosshub) {
            crosshub = new CrosshubTree(github);
          }
          applyTreeCrosshub(github, crosshubBaseUrl, crosshub);
        } else if (Github.isPullSplit()) {
          if (!shouldReuseCrosshub || !crosshub) {
            crosshub = new CrosshubPullSplit(github);
          }
          applyPullSplitCrosshub(github, crosshubBaseUrl, crosshub);
        } else if (Github.isPullUnified()) {
          if (!shouldReuseCrosshub || !crosshub) {
            crosshub = new CrosshubPullUnified(github);
          }
          applyPullUnifiedCrosshub(github, crosshubBaseUrl, crosshub);
        }
      }
    }
  }

  chrome.extension.sendMessage({crosshub: {action: 'initPopup'}});

  var jsonUrl;
  var enabled;
  chrome.runtime.onMessage.addListener(function (request) {
    if (request.crosshub) {
      if (request.crosshub.action === 'popupInitialized' || request.crosshub.action === 'apply') {
        window.Github.token = request.crosshub.token;
        jsonUrl = request.crosshub.jsonUrl;
        enabled = request.crosshub.enabled;
        if (enabled) {
          applyCrosshub(jsonUrl, request.crosshub.action === 'apply');
        }
      } else if (request.crosshub.action === 'tokenLink') {
        location.href = request.crosshub.url;
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
      applyCrosshub(jsonUrl);
    }
  });

  document.body.addEventListener("click", function (e) {
    var className = e.target.className;
    if (className.includes("octicon-unfold") || className.includes("diff-expander")) {
      setTimeout(function () {
        applyCrosshub(jsonUrl, true);
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
    div.className = "crosshub-declaration--contents";
    var label = document.createElement("div");
    label.className = "crosshub-declaration--contents--label";
    label.appendChild(document.createTextNode("Usages:"));
    div.appendChild(label);
    var ul = document.createElement("ul");
    references.forEach(function (reference) {
      var a = document.createElement("a");
      a.classList.add("crosshub-declaration--contents--link");
      var href = new TreePath(new Github(), ref, reference.remotePath).absolutePath();
      if (reference.remotePath.match(/^#/)) {
        href = reference.remotePath;
      } else {
        a.classList.add("crosshub-declaration--contents--link__external");
        href = new TreePath(new Github(), ref, reference.remotePath).absolutePath();
      }
      a.setAttribute("href", href);
      a.appendChild(document.createTextNode(reference.name || reference.remotePath));
      var li = document.createElement("li");
      li.appendChild(a);
      ul.appendChild(li);
    });
    div.appendChild(ul);
    return div;
  }

  function findDeclarationElement(element) {
    while (element.parentNode != null) {
      if (element.className.indexOf("crosshub-declaration") !== -1) {
        return element;
      }
      element = element.parentNode;
    }
    return null;
  }

}());
