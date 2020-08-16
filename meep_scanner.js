const core = require('@actions/core')
const github = require('@actions/github')
const https = require('https');

// When a number of commits are pushed, each commit message is
// scanned for the tag [MEEP]. If identified, the meep is submitted
// for tracking which will eventually open a meep issue.

function dispatch_meep(commit) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            user: commit.author.username,
            message: commit.message,
            id: commit.id,
        });

        const req = https.request({
            host: 'us-central1-gentle-cable-286422.cloudfunctions.net',
            path: 'meeper',
            method: 'POST',
            headers: {
                'User-Agent': 'meep-action',
                'Content-Type': 'application/json',
                'Content-Length': body.length,
            }
        }, (res) => {
            res.setEncoding('utf8');
            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                console.log(chunks.join(''));
                resolve();
            })
        });

        req.write(body);
        req.end();
    })
}

try {
    const payload = github.context.payload;
    if (!payload.commits) {
        console.log(`No commits detected in payload! ${JSON.stringify(payload, undefined, 2)}`);
        process.exit(0);
    }

    // Check if the MEEP issue label has been created
    const token = core.getInput('github_token');
    const octokit = github.getOctokit(token);
    octokit.issues.getLabel({
        owner: github.context.owner,
        repo: github.context.repo,
        name: 'MEEP',
    }).then((value) => {
        console.log(value);
    });

    const dispatches = [];

    for (let i = 0; i !== payload.commits.length; ++i) {
        const commit = payload.commits[i];

        // Parse commit text for MEEP requests
        const message = commit.message;
        if (message.includes('[MEEP]')) {
            // Dispatch a cloud function to track the request
            dispatches.push(dispatch_meep(commit));
        }
    }

    console.log(JSON.stringify(payload, undefined, 2));

    Promise.all(dispatches).then(() => {
        console.log(`${dispatches.length} MEEP${dispatches.length > 1 ? 's' : ''} dispatched!`);
    })
} catch (e) {
    core.setFailed(e.message);
}