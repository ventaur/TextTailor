#!/bin/bash
# This script deploys the TextTailor application to a production environment using Docker Compose.
# 1. Be sure to have Docker and Docker Compose installed and configured on the target machine.
# 2. Create a Docker context named 'prod-texttailor' that points to your production server.
#   `docker context create prod-texttailor --docker "host=ssh://user@your-production-server"`

docker --context prod-texttailor compose -f compose.yaml -f compose.prod.yaml up -d --build
