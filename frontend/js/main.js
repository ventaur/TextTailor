const ApiBaseUrl = 'http://localhost:3000';

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

const MethodPost = 'POST';
const StringTrue = 'true';
const StringFalse = 'false';


const actionContainer = document.querySelector('.action-container');
const form = document.getElementById('formTextTailor');
const confirmReplaceAll = document.getElementById('confirmReplaceAll');
const cancelBtn = document.getElementById('btnCancel');
const progressSection = document.getElementById('progressSection');
const backdrop = document.querySelector('.backdrop');

let completedJobCount = 0;
async function start() {
    const res = await fetch('/replace-text', { method: 'POST' });
    
    const { postJobId, pageJobId } = await res.json();
    const sse = new EventSource(`${UrlJobProgress}/${jobId}`);

    const handleProgress = (event) => {
        const { progress } = JSON.parse(event.data);
        progressElement.value = progress;
        statusElement.textContent = `Progress: ${progress}%`;
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
function showProgressSection() {
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

form.addEventListener(EventSubmit, (e) => {
    e.preventDefault();

    // Validate the form before proceeding.
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Call the start function to initiate the job.
            showProgressSection();
