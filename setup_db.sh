#!/bin/bash
sudo -u postgres psql <<EOF
CREATE USER eventpro WITH PASSWORD 'eventpro123';
CREATE DATABASE eventpro OWNER eventpro;
GRANT ALL PRIVILEGES ON DATABASE eventpro TO eventpro;
\c eventpro
GRANT ALL ON SCHEMA public TO eventpro;
EOF
echo "=== BASE DE DATOS CREADA EXITOSAMENTE ==="
