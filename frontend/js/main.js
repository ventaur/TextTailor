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
