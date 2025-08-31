/*
   $ TEAM    : https://instagram.com/darkxcode_
   $ AUTHOR  : https://t.me/zlaxtert 
   $ CODE    : https://t.me/zexkings 
   $ DESIGN  : https://t.me/danielsmt 
   $ SITE    : https://darkxcode.site/
   $ VERSION : 1.0
*/

$(document).ready(function() {
    // Set current year in footer
    $('#currentYear').text(new Date().getFullYear());

    // Theme toggle functionality
    $('#themeToggle').change(function() {
        $('body').toggleClass('dark-mode', this.checked);
        localStorage.setItem('darkMode', this.checked);
    });

    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'true') {
        $('#themeToggle').prop('checked', true);
        $('body').addClass('dark-mode');
    }

    // File upload handling
    $('#fileUpload').change(function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            $('#lists').val(e.target.result);
        };
        reader.readAsText(file);
    });

    // Variables for validation process
    let isChecking = false;
    let currentIndex = 0;
    let totalLists = 0;
    let listsArray = [];
    let proxies = [];
    let proxyAuths = [];
    let proxyIndex = 0;
    let liveCount = 0;
    let dieCount = 0;
    let abortController = null;

    // Start validation process
    $('#startBtn').click(function() {
        if (!validateForm()) return;

        // Get and process lists
        const listsText = $('#lists').val().trim();
        listsArray = listsText.split('\n')
            .map(item => item.trim())
            .filter(item => item !== '');
        
        totalLists = listsArray.length;
        
        if (totalLists === 0) {
            alert('Please provide at least one email or phone number to validate.');
            return;
        }
        
        if (totalLists > 1000) {
            alert('Maximum 1000 entries allowed. Please reduce your list.');
            return;
        }

        // Get and process proxies
        const proxyText = $('#proxy').val().trim();
        proxies = proxyText.split('\n')
            .map(item => item.trim())
            .filter(item => item !== '');
        
        if (proxies.length === 0) {
            alert('Please provide at least one proxy.');
            return;
        }

        // Get and process proxy auths if provided
        const proxyAuthText = $('#proxyAuth').val().trim();
        if (proxyAuthText) {
            proxyAuths = proxyAuthText.split('\n')
                .map(item => item.trim())
                .filter(item => item !== '');
        }

        // Initialize UI
        $('#totalLists').text(totalLists);
        $('#remaining').text(totalLists);
        $('#checked').text(0);
        $('#progressPercent').text('0%');
        $('#progressBar').css('width', '0%').text('0%');
        
        // Reset results
        $('#liveResults').empty();
        $('#dieResults').empty();
        liveCount = 0;
        dieCount = 0;

        // Start process
        isChecking = true;
        currentIndex = 0;
        toggleButtons(true);
        
        // Start validation
        processNext();
    });

    // Stop validation process
    $('#stopBtn').click(function() {
        isChecking = false;
        if (abortController) {
            abortController.abort();
        }
        toggleButtons(false);
    });

    // Copy LIVE results
    $('#copyLive').click(function() {
        const liveText = $('#liveResults').text();
        if (!liveText) {
            alert('No LIVE results to copy.');
            return;
        }
        copyToClipboard(liveText);
        showToast('LIVE results copied to clipboard!', 'success');
    });

    // Delete LIVE results
    $('#deleteLive').click(function() {
        $('#liveResults').empty();
        showToast('LIVE results cleared.', 'info');
    });
/*
   $ TEAM    : https://instagram.com/darkxcode_
   $ AUTHOR  : https://t.me/zlaxtert 
   $ CODE    : https://t.me/zexkings 
   $ DESIGN  : https://t.me/danielsmt 
   $ SITE    : https://darkxcode.site/
   $ VERSION : 1.0
*/
    // Copy DIE results
    $('#copyDie').click(function() {
        const dieText = $('#dieResults').text();
        if (!dieText) {
            alert('No DIE results to copy.');
            return;
        }
        copyToClipboard(dieText);
        showToast('DIE results copied to clipboard!', 'success');
    });

    // Delete DIE results
    $('#deleteDie').click(function() {
        $('#dieResults').empty();
        showToast('DIE results cleared.', 'info');
    });

    // Validate form inputs
    function validateForm() {
        if (!$('#apikey').val().trim()) {
            alert('API Key is required.');
            return false;
        }
        
        if (!$('#proxy').val().trim()) {
            alert('Proxy list is required.');
            return false;
        }
        
        if (!$('#typeProxy').val()) {
            alert('Proxy type is required.');
            return false;
        }
        
        if (!$('#lists').val().trim()) {
            alert('Email/Phone list is required.');
            return false;
        }
        
        return true;
    }

    // Toggle buttons state
    function toggleButtons(checking) {
        $('#startBtn').prop('disabled', checking);
        $('#stopBtn').prop('disabled', !checking);
    }

    // Process next item in the list
    function processNext() {
        if (!isChecking || currentIndex >= totalLists) {
            // Process completed
            isChecking = false;
            toggleButtons(false);
            $('#progressBar').removeClass('progress-bar-animated');
            showToast('Validation process completed!', 'success');
            return;
        }

        const item = listsArray[currentIndex];
        
        // Validate email or phone format
        if (!isValidEmail(item) && !isValidPhone(item)) {
            appendToDieResults(item, 'INPUT ONLY EMAIL ADDRESS OR PHONE NUMBER!');
            currentIndex++;
            updateProgress();
            processNext();
            return;
        }

        // Get proxy for this request (rotate through available proxies)
        const proxy = proxies[proxyIndex % proxies.length];
        let proxyAuth = '';
        
        // Get proxy auth if available
        if (proxyAuths.length > 0) {
            proxyAuth = proxyAuths[proxyIndex % proxyAuths.length];
        }
        
        proxyIndex++;

        // Make API request
        makeApiRequest(item, proxy, proxyAuth);
    }

    // Make API request to validate item
    function makeApiRequest(item, proxy, proxyAuth) {
        const apikey = $('#apikey').val().trim();
        const typeProxy = $('#typeProxy').val();
        
        // Build API URL
        let url = `https://api.darkxcode.site/validator/paypalV2/?apikey=${encodeURIComponent(apikey)}&list=${encodeURIComponent(item)}&proxy=${encodeURIComponent(proxy)}&type_proxy=${encodeURIComponent(typeProxy)}`;
        
        if (proxyAuth) {
            url += `&proxyAuth=${encodeURIComponent(proxyAuth)}`;
        }

        // Create abort controller for this request
        abortController = new AbortController();
        
        fetch(url, { signal: abortController.signal })
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.valid === "true") {
                    // LIVE result
                    appendToLiveResults(data.data.info);
                    liveCount++;
                } else {
                    // DIE result
                    const msg = data.data && data.data.info ? data.data.info.msg : 'UNKNOWN RESPONSE!';
                    appendToDieResults(item, msg);
                    dieCount++;
                }
                
                currentIndex++;
                updateProgress();
                processNext();
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    // Request was aborted, just return
                    return;
                }
                
                appendToDieResults(item, `Request failed: ${error.message}`);
                dieCount++;
                currentIndex++;
                updateProgress();
                processNext();
            });
    }

    // Update progress indicators
    function updateProgress() {
        const checked = currentIndex;
        const remaining = totalLists - checked;
        const percentage = ((checked / totalLists) * 100).toFixed(2);
        
        $('#remaining').text(remaining);
        $('#checked').text(checked);
        $('#progressPercent').text(percentage + '%');
        $('#progressBar').css('width', percentage + '%').text(percentage + '%');
    }

    // Append result to LIVE section
    function appendToLiveResults(info) {
        const resultHtml = `
            <div class="result-item live-result">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${info.email}</strong> (${info.type})<br>
                        <small>Country: ${info.country} (${info.country_code})</small><br>
                        <small>Message: ${info.msg}</small>
                    </div>
                    <span class="badge bg-success">LIVE</span>
                </div>
            </div>
        `;
        
        $('#liveResults').append(resultHtml);
        // Auto-scroll to bottom
        $('#liveResults').scrollTop($('#liveResults')[0].scrollHeight);
    }
/*
   $ TEAM    : https://instagram.com/darkxcode_
   $ AUTHOR  : https://t.me/zlaxtert 
   $ CODE    : https://t.me/zexkings 
   $ DESIGN  : https://t.me/danielsmt 
   $ SITE    : https://darkxcode.site/
   $ VERSION : 1.0
*/
    // Append result to DIE section
    function appendToDieResults(item, msg) {
        const resultHtml = `
            <div class="result-item die-result">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${item}</strong><br>
                        <small>Message: ${msg}</small>
                    </div>
                    <span class="badge bg-danger">DIE</span>
                </div>
            </div>
        `;
        
        $('#dieResults').append(resultHtml);
        // Auto-scroll to bottom
        $('#dieResults').scrollTop($('#dieResults')[0].scrollHeight);
    }

    // Validate email format
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate phone format
    function isValidPhone(phone) {
        const re = /^\+\d{10,15}$/; // + followed by 10-15 digits
        return re.test(phone);
    }

    // Copy text to clipboard
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        // Create toast element
        const toast = $(`
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `);
        
        // Add to container
        $('#toastContainer').append(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.on('hidden.bs.toast', function() {
            toast.remove();
        });
    }
});