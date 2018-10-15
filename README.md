### RUN

# rebuild and run container for specific service
docker-compose -f <docker-compose-config-file> up -d --build <service-name>

# tail service logs
docker-compose logs -f <service-name>

### CONTAINERS

# list all
docker ps -a

# remove all not running containers 
docker container prune -f

### IMAGES

# list all
docker images -a 

# remove all images without assocoated containers 
docker image prune -a

### VOLUMES

# list all
docker volume ls

# remove not used
docker volume prune

### GLOBAL

# remove 
docker system prune

# remove all
docker system prune -a

# 
docker run -it -p 5000:5000 --link redis -e KUE_PREFIX=queue christophwitzko/kue-ui

docker exec -it server-redis redis-cli FLUSHALL




docker rm $(docker ps -a -q)
docker rmi $(docker images -f "dangling=true" -q)
docker volume rm $(docker volume ls -qf dangling=true)