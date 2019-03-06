### RUN

# rebuild and run container for specific service
docker-compose -f <docker-compose-config-file> up -d --build <service-name>

# tail service logs
docker-compose logs -f <service-name> --tail="20"  

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








# return all documents
curl -X POST -H 'Content-Type: application/json' "http://localhost:9200/salestracker-eng/offers/_search?pretty" -d '{"query": {"match_all" : { }}}'

# delete all documents in type
curl -X POST "localhost:9200/salestracker-est/offers/_delete_by_query?pretty" -H 'Content-Type: application/json' -d'{"query": {"match_all": {}}}'

# delete index
curl -X DELETE "localhost:9200/salestracker-eng"

# run tests
mocha -r ts-node/register tests/parsers.spec.js



curl -XPOST 'localhost:9200/salestracker-eng/offers/_delete_by_query?conflicts=proceed&pretty' -d'
{ "query": { "match_all": {} } }'