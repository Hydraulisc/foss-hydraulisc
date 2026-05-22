(function () {
    var input = document.getElementById('post-url');
    var btn = document.getElementById('copy-btn');
    var msg = document.getElementById('copy-msg');
    function showMessage(text, timeout) {
        msg.textContent = text;
        msg.style.visibility = 'visible';
        clearTimeout(msg._t);
        msg._t = setTimeout(function () {
            msg.style.visibility = 'hidden';
        }, timeout || 1500);
    }

    btn.addEventListener('click', function () {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(input.value).then(function(){
                showMessage('Link copied!');
            }).catch(function(){
                // Fallback if permission denied or other error
                fallbackCopy();
            });
            return;
        }
        //Older browsers: select the input and use execCommand
        fallbackCopy();
    });
    function fallbackCopy() {
            try {
                input.select();
                input.setSelectionRange(0, 99999);
                // mobile
                if (document.execCommand && document.execCommand('copy')) {
                    showMessage('Link Copied!');
                } else {
                    showMessage('Press Ctrl+C to copy', 3000);
                }    } catch(e){
                    showMessage('Press Ctrl+C to copy', 3000);
                }
                // Deselect after a short delay so UX isn't jarring
                setTimeout(function(){
                    window.getSelection().removeAllRanges();
                }, 200);
            }
        }
    )
();