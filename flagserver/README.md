
[TOC]

# flagserver

## 运行 
```
python2/3 main.py
```
## Gamebox 发送flag的方法
### GET 方式
http://127.0.0.1:62088/flag/Flag_In_Here  
http://127.0.0.1:62088/flag/Flag_In_Here/Ip_In_Here

use in Gamebox
```
#retry -t 2 ,timeout -T 2,https --no-check-certificat
wget -O- -q -T 2 -t 2 http://127.0.0.1:62088/flag/`cat flag`

#retry --retry 2 ,timeout -m 2,https -k
curl -m 2 --retry 2 -s http://127.0.0.1:62088/flag/`cat flag`
```


### POST 方式
http://127.0.0.1:62088/flag  Postdata: flag=Flag_In_Here  
http://127.0.0.1:62088/flag  Postdata: flag=Flag_In_Here&ip=Ip_In_Here  
http://127.0.0.1:62088/flagx  Postdata: Flag_In_Here  

use in Gamebox  

```
wget -O- -q -T 2 -t 2 --post-data flag=`cat flag` http://127.0.0.1:62088/flag
curl -m 2 --retry 2 -s -d flag=`cat flag` http://127.0.0.1:62088/flag

wget -O- -q -T 2 -t 2 --post-file flag http://127.0.0.1:62088/flagx
cat flag |curl -d @- -m 2 --retry 2 -s http://127.0.0.1:62088/flagx
curl -d @flag -m 2 --retry 2 -s http://127.0.0.1:62088/flagx

```

## 显示flag
### 显示每个IP最新的flag  
多次接收到同一个IP的不同flag，仅显示最后一个flag  
HTML  http://127.0.0.1:62088/secret/static/givemeflag/index.html  
json  http://127.0.0.1:62088/secret/showflagjson  

### 显示接收到的所有flag   
多次接收到同一个IP的同一个flag，时间为第一次接收的时间  
HTML  http://127.0.0.1:62088/secret/static/givemeflag/showallflag.html  
txt   http://127.0.0.1:62088/secret/showallflag  
json  http://127.0.0.1:62088/secret/showallflagjson  


*注意： 地址中的secret ，为main.py 变量secret_key的值，请注意修改。否则有可能自己的flag被别人偷走。*



## Clear Data
```
rm -f db.db
```

**********
# flag_auto_submit
1. 请抓取flag提交时的http请求到flag_submit_request.txt，并将其中的ip和flag部分替换为 {ip}、{flag}  。  
1. flag自动提交模块，将会从数据库flag_submit表(该表中存放接收到的所有不重复的flag，时间为第一次接收到的时间)中，取出提交次数小于等于3次进行提交（可自行修改sql语句进行更改）。  
1. 脚本会自动替换flag_submit_request.txt 中的{ip}、{flag}为ip 和 flag 进行提交。   
