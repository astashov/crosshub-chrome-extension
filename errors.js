(function () {

  window.Errors = {};
  window.Errors.URL_HELP = "It could look something like: 'https://my-crosshubs.s3.amazonaws.com/my-project', " +
      "then the Crosshub Chrome extension " +
      "will try to make a call to this url + sha + /crosshub.json, e.g.: " +
      "'https://my-crosshubs.s3.amazonaws.com/my-project/36a6c88/crosshub.json'";

  window.Errors.showUrlError = function (url, status, response) {
    var message = "Got error trying to access '" + url + "', HTTP response code: '" + status + "'.<br />" +
        "Make sure you specified the right base in the page action popup (with the XD icon). " +
        window.Errors.URL_HELP;
    showErrorMessage(message);
  };

  window.Errors.showMissingJsonUrlError = function () {
    var message = "You should specify base for the url where to retrieve the JSON file with the Crosshub " +
        "project metadata from. " + window.Errors.URL_HELP;
    showErrorMessage(message);
  };

  window.Errors.showTokenError = function (url, status, response) {
    var message = "Got error trying to access '" + url + "', HTTP response code: '" + status + "'.<br />";
    if (status.toString() === '404') {
      message += " If this is a private project, make sure you added the correct access token in the page " +
          "action popup (with the XD icon), and then refresh the page.";
    }
    showErrorMessage(message);
  };

  function showErrorMessage(message) {
    var errorMessage = document.querySelector("#crosshub-error");
    if (errorMessage) {
      errorMessage.parentNode.removeChild(errorMessage);
    }
    errorMessage = document.createElement("div");
    errorMessage.classList.add("crosshub-error");
    errorMessage.setAttribute("id", "crosshub-error");

    var errorMessageIcon = document.createElement("div");
    errorMessageIcon.classList.add("crosshub-error--icon");

    var errorMessageIconExclamation = document.createElement("div");
    errorMessageIconExclamation.classList.add("crosshub-error--icon--exclamation");
    errorMessageIconExclamation.textContent = "!";

    var errorMessageIconLabel = document.createElement("div");
    errorMessageIconLabel.classList.add("crosshub-error--icon--label");
    errorMessageIconLabel.textContent = "XHUB";

    var errorMessageContent = document.createElement("div");
    errorMessageContent.classList.add("crosshub-error--content");
    errorMessageContent.style.display = "none";
    errorMessageContent.innerHTML = "Crosshub Chrome Extension error: " + message;

    var close = document.createElement("button");
    close.classList.add("crosshub-error--close");
    close.textContent = "X";

    close.addEventListener("click", function () {
      errorMessage.parentNode.removeChild(errorMessage);
    });

    errorMessageIcon.addEventListener("click", function () {
      errorMessageContent.style.display = "block";
    });

    document.body.appendChild(errorMessage);
    errorMessage.appendChild(errorMessageIcon);
    errorMessage.appendChild(errorMessageContent);
    errorMessageIcon.appendChild(errorMessageIconExclamation);
    errorMessageIcon.appendChild(errorMessageIconLabel);
    errorMessageContent.appendChild(close);
  }

}());
