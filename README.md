First run:
1. docker compose up -d --build
then run:
2. docker exec -it winservices_docker node routes/createdb2.js

3. create folders:
mkdir -p /var/data/winservices/logs
mkdir -p /var/data/winservices/upload
then important!!

4. sudo chown -R 1000:1000 ./var/data/winservices

5. docker compose down -v
6. docker compose up -d --build


----------


After app changes, run:
1. git pull
2. restart docker like this: docker compose up -d --build



----
Testing websocket in server itself:
1. wscat -c ws://127.0.0.1:3000
2. wscat -c wss://in.th-deg.de