const ApiBaseUrl = window.__CONFIG__.apiUrl;

const UrlReplaceText = `${ApiBaseUrl}/replace-text`;
const UrlJobProgress = `${ApiBaseUrl}/job-progress`;
const UrlCancelJob = `${ApiBaseUrl}/cancel-job`;

const ClassShowProgress = 'show-progress';
const ClassIsSlidingOut = 'is-sliding-out';
const ClassHidden = 'hidden';
const AttrAriaHidden = 'aria-hidden';

const EventBeforeUnload = 'beforeunload';
const EventClick = 'click';
const EventSubmit = 'submit';
const EventTransitionend = 'transitionend';

const JobEvents = {
    Progress: 'progress',
    Complete: 'complete',
    Error: 'error',
    Cancel: 'cancel',
    Cleanup: 'cleanup'
}

const JobTypes = {
    Post: 'post',
    Page: 'page'
};

const MethodPost = 'POST';
const StringTrue = 'true';
const StringFalse = 'false';


// Retrieve the necessary DOM elements.
const actionContainer = document.querySelector('.action-container');
const form = document.getElementById('formTextTailor');
const confirmReplaceAll = document.getElementById('confirmReplaceAll');
const cancelBtn = document.getElementById('btnCancel');
const backdrop = document.querySelector('.backdrop');

const progressSection = document.getElementById('progressSection');
const progressHeading = document.getElementById('progressHeading');
const textToReplaceStatus = document.getElementById('textToReplaceStatus');
const replacementTextStatus = document.getElementById('replacementTextStatus');
const postProgress = document.getElementById('postProgress');
const postStatus = document.getElementById('postStatus');
const pageProgress = document.getElementById('pageProgress');
const pageStatus = document.getElementById('pageStatus');
const summary = document.getElementById('summary');


let isFinished = false;
let completedJobCount = 0;
let summaryStats = {};


/**
 * Starts the text replacement job by sending a POST request to the server.
 * It retrieves the job IDs for both post and page replacements, then tracks their progress.
 */
async function start() {
    const data = getFormData();
    const res = await fetch(UrlReplaceText, {
        method: MethodPost, 
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    const { postJobId, pageJobId } = await res.json();
    isFinished = false;
    completedJobCount = 0;
    summaryStats = {};

    wireUpCancelButton(postJobId, pageJobId);

    trackJob(postJobId, JobTypes.Post, postProgress, postStatus);
    trackJob(pageJobId, JobTypes.Page, pageProgress, pageStatus);
}

/**
 * 
 * @param {string} jobId - The unique identifier of the job to track.
 * @param {string} jobType - The type of job (post or page).
 * @param {Element} progressElement - The HTML element to update with the job's progress.
 * @param {Element} statusElement - The HTML element to update with the job's status.
 */
function trackJob(jobId, jobType, progressElement, statusElement) {
    const sse = new EventSource(`${UrlJobProgress}/${jobId}`);

    const handleProgress = (event) => {
        const { progress } = JSON.parse(event.data);
        progressElement.value = progress;
        statusElement.textContent = `⌛ Progress: ${progress}%`;
    };

    const handleComplete = (event) => {
        const { stats } = JSON.parse(event.data);
        progressElement.value = 100;
        statusElement.textContent = '✅ Status: Complete';
        cleanup();

        onJobComplete(jobType, stats);
    };

    const handleError = (event) => {
        const { message } = JSON.parse(event?.data || '{ "message": "Unknown error" }');
        statusElement.textContent = `❌ Status: Error - ${message}`;
        cleanup();
    };

    const handleCancel = () => {
        statusElement.textContent = '❌ Status: Cancelled';
        cleanup();
    };

    const cleanup = () => {
        sse.close();
        window.removeEventListener(EventBeforeUnload, handleUnload);
    };

    const handleUnload = () => {
        sse.close();

        if (completedJobCount < 2) {
            navigator.sendBeacon(`${UrlCancelJob}/${jobId}`);
        }
    }

    sse.addEventListener(JobEvents.Progress, handleProgress);
    sse.addEventListener(JobEvents.Complete, handleComplete);
    sse.addEventListener(JobEvents.Error, handleError);
    sse.addEventListener(JobEvents.Cancel, handleCancel);

    window.addEventListener(EventBeforeUnload, handleUnload);
}


function getFormData() {
    const formData = new FormData(form);
    const data = {};

    for (const pair of formData) {
        data[pair[0]] = pair[1];
    }

    return data;
}

function showProgressSection() {
    textToReplaceStatus.textContent = form.textToReplace.value;
    replacementTextStatus.textContent = form.replacementText.value;

    // Reset the progress and status elements to their initial state.
    postProgress.value = 0;
    postStatus.textContent = 'Progress: 0%';
    pageProgress.value = 0;
    pageStatus.textContent = 'Progress: 0%';

    summary.classList.add(ClassHidden);

    actionContainer.classList.add(ClassShowProgress);
    progressSection.setAttribute(AttrAriaHidden, StringFalse);
    backdrop.setAttribute(AttrAriaHidden, StringFalse);
}

function hideProgressSection() {
    // Ensure the confirmation checkbox is unchecked to prevent accidental restarting.
    confirmReplaceAll.checked = false;

    actionContainer.classList.remove(ClassShowProgress);
    actionContainer.classList.add(ClassIsSlidingOut);

    // Wait for transition to finish before cleaning up.
    progressSection.addEventListener(
        EventTransitionend,
        function handleSlideOut(event) {
            if (event.propertyName === 'transform') {
                actionContainer.classList.remove(ClassIsSlidingOut);
                progressSection.setAttribute(AttrAriaHidden, StringTrue);
                backdrop.setAttribute(AttrAriaHidden, StringTrue);

                progressSection.removeEventListener(EventTransitionend, handleSlideOut);
            }
        }
    );
}

function showSummary() {
    let summaryHtml = `
        <h3>Summary</h3>
        <ul>
            <li>
                ${summaryStats.posts?.articleCount || 0} posts were processed.
            </li>
            <li>
                ${summaryStats.posts?.matchCount || 0} post matches were found and 
                ${summaryStats.posts?.replacedCount || 0} replacements were made.
            </li>
            <li>
                ${summaryStats.posts?.errorCount || 0} posts encountered errors during processing.
            </li>
            
            <li>
                ${summaryStats.pages?.articleCount || 0} pages were processed.
            </li>
            <li>
                ${summaryStats.pages?.matchCount || 0} page matches were found and 
                ${summaryStats.pages?.replacedCount || 0} replacements were made.
            </li>
            <li>
                ${summaryStats.pages?.errorCount || 0} pages encountered errors during processing.
            </li>
        </ul>
    `;

    if (summaryStats.posts?.replacedCount < summaryStats.posts?.matchCount ||
        summaryStats.pages?.replacedCount < summaryStats.pages?.matchCount) {
        summaryHtml += `
            <div class="alert alert-warning">
                <strong>Warning:</strong> Some matches in articles could not be replaced. 
                This typically happens when some text to replace has different casing or mixed formatting (e.g., bold, italic) 
                or is partially included in a link.
            </div>
        `;
    }

    summary.innerHTML = summaryHtml;
    summary.classList.remove(ClassHidden);
}

function onJobComplete(jobType, stats) {
    if (jobType === JobTypes.Post) {
        summaryStats.posts = stats;
    } else if (jobType === JobTypes.Page) {
        summaryStats.pages = stats;
    }

    completedJobCount++;
    
    // If both jobs are complete, show a summary and change the cancel button's text.
    isFinished = (completedJobCount === 2);
    if (isFinished) {
        showSummary();
        progressHeading.textContent = 'All Jobs Completed';
        cancelBtn.textContent = 'Close';
    }
}


form.addEventListener(EventSubmit, (e) => {
    e.preventDefault();

    // Validate the form before proceeding.
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Call the start function to initiate the job.
    start()
        .then(() => {
            showProgressSection();
        })
        .catch((error) => {
            console.error('Error starting the job:', error);
            alert('An error occurred while starting the job. Please try again later.');
        });
});

function wireUpCancelButton(...jobIds) {    
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener(
        EventClick, 
        async function handleClick(e) {
            e.preventDefault();

            if (!isFinished) {
                const responses = await Promise.all(jobIds.map(id => fetch(`${UrlCancelJob}/${id}`, { method: MethodPost })));
                // TODO: Handle the responses to check if the cancellation was successful.
            }

            hideProgressSection();

            cancelBtn.removeEventListener(EventClick, handleClick);
        }
    );
}
