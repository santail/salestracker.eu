#!/bin/sh

echo 'Creating web-admin application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_WEB_ADMIN_MONGO_USER}', pwd: '${APP_WEB_ADMIN_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating web-public application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_WEB_PUBLIC_MONGO_USER}', pwd: '${APP_WEB_PUBLIC_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating backend-finder application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_BACKEND_FINDER_MONGO_USER}', pwd: '${APP_BACKEND_FINDER_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating backend-harvester application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_BACKEND_HARVESTER_MONGO_USER}', pwd: '${APP_BACKEND_HARVESTER_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating backend-janitor application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_BACKEND_JANITOR_MONGO_USER}', pwd: '${APP_BACKEND_JANITOR_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating backend-notifier application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_BACKEND_NOTIFIER_MONGO_USER}', pwd: '${APP_BACKEND_NOTIFIER_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

echo 'Creating backend-processor application user and db'

mongo salestracker --host localhost --port 27017 -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin --eval "db.createUser({user: '${APP_BACKEND_PROCESSOR_MONGO_USER}', pwd: '${APP_BACKEND_PROCESSOR_MONGO_PASSWORD}', roles:[{role:'dbOwner', db: '${APP_MONGO_DB}'}]});"

