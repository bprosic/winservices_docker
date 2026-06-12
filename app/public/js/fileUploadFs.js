var jqXhr = null;
var imageAllowedFileSize = 10 * 1024 * 1024;
$('#imageForm').fileupload({
    maxFileSize: imageAllowedFileSize,
    beforeSend: function (xhr, settings) {
        xhr.setRequestHeader("xsrf-token", csrfToken);
    },
    add: function (e, data) {
        var originalFileName = data.files[0].name;
        var fileType = originalFileName.split('.').pop(),
            allowdtypes = "jpg,png,gif,bmp,jpeg,tiff,tif,raw,jif,jfif,jp2,jpx,j2k,j2c,fpx,pcd";
        if (allowdtypes.indexOf(fileType) < 0) {
            $.notify("Wrong file type!", "error");
            return false;
        }
        if (data.files[0].size > imageAllowedFileSize) {
            $.notify("File size max 10MB allowed", "error");
            return;
        }
        let idNameOfFilename = originalFileName.replace(/[^a-zA-Z0-9]/g, "");
        if ($("#" + idNameOfFilename).length != 0) {
            $.notify("File already uploaded!", "error");
            return;
        }

        // Automatically upload the file once it is added to the queue

        var tpl = $('<div class="filesContainer working" id="' + idNameOfFilename + '"><div id="progress"><div class="bar" style="width: 0%;"></div></div>' +
            '<div class="fileName"></div><div class="mem"></div><a class="filesLinks" href="#"><span></span></a><img id="imgPrvwContainer" class="img-fit-contain"></div>');
        // Append the file name and file size
        tpl.find('.fileName').text(originalFileName).hide();
        tpl.find('.mem').append("(" + formatFileSize(data.files[0].size) + ")").hide();
        tpl.find('span').append('x');

        data.context = tpl.appendTo($('#img-container'));
        $('[name="someBild"]').hide();

        tpl.find('a.filesLinks').on('click', function (e, data) {
            e.preventDefault();

            var thisCancelbtn = $(this);
            var getFileName = thisCancelbtn.parent().find(".fileName").text(); // z.B: setup.cfg

            if (tpl.hasClass('working')) {
                // here we have a problem with aborting upload with large files
                // jQuery blueimp fileupload aborts upload
                // but multer runs in background, node.js
                // and causing problem with deleting the same file -> you cannot delete it until node process restarts
                // it should be reported to npm
                // in linux it would probably work
                // windows and macosx is problem
                jqXhr.abort();
                return;
            }



            // I have to send FORM ID number
            var dataToSend = {
                user: userName,
                imageFile: getFileName,
                _csrf: csrfToken
            };
            // then execute delete that specific file!
            $.ajax({
                type: 'POST',
                url: '/delete/file/temp/image',
                data: dataToSend,
                success: function (data) {
                    if (data == "File-deleted") { // if node.js sends the same filename then it is deleted
                        tpl.hide(function () {
                            tpl.remove();
                            $('[name="someBild"]').show();
                        });
                    } else if (data == "Error-deleting-file") {
                        $.notify("Error deleting file. Refresh page", "error");
                    }
                },
                error: function (jqXhr, textStatus, err) {
                    console.log("Error: " + jqXhr);
                    console.log(textStatus);
                    console.log(err);
                }
            });
        });
        jqXhr = data.submit();

    },
    progressall: function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        $('#progress .bar').css(
            'width',
            progress + '%'
        );
    },

    done: function (e, data) {
        
        if (data.result == "upload-multer-error") {
            $.notify("File upload error", "error");
            data.context.hide(function () {
                data.context.remove();
            });
            $('[name="someBild"]').show();
        } else if (data.result == "upload-file-size") {
            $.notify("File size max 10MB allowed", "error");
            data.context.hide(function () {
                data.context.remove();
            });
            $('[name="someBild"]').show();
        } else if (data.result == "error-file-type") {
            $.notify("Only image files", "error");
            data.context.hide(function () {
                data.context.remove();
            });
            $('[name="someBild"]').show();
        } else if (data.result == null) {
            $.notify("Error code null", "error");
        } else {
            data.context.removeClass('working');
            $('#progress').hide();
            // show picture then
            var reader = new FileReader();
            reader.onload = function(e) {
                $("#imgPrvwContainer").attr("src", e.target.result);
            }
            reader.readAsDataURL(data.files[0]);
        }

    },
    fail: function (e, data) {
        console.log("Entered fail");
        // Something has gone wrong!
        data.context.addClass('error');
        // when error occures, i will delete a div class on webpage
        data.context.hide(function () {
            data.context.remove();
        });
        $('[name="someBild"]').show();
        jqXhr = null;
    }

}).bind('fileuploadsubmit', function (e, data) {
    data.formData = {
        user: userName
    }
});