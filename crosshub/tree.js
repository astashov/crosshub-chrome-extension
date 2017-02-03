(function () {
  window.CrosshubTree = function (github) {
    this.github = github;
    this.handledLines = [];
  };

  window.CrosshubTree.prototype.applyJson = function (json) {
    var path = this.github.path.path;
    var allEntities = json[path];
    if (allEntities) {
      var entitiesByLines = groupEntitiesByLinesAndTypes(allEntities);
      for (var line in entitiesByLines) {
        if (this.handledLines.indexOf(line) === -1) {
          var entities = entitiesByLines[line];
          entities.sort(function (a, b) {
            return a.offset === b.offset ? (a.type === "references" ? -1 : 1) : a.offset - b.offset;
          });
          var that = this;
          var content = getLineContent(line);
          if (content != null) {
            var newContent = applyEntities(this.github, this.github.path.ref, content, entities, function (entity) {
              return new TreePath(that.github, that.github.path.ref, entity.remotePath).absolutePath();
            });
            setLineContent(line, newContent);
          }
          this.handledLines.push(line);
        }
      }
    }
  };

  function getLineElement(line) {
    return window.document.querySelector("#LC" + line);
  }

  function getLineContent(line) {
    const lineElement = getLineElement(line);
    return lineElement && lineElement.innerHTML;
  }

  function setLineContent(line, content) {
    getLineElement(line).innerHTML = content;
  }
}());
