# TextTailor
A mass find/replace tool for Ghost post/page content.

## Development
This is a monorepo without the niceties to support that. 
Run `yarn install` in both `backend` and `frontend` subdirectories.

To run in development mode, run `yarn dev` in both subdirectories.

## Deployment
The root contains Docker Compose files and shell scripts for remote deployment.
However, the scripts are tightly coupled to the original author's "production" setup.

Redeploying the Compose services to build source files directly into containers led to 
superfluous restarts and reissuance of Let's Encrypt certs, which led to rate limits.
This was change to a simple volume mounting solution to avoid that, as the current needs
are very simplistic.

A much better CD pipeline would be next on the list.
