FROM hub.mingdao.com/runtime/amd64/nodejs:20.13.1-pkg as builder

WORKDIR /usr/local/teams
COPY . /usr/local/teams
ENV USER root
RUN npm config set registry http://mirrors.cloud.tencent.com/npm/
RUN npm install --unsafe-perm
RUN apt-get update && apt-get install -y grep sed
RUN find /usr/local/teams/node_modules -type f -exec sed -i 's/Underscore.js 1.8.3//g' {} +
RUN npm run build


FROM hub.mingdao.com/ops/centos:7.6.1810-nodejs-12.16.1-pm2
WORKDIR /usr/local/teams

ENV TIME_ZONE Asia/Shanghai
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /usr/local/teams/package /usr/local/teams
COPY --from=builder /usr/local/teams/start.json /usr/local/teams/start.json

EXPOSE 3978
CMD ["pm2-docker", "./start.json"]