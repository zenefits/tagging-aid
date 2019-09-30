// Check if UI has already been loaded
if (typeof _pendota_isVisible_ == "undefined" || !_pendota_isVisible_) {
    _pendotaInsertUI_();
} else {
    _pendotaRemoveUI_();
}

function _pendotaInsertUI_() { //Injects the tag assistant UI
    _pendota_isVisible_ = true;

    // Append CSS File to head
    //$("head").append('<link href="' + chrome.extension.getURL('src/css/bootstrap.min.css') + '" rel="stylesheet">');
    $("head").append('<link href="' + chrome.extension.getURL('src/css/custom.css') + '" rel="stylesheet">');

    // Append popup div to the body
    $.get(chrome.extension.getURL('src/ui/popup.html')).then( (data) => {
        $("body").append(data);
    }).then(() => { // Execute functions after appending UI

        feather.replace(); // sets feather icons (e.g. lock icon)

        // reused variables
        var _id_ = "";
        var _classNames_ = [];
        var _elemType_ = "";
        var copy_icon_url = chrome.extension.getURL('/src/ui/images/copy_icon.ico');
        var pendo_target_url = chrome.extension.getURL('/src/ui/images/pendo_target.png');

        const position = { x: 0, y: 0 }

        // Implements the interact.js library to make the assistant draggable
        interact('._pendota-draggable_').draggable({
        listeners: {
            move (event) {
            position.x += event.dx
            position.y += event.dy

            event.target.style.transform =
                `translate(${position.x}px, ${position.y}px)`
            },
        }
        })

        // Points the image source for static images stored with extension
        $('._pendota-copy-icon_').attr('src', copy_icon_url);
        $('#_pendota-target-img_').attr('src', pendo_target_url);

        // Define the basic mouseover functionality
        function startMouseover(){

            // Set the lock icon to starting "unlocked" state
            $('#_pendota-lock-icon_').html('<i class="_pendota-feather-unlocked_" data-feather="unlock"></i>');
            $('#_pendota-parent-up_').addClass("_pendota-hide-arrow_");
            $('#_pendota-parent-down_').addClass("_pendota-hide-arrow_");
            feather.replace();

            // Set a status text letting the user the targeting is ready
            document.getElementById('_pendota_status_').textContent = "Ready to inspect!  Click an element to lock info (Alt + Shift + L)";
            
            window.onmouseover=(function(e) { // Defines the actual mouseover function
                e.preventDefault();
                /* 
                    preventDefault() stops the regular actions that take place on a webpage
                    e.g. follow a link, submit form, etc.
                    It does NOT stop custom javascript interactions (e.g. show a modal).
                    Figuring out how to temporarily freeze these actions would be a good overall
                    improvement to the extension.
                */

                // Move the outline to the current item
                updateOutline(e);

                // Update the Tagging Aid contents
                updatePendotaContents(e);

                // Define the copy function for all copy icons
                applyCopyFunction();
            });
        };

        // A click event will "lock" the fields in their current state.  Clicking again will re-enable.
        window.onclick = function (e) {
            lockSwitch(e);
        };

        window.onkeydown = function (e) {
            if(e.altKey && e.shiftKey && e.keyCode == 76) { // alt + shift + L to lock/unlock
                lockSwitch(e);
            }

            if(e.keyCode == 27) { // ESC to exit pendota UI
                _pendotaRemoveUI_();
            }
        };


        function lockSwitch(e) { // locks or unlocks the pendota element scanner
            e.preventDefault();
            var el = e.target;

            if (el.id == "_pendota-tag-assistant_") { return; }
            while (el.parentNode) { // traverses through parent elements -- will not lock on the pendota interface
                if (el.parentNode.id == "_pendota-tag-assistant_") { return; }
                el = el.parentNode;
            }

            if(window.onmouseover != null) { // if not on pendota interface, locks the scanner
                document.getElementById('_pendota_status_').textContent = "Element Locked.  Click anywhere to reset.";
                window.onmouseover = null;
                $('#_pendota-lock-icon_').html('<i class="_pendota-feather-locked_" data-feather="lock"></i>');
                $('#_pendota-parent-up_').removeClass("_pendota-hide-arrow_");
                $('#_pendota-parent-down_').removeClass("_pendota-hide-arrow_");
                feather.replace();
            } else { // if already locked, unlocks instead
                startMouseover();
            }
        }

        startMouseover(); // sets the scanner in motion the first time the UI is displayed

        function copyToClipboard(inputId) { // defines the copy function
            
            // Get the text field
            var copyText = document.getElementById(inputId);
            
            // Select the text field
            copyText.select();
            copyText.setSelectionRange(0, 99999); // For mobile devices
            
            // Copy the text field
            document.execCommand("copy");
        }

        function updateOutline(e) {
            // Controls highlight box
            $(e.target).addClass('_pendota-outline_');
            $("*").not(e.target).removeClass('_pendota-outline_');
        }

        function applyCopyFunction() {
            $("._pendota-copy-link_").on("click", function(e) { // applies the copy function to all copy icons
                e.stopPropagation();
                copyToClipboard(e.currentTarget.id);
            }) 
        };

        applyCopyFunction();
        
        function updatePendotaContents(e) {
            // Get the target element's Id and Classes    
            _id_ = e.target.id;

            _classNames_ = $(e.target).attr("class"); // jQuery's class attribute is robust, handles svg's and other unique element types

            if (typeof _classNames_ != "undefined") {
                _classNames_ = _classNames_.split(/\s+/).filter((cls) => { // should not split on just ' ' because classes can be separated by other forms of whitespace
                    return cls != "_pendota-outline_"; // block pendota outline results from output
                }); 
                if (_classNames_.length == 0) {
                    _classNames_ = ['']; // if the only class was _pendota-outline_ the array would be empty, resulting in .undefined as a class
                }
            } else {
                _classNames_ = [''];
            }

            _elemType_ = e.target.nodeName.toLowerCase(); // stylistic choice
            
            var appendedHTML = ""; // clear extra class results

            // Set the result boxes that are always visible
            $('#_pendota_type-result_').val("" + _elemType_);
            $('#_pendota_id-result_').val("#" + _id_);
            $('#_pendota_class-result-0_').val("." + _classNames_[0]);
            $("#_pendota_template-table_").empty();
            
            // Build extra class spaces
            for (i=1; i < _classNames_.length; i++) {
            appendedHTML = appendedHTML +
            '<tr>' +
                '<td width="90%" class="_pendota_input-row_"><input class="_pendota_form-control_ _pendota_class-result_" type="text" id="_pendota_class-result-' + i + '_" value=".' + _classNames_[i] + '" readonly></td>' +
                '<td width="2%" class="_pendota_input-row_">&nbsp;</td>' +
                '<td width="8%" class="_pendota_input-row_">' +
                '<div id="_pendota_class-result-' + i + '_" class="_pendota-copy-link_");\'>' +
                    '<a href="#"><img class=_pendota-copy-icon_ src=' + copy_icon_url + ' width="20"></a>' +
                '</div>' +
                '</td>' +
                '</tr>';
            }

            // Append extra class spaces
            if(_classNames_.length > 1) {
                $("#_pendota_template-table_").html(appendedHTML);
            }  
        }

    });
}


// Defines function to later remove the Pendo Tag Assistant UI
function _pendotaRemoveUI_() {
    _pendota_isVisible_ = false;

    $("#_pendota-tag-assistant_").remove(); // Remove all html
    $("*").removeClass("_pendota-outline_"); // Remove the outline

    // Remove all assigned function
    // Do NOT use jQuery for these--more difficult to unassign and reassign
    window.onclick = function(e) {};
    window.onmouseover = function(e) {};
    window.onkeydown = function(e) {};
}