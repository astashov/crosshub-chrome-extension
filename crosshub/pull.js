(function () {
  window.CROSSDART_PULL_OLD = "old";
  window.CROSSDART_PULL_NEW = "new";

  var CrosshubPull = function (github) {
    this.github = github;
    this.handledLinesByFiles = {};

    this.applyJson = function (type, json, ref) {
      this.handledLinesByFiles[type] = this.handledLinesByFiles[type] || {};
      var fileElements = document.querySelectorAll("#files .file");
      for (var index in fileElements) {
        if (fileElements.hasOwnProperty(index) && index.match(/\d+/)) {
          var fileElement = fileElements[index];
          var file = fileElement.querySelector("#files_bucket .file-header").attributes["data-path"].value;
          this.handledLinesByFiles[type][file] = this.handledLinesByFiles[type][file] || [];
          var entitiesByLines = groupEntitiesByLinesAndTypes(json[file]);
          for (var line in entitiesByLines) {
            if (this._doesLineElementExist(type, file, line) && this.handledLinesByFiles[type][file].indexOf(line) === -1) {
              var entities = entitiesByLines[line];
              entities.sort(function (a, b) {
                return a.offset - b.offset;
              });
              var content = this._getLineContent(type, file, line);
              var prefix = content[0];
              content = content.substr(1);
              var newContent = applyEntities(this.github, ref, content, entities, this._getHrefCallback(ref, type));
              this._setLineContent(type, file, line, prefix + newContent);
              this.handledLinesByFiles[type][file].push(line);
            }
          }
        }
      }
    };

    this._doesLineElementExist = function (type, file, line) {
      return !!this._getLineElement(type, file, line);
    };

    this._getLineContent = function (type, file, line) {
      return this._getLineElement(type, file, line).innerHTML;
    };

    this._setLineContent = function (type, file, line, content) {
      this._getLineElement(type, file, line).innerHTML = content;
    };

    this._getHrefCallback = function (ref, type) {
      var that = this;
      var result = function (entity) {
        var defaultPath = new TreePath(github, ref, entity.remotePath).absolutePath();
        if (entity.remotePath.match(/^http/)) {
          return defaultPath;
        } else {
          var match = entity.remotePath.match(/^([^h].*)#L(\d+)/);
          if (match) {
            var file = match[1];
            var line = parseInt(match[2], 10);
            var element = that._getLineElement(type, file, line);
            if (element) {
              var parent = element.parentNode;
              var anchor = parent.querySelector("[data-anchor^='diff-'");
              var diff = anchor.attributes["data-anchor"].value;
              return "#" + diff + (type === "old" ? "L" : "R") + line;
            } else {
              return defaultPath;
            }
          } else {
            return defaultPath;
          }
        }
      };
      return result;
    };
  };

  window.CrosshubPullSplit = function (github) {
    CrosshubPull.apply(this, [github]);

    this._getLineElement = function (type, file, line) {
      var fileHeader = document.querySelector("#files_bucket .file-header[data-path='" + file + "']");
      if (fileHeader) {
        var lineElements = fileHeader.parentElement.querySelectorAll("[data-line-number~='" + line + "'] + td");
        var lineElement = Array.prototype.filter.call(lineElements, function (i) {
          var index = Array.prototype.indexOf.call(i.parentNode.children, i);
          return (type === CROSSDART_PULL_OLD ? index === 1 : index === 3);
        })[0];
        if (lineElement) {
          if (lineElement.className.includes("blob-code-inner")) {
            return lineElement;
          } else {
            return lineElement.querySelector(".blob-code-inner");
          }
        }
      }
    };
  };

  window.CrosshubPullUnified = function (github) {
    CrosshubPull.apply(this, [github]);

    this._getLineElement = function (type, file, line) {
      var fileHeader = document.querySelector("#files_bucket .file-header[data-path='" + file + "']");
      if (fileHeader) {
        var elIndex = (type === CROSSDART_PULL_OLD ? 1 : 2);
        var lineNumberElement = fileHeader.parentElement.querySelector(
          "[data-line-number~='" + line + "']:nth-child(" + elIndex + ")"
        );
        if (lineNumberElement) {
          var lineContainerChildren = lineNumberElement.parentNode.children;
          var lineElement = lineContainerChildren[lineContainerChildren.length - 1];
          if (lineElement) {
            if (lineElement.className.includes("blob-code-inner")) {
              return lineElement;
            } else {
              return lineElement.querySelector(".blob-code-inner");
            }
          }
        }
      }
    };
  };
}());

