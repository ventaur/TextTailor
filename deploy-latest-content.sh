#!/bin/bash


# Build the frontend with the appropriate API_URL env var.
(cd frontend && API_URL=/api yarn build)
./sync.sh
./restart-services.sh