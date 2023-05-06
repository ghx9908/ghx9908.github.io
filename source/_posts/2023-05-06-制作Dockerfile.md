---
title: 制作Dockerfile
author: 高红翔
date: 2023-05-06 11:35:39
categories: 前端运维
tags: docker
---

## 制作 Dockerfile

https://docs.docker.com/engine/reference/commandline/build/

- Docker 的镜像是用一层一层的文件组成的
- Layers 就是镜像的层文件，只读不能修改。基于镜像创建的容器会共享这些文件层

```bash
docker image ls # 列出所有镜像
docker inspect centos |  docker image inspect centos # 查看镜像或者容器详细信息
docker build -t express-demo:1.0.0 . # 创建镜像
```

### 1 编写 Dockerfile

https://docs.docker.com/engine/reference/builder

| 指令             | 含义                                                         | 示例                                                         |
| :--------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| FROM             | 构建的新镜像是基于哪个镜像                                   | FROM centos:6                                                |
| MAINTAINER(废弃) | 镜像维护者姓名或邮箱地址                                     | MAINTAINER zhufengjiagou                                     |
| RUN              | 构建镜像时运行的 shell 命令                                  | RUN yum install httpd                                        |
| CMD              | CMD 设置容器启动后默认执行的命令及其参数，但 CMD 能够被 docker run 后面跟的命令行参数替换 | CMD /usr/sbin/sshd -D                                        |
| EXPOSE           | 声明容器运行的服务器端口                                     | EXPOSE 80 443                                                |
| ENV              | 设置容器内的环境变量                                         | ENV MYSQL_ROOT_PASSWORD 123456                               |
| ADD              | 拷贝文件或目录到镜像中，如果是 URL 或者压缩包会自动下载和解压 | ADD ,ADD https://xxx.com/html.tar.gz /var/[www.html](http://www.html/), ADD html.tar.gz /var/www/html |
| COPY             | 拷贝文件或目录到镜像                                         | COPY ./start.sh /start.sh                                    |
| ENTRYPOINT       | 配置容器启动时运行的命令                                     | ENTRYPOINT /bin/bash -c '/start.sh'                          |
| VOLUME           | 指定容器挂载点到宿主自动生成的目录或其它容器                 | VOLUME ["/var/lib/mysql"]                                    |
| USER             | 为 RUN CMD 和 ENTRYPOINT 执行命令指定运行用户                | USER zhufengjiagou                                           |
| WORKDIR          | 为 RUN CMD ENTRYPOINT COPY ADD 设置工作目录                  | WORKDIR /data                                                |
| HEALTHCHECK      | 健康检查                                                     | HEALTHCHECK --interval=5m --timeout=3s --retries=3 CMS curl -f htp://localhost |
| ARG              | 在构建镜像时指定一些参数                                     | ARG user                                                     |

- cmd 给出的是一个容器的默认的可执行体。也就是容器启动以后，默认的执行的命令。重点就是这个"默认"。意味着，如果`docker run`没有指定任何的执行命令或者`dockerfile`里面也没有`entrypoint`，那么，就会使用 cmd 指定的默认的执行命令执行。同时也从侧面说明了`entrypoint`的含义，它才是真正的容器启动以后要执行命令

### 2 .dockerignore

表示要排除，不要打包到 image 中的文件路径

```js
.git
node_modules
```

### 3 Dockerfile

#### 3.1 [安装 node](https://cloud.tencent.com/developer/beta/article/1886344)

#### 2 安装 express 项目生成器

```js
npm install express-generator -g
express app
```

#### 3 Dockerfile

- `vi Dockerfile`

```js
FROM node
COPY ./app /app
WORKDIR /app
RUN npm install
EXPOSE 3000
```

- FROM 表示该镜像继承的镜像 :表示标签
- COPY 是将当前目录下的 app 目录下面的文件都拷贝到 image 里的/app 目录中
- WORKDIR 指定工作路径，类似于执行 `cd` 命令
- RUN npm install 在/app 目录下安装依赖，安装后的依赖也会打包到 image 目录中
- EXPOSE 暴露 3000 端口，允许外部连接这个端口

### 4 创建 image

- -t --tag list 镜像名称
- -f --file string 指定 Dockerfile 文件的位置

```bash
docker build -t express-demo .

docker build -t express-demo:1.0.0 .

docker build -t express-demo:1.0.0 -f ./Dockerfile .
```

- -t 用来指定 image 镜像的名称，后面还可以加冒号指定标签，如果不指定默认就是 latest
- `.`就表示当前路径



### 5 使用新的镜像运行容器

```bash
docker container run -p 3333:3000 -it express-demo /bin/bash
```

```bash
npm start
```

- `-p` 参数是将容器的3000端口映射为本机的3333端口
- `-it` 参数是将容器的shell容器映射为当前的shell,在本机容器中执行的命令都会发送到容器当中执行
- `express-demo` image的名称
- /bin/bash 容器启动后执行的第一个命令,这里是启动了bash容器以便执行脚本
- `--rm` 在容器终止运行后自动删除容器文件



### 6 CMD

Dockerfile

```diff
+ CMD npm start
```

重新制作镜像

```js
docker build -t express-demo .
docker container run -p 3333:3000 express-demo
```

- RUN命令在 image 文件的构建阶段执行，执行结果都会打包进入 image 文件；CMD命令则是在容器启动后执行
- 一个 Dockerfile 可以包含多个RUN命令，但是只能有一个CMD命令
- 指定了CMD命令以后，docker container run命令就不能附加命令了（比如前面的/bin/bash），否则它会覆盖CMD命令



### 7 发布image

- [注册账户](https://hub.docker.com/)
- docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]

```bash
# 登陆
docker login
# 生成镜像
docker image tag [imageName] [username]/[repository]:[tag]
docker image build -t [username]/[repository]:[tag] .

docker image tag  hello-world:latest gaohongxiangi/hello-world:1.0.1

# 推送
docker push gaohongxiangi/hello-world:1.0.1
```
