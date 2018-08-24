# RUN

# rebuild and run container 
docker-compose -f <docker-compose-config-file> up -d --build <service-name>

# tail service logs
docker-compose logs -f <service-name>

# CONTAINERS

# list all
docker ps -a

# remove all not running caontainers 
docker container prune -f

# IMAGES

# list all
docker images -a 

# remove all images without assocoated containers 
docker image prune -a

# VOLUMES

# list all
docker volume ls

# remove not used
docker volume prune