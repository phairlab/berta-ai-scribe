FROM nginx:alpine

ARG required FRONTEND_SERVICE
ARG required BACKEND_SERVICE

ENV FRONTEND_SERVICE=$FRONTEND_SERVICE
ENV BACKEND_SERVICE=$BACKEND_SERVICE

RUN apk update && apk add bash

EXPOSE 8000

COPY nginx.conf.template /nginx.conf.template

CMD ["/bin/sh" , "-c" , "envsubst '$FRONTEND_SERVICE $BACKEND_SERVICE' < /nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]