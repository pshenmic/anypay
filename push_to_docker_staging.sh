docker login --email $DOCKER_EMAIL \
             --username $DOCKER_USER \
             --password $DOCKER_PASSWORD 

docker tag anypay anypay/api.anypay.global:staging
docker push anypay/api.anypay.global:staging
