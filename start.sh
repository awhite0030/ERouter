docker stop erouter
docker rm erouter
docker build -t erouter .
docker run -d --name erouter -p 20128:20128 --env-file .env -v erouter-data:/app/data erouter