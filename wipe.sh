#!/bin/bash
sudo -u postgres psql -d eventpro <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO eventpro;
EOF
echo "Schema reset!"
