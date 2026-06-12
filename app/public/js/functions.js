function doConfirm(msg, appendToDiv, yesFn, noFn) {
  $("#confirmBox").appendTo(appendToDiv);
  var confirmBox = $("#confirmBox");
  confirmBox.find(".message").text(msg);
  confirmBox
    .find(".yes,.no")
    .unbind()
    .click(function () {
      //confirmBox.hide();
      confirmBox.fadeOut(500);
    });
  confirmBox.find(".yes").click(yesFn);
  confirmBox.find(".no").click(noFn);
  confirmBox.show();
}

function isNumber(evt) {
  var theEvent = evt || window.event;
  var key = theEvent.keyCode || theEvent.which;
  key = String.fromCharCode(key);
  if (key.length == 0) return;
  var regex = /^[0-9.,\b]+$/;
  if (!regex.test(key)) {
    theEvent.returnValue = false;
    if (theEvent.preventDefault) theEvent.preventDefault();
  }
}

function ValidateIPaddress(ipaddress) {
  if (
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ipaddress,
    )
  ) {
    return true;
  }
  return false;
}

// Helper function that formats the file sizes
function formatFileSize(bytes) {
  if (typeof bytes !== "number") {
    return "";
  }

  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + " GB";
  }

  if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + " MB";
  }

  return (bytes / 1000).toFixed(2) + " KB";
}

function isMacAddressValid(inputMac) {
  var regexp = /^(([A-Fa-f0-9]{2}[:]){5}[A-Fa-f0-9]{2}[,]?)+$/i;
  return regexp.test(inputMac) ? true : false;
}

function execAjax(gotolink, ajaxPostGet, dataToSend) {
  /* used in edit.hbs, editHost.hbs */
  $.ajax({
    url: gotolink,
    type: ajaxPostGet,

    complete: function () {
      //console.log(this.url);
    },

    data: dataToSend,
    success: function (data) {
      if (data == "deleted") {
        console.log("deleted host");
        window.location.href = window.location.href;
      } else if (data == "error") {
        // console.log("error:", data);
        $.notify("Some error occured", "error");
      } else if (data == "error-moving-upload") {
        $.notify("Error with upload files, please refresh", "error");
      } else if (data == "error-mac-already-exists") {
        $("#hostMac").focus();
        $.notify("MAC already added", "error");
      } else if (data == "saved") {
        window.location.href = window.location.href;
      } else if (data.includes("token")) {
        // console.log("token received: ", data);
        const newToken = data.substr(6, data.length);
        if ($("#modal-token").hasClass("active")) {
          $("#modal-token").removeClass("active");
        } else {
          $("#modal-token").addClass("active");
          $(".modal-token-content").append(
            `
            <div class="p-token">
            <p>Token: <code>${newToken}</code></p>
            </div
            `,
          );
        }
      }
    },
    error: function (jqXhr, textStatus, err) {
      console.log("Error exec");
      console.log(jqXhr);
      $.notify("Error occured", "error");
    },
  });
}
