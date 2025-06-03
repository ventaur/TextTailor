const actionContainer = document.querySelector('.action-container');
const form = document.getElementById('formTextTailor');
const confirmReplaceAll = document.getElementById('confirmReplaceAll');
const cancelBtn = document.getElementById('btnCancel');
const progressSection = document.getElementById('progressSection');
const backdrop = document.querySelector('.backdrop');


async function start() {
    const res = await fetch('/replace-text', { method: 'POST' });
    
    const { postJobId, pageJobId } = await res.json();

    const postProgress = document.getElementById('postProgress');
    const postStatus = document.getElementById('postStatus');
    const pageProgress = document.getElementById('pageProgress');
    const pageStatus = document.getElementById('pageStatus');

    trackJob(postJobId, postProgress, postStatus);
    trackJob(pageJobId, pageProgress, pageStatus);
}

function trackJob(jobId, progressElement, statusElement) {
    const sse = new EventSource(`/job-progress/${jobId}`);

    sse.addEventListener('progress', (event) => {
        const { progress } = JSON.parse(event.data);
        progressElement.value = progress;
        statusElement.textContent = `Progress: ${progress}%`;
    });

    sse.addEventListener('complete', () => {
        progressElement.value = 100;
        statusElement.textContent = '✅ Status: Complete';
    });

    sse.addEventListener('error', (event) => {
        const { errorMessage } = JSON.parse(event.data);
        statusElement.textContent = `❌ Status: Error - ${errorMessage}`;
        sse.close();
    });

    sse.addEventListener('cleanup', () => {
        statusElement.textContent = '🧹 Status: Cleaned up.';
        sse.close();
    });
}


function hideProgressSection() {
    // Ensure the confirmation checkbox is unchecked to prevent accidental restarting.
    confirmReplaceAll.checked = false;

    actionContainer.classList.remove('show-progress');
    actionContainer.classList.add('is-sliding-out');

    // Wait for transition to finish before cleaning up.
    progressSection.addEventListener(
        'transitionend',
        function handleSlideOut(event) {
            if (event.propertyName === 'transform') {
                actionContainer.classList.remove('is-sliding-out');
                progressSection.setAttribute('aria-hidden', 'true');
                backdrop.setAttribute('aria-hidden', 'true');

                progressSection.removeEventListener('transitionend', handleSlideOut);
            }
        }
    );
}


form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate the form before proceeding.
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Call the start function to initiate the job.

    actionContainer.classList.add('show-progress');
    progressSection.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
});

cancelBtn.addEventListener('click', () => {
    hideProgressSection();
});
