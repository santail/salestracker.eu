FROM pkosiec/mongo-seeding:latest

#
# Copy sample data
#

LABEL maintainer="nikolai muhhin <nikolai.muhhin@gmail.com>"

COPY ./data /import-data

#
# Set new default environmental variables (optional)
#

WORKDIR /import-data
