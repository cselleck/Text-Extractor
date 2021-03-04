$(document).ready(function() {
    var CLIPBOARD = new CLIPBOARD_CLASS("my_canvas", true);

    /**
     * image pasting into canvas
     * 
     * @param {string} canvas_id - canvas id
     * @param {boolean} autoresize - if canvas will be resized
     */

    function CLIPBOARD_CLASS(canvas_id, autoresize) {
        var _self = this;
        var canvas = document.getElementById(canvas_id);
        var ctx = document.getElementById(canvas_id).getContext("2d");
        var ctrl_pressed = false;
        var command_pressed = false;
        var paste_event_support;
        var pasteCatcher;

        //handlers
        document.addEventListener('keydown', function(e) {
            _self.on_keyboard_action(e);
        }, false); //firefox fix
        document.addEventListener('keyup', function(e) {
            _self.on_keyboardup_action(e);
        }, false); //firefox fix
        document.addEventListener('paste', function(e) {
            _self.paste_auto(e);
        }, false); //official paste handler

        //constructor - we ignore security checks here
        this.init = function() {
            pasteCatcher = document.createElement("div");
            pasteCatcher.setAttribute("id", "paste_ff");
            pasteCatcher.setAttribute("contenteditable", "");
            pasteCatcher.style.cssText = 'opacity:0;position:fixed;top:0px;left:0px;width:10px;margin-left:-20px;';
            document.body.appendChild(pasteCatcher);

            // create an observer instance
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (paste_event_support === true || ctrl_pressed == false || mutation.type != 'childList') {
                        //we already got data in paste_auto()
                        return true;
                    }

                    //if paste handle failed - capture pasted object manually
                    if (mutation.addedNodes.length == 1) {
                        if (mutation.addedNodes[0].src != undefined) {
                            //image
                            _self.paste_createImage(mutation.addedNodes[0].src);
                        }
                        //register cleanup after some time.
                        setTimeout(function() {
                            pasteCatcher.innerHTML = '';
                        }, 20);
                    }
                });
            });
            var target = document.getElementById('paste_ff');
            var config = { attributes: true, childList: true, characterData: true };
            observer.observe(target, config);
        }();
        //default paste action
        this.paste_auto = function(e) {
            paste_event_support = false;
            if (pasteCatcher != undefined) {
                pasteCatcher.innerHTML = '';
            }
            if (e.clipboardData) {
                var items = e.clipboardData.items;
                if (items) {
                    paste_event_support = true;
                    //access data directly
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                            //image
                            var blob = items[i].getAsFile();
                            var URLObj = window.URL || window.webkitURL;
                            var source = URLObj.createObjectURL(blob);
                            this.paste_createImage(source);
                        }
                    }
                    e.preventDefault();
                } else {
                    //wait for DOMSubtreeModified event
                    //https://bugzilla.mozilla.org/show_bug.cgi?id=891247
                }
            }
        };
        //on keyboard press
        this.on_keyboard_action = function(event) {
            k = event.keyCode;
            //ctrl
            if (k == 17 || event.metaKey || event.ctrlKey) {
                if (ctrl_pressed == false)
                    ctrl_pressed = true;
            }
            //v
            if (k == 86) {
                if (document.activeElement != undefined && document.activeElement.type == 'text') {
                    //let user paste into some input
                    return false;
                }

                if (ctrl_pressed == true && pasteCatcher != undefined) {
                    pasteCatcher.focus();
                }
            }
        };
        //on kaybord release
        this.on_keyboardup_action = function(event) {
            //ctrl
            if (event.ctrlKey == false && ctrl_pressed == true) {
                ctrl_pressed = false;
            }
            //command
            else if (event.metaKey == false && command_pressed == true) {
                command_pressed = false;
                ctrl_pressed = false;
            }
        };
        //draw pasted image to canvas
        this.paste_createImage = function(source) {
            var pastedImage = new Image();
            pastedImage.onload = function() {
                if (autoresize == true) {
                    //resize
                    canvas.width = pastedImage.width;
                    canvas.height = pastedImage.height;
                } else {
                    //clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(pastedImage, 0, 0);
            };
            pastedImage.src = source;
        };
    }
    var inputs = document.querySelectorAll('.inputfile');
    Array.prototype.forEach.call(inputs, function(input) {
        var label = input.nextElementSibling,
            labelVal = label.innerHTML;

        input.addEventListener('change', function(e) {
            var fileName = '';
            if (this.files && this.files.length > 1)
                fileName = (this.getAttribute('data-multiple-caption') || '').replace('{count}', this.files.length);
            else
                fileName = e.target.value.split('\\').pop();

            if (fileName) {
                label.querySelector('span').innerHTML = fileName;

                let reader = new FileReader();
                reader.onload = function() {
                    let dataURL = reader.result;
                    $("#selected-image").attr("src", dataURL);
                    $("#selected-image").addClass("col-12");
                }
                let file = this.files[0];
                reader.readAsDataURL(file);
                startRecognize(file);
            } else {
                label.innerHTML = labelVal;
                $("#selected-image").attr("src", '');
                $("#selected-image").removeClass("col-12");
                $("#arrow-right").addClass("fa-arrow-right");
                $("#arrow-right").removeClass("fa-check");
                $("#arrow-right").removeClass("fa-spinner fa-spin");
                $("#arrow-down").addClass("fa-arrow-down");
                $("#arrow-down").removeClass("fa-check");
                $("#arrow-down").removeClass("fa-spinner fa-spin");
                $("#log").empty();
            }
        });

        // Firefox bug fix
        input.addEventListener('focus', function() { input.classList.add('has-focus'); });
        input.addEventListener('blur', function() { input.classList.remove('has-focus'); });
    });
});

$("#startLink").click(function() {
    var img = document.getElementById('selected-image');
    startRecognize(img);
});

function startRecognize(img) {
    $("#arrow-right").removeClass("fa-arrow-right");
    $("#arrow-right").addClass("fa-spinner fa-spin");
    $("#arrow-down").removeClass("fa-arrow-down");
    $("#arrow-down").addClass("fa-spinner fa-spin");
    recognizeFile(img);
}

function progressUpdate(packet) {
    var log = document.getElementById('log');

    if (log.firstChild && log.firstChild.status === packet.status) {
        if ('progress' in packet) {
            var progress = log.firstChild.querySelector('progress')
            progress.value = packet.progress
        }
    } else {
        var line = document.createElement('div');
        line.status = packet.status;
        var status = document.createElement('div')
        status.className = 'status'
        status.appendChild(document.createTextNode(packet.status))
        line.appendChild(status)

        if ('progress' in packet) {
            var progress = document.createElement('progress')
            progress.value = packet.progress
            progress.max = 1
            line.appendChild(progress)
        }


        if (packet.status == 'done') {
            log.innerHTML = ''
            var pre = document.createElement('pre')
            pre.appendChild(document.createTextNode(packet.data.text.replace(/\n\s*\n/g, '\n')))
            line.innerHTML = ''
            line.appendChild(pre)
            $(".fas").removeClass('fa-spinner fa-spin')
            $(".fas").addClass('fa-check')
        }

        log.insertBefore(line, log.firstChild)
    }
}

function recognizeFile(file) {
    $("#log").empty();
    const corePath = window.navigator.userAgent.indexOf("Edge") > -1 ?
        'js/tesseract-core.asm.js' :
        'js/tesseract-core.wasm.js';


    const worker = new Tesseract.TesseractWorker({
        corePath,
    });

    worker.recognize(file,
            $("#langsel").val()
        )
        .progress(function(packet) {
            console.info(packet)
            progressUpdate(packet)

        })
        .then(function(data) {
            console.log(data)
            progressUpdate({ status: 'done', data: data })
        })
}