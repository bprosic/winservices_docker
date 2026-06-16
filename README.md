docker exec -it winservices_docker node routes/createdb2.js

create folders:
mkdir -p /var/data/winservices/logs
mkdir -p /var/data/winservices/upload
then important!!

sudo chown -R 1000:1000 ./var/data/winservices


restart docker
docker compose down -v
docker compose up -d --build