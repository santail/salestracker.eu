FROM pkosiec/mongo-seeding:latest

#
# Copy sample data
#

COPY ./data /app/data

#
# Copy models (optional) - if you're using TypeScript
#

COPY ./models /app/models

#
# Copy helpers (optional) - if you want additional helper functions and other resources
#

COPY ./helpers /app/helpers

#
# Set new default environmental variables (optional)
#

ENV DROP_COLLECTION true
ENV REPLACE_ID_TO_UNDERSCORE_ID true