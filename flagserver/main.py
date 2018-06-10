#!/usr/bin/env python
# -*- coding: utf-8 -*-
# author: 36huo


from bottle import route, run, template, request, static_file
import sqlite3
import time
import json
import subprocess
import os

BASE_PATH = os.path.abspath(os.path.dirname(__file__))

# please modyfi value of secret_key 
secret_key='secret'


def new_and_show(tbl_name):
    """插入并显示记录"""
    # 插入记录到表
    con.execute("INSERT INTO " + tbl_name + " (title) VALUES ('shopping');")
    # 查询表记录
    for row in con.execute("SELECT * FROM " + tbl_name):
        print(row)

def clr(tbl_name):
    """清除表记录"""
    con.execute("DELETE FROM " + tbl_name)
def creat_db():
    con.execute("""
CREATE TABLE flag
(
    id INTEGER PRIMARY KEY NOT NULL,
    timestamp INTEGER,
    ip TEXT,
    flag TEXT,
    comments TEXT
);""")
    con.execute("""
CREATE TABLE "flag_submit" (
    "id"  INTEGER PRIMARY KEY NOT NULL,
    "timestamp"  INTEGER,
    "ip"  TEXT,
    "flag"  TEXT,
    "submitted"  INTEGER DEFAULT 0,
    "submit_time"  INTEGER DEFAULT 0,
    "comments"  TEXT
);""")


def insert_flag(remoteip,flag):
    param=[int(time.time()),remoteip,flag,'']
    con.execute("INSERT INTO flag(timestamp,ip,flag,comments) VALUES (?,?,?,?);",param)
    param=[int(time.time()),remoteip,flag,remoteip,flag]
    con.execute("INSERT INTO flag_submit(timestamp,ip,flag) select ?,?,? where not exists (select id from flag_submit where  ip=? and flag=?)",param)
    con.commit()
    return remoteip,flag

# 自定义row构造器，返回字典对象，可以通过列名索引
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

print(os.path.join(BASE_PATH, "db.db"))
con = sqlite3.connect(os.path.join(BASE_PATH, "db.db"))
con.row_factory = dict_factory
try:
    creat_db()
except:
    pass


static_path=os.path.join(BASE_PATH, './static')
@route('/%s/static/<filename:re:.*\.json|.*\.html|.*\.htm|.*\.js|.*\.sh|.*\.txt|.*\.css|.*\.js|.*\.png|.*\.jpg|.*\.gif>' % secret_key)
def server_static(filename):
    return static_file(filename, root=static_path)


@route("/flag/<flag>")
def flag(flag):
    remoteip=request.get('REMOTE_ADDR')
    return 'success %s %s' % insert_flag(remoteip,flag)

@route("/flag/<flag>/<ip>")
def flag(flag,ip):
    return 'success %s %s' %     insert_flag(ip,flag)

@route('/flag', method='POST')
def flag():
    postValue = request.POST.decode('utf-8')
    remoteip=request.get('REMOTE_ADDR')
    flag=request.POST.get('flag')
    ip=request.POST.get('ip')
    if not(ip is None):
        remoteip=ip
    return 'success %s %s' % insert_flag(remoteip,flag)

@route('/flagx', method='POST')
def flag():
    remoteip=request.get('REMOTE_ADDR')
    flag=request.body.readlines()[0]
    return 'success %s %s' % insert_flag(remoteip,flag)

@route('/hello/<name>')
def index(name):
    return template('<b>Hello {{name}}</b>!', name=name)



@route('/%s/showflagjson' % secret_key)
def showflagjson():
    c = con.cursor()
    cursor = c.execute("select timestamp,ip,flag from flag group by ip order by timestamp desc,ip")
    rows = cursor.fetchall()
    flags=[]
    for row in rows:
        flags.append(row)
    #jsondata={"flags":flags}
    return json.dumps(flags)

@route('/%s/showallflag' % secret_key)
def showallflag():
    c = con.cursor()
    cursor = c.execute("select ip,flag,timestamp,submit_time,submitted from flag_submit order by timestamp desc,ip")
    rows = cursor.fetchall()
    return_str=''
    for row in rows:
        return_str+=row['ip']+','+row['flag']+','+str(time.strftime('%Y-%m-%d_%H:%M:%S',time.localtime(int(row['timestamp']))))+','+str(time.strftime('%Y-%m-%d_%H:%M:%S',time.localtime(int(row['submit_time']))))+','+str(row['submitted'])+'\n'
    return return_str

@route('/%s/showallflagjson' % secret_key)
def showallflagjson():
    c = con.cursor()
    cursor = c.execute("select ip,flag,timestamp,submit_time,submitted from flag_submit order by timestamp desc,ip")
    rows = cursor.fetchall()
    return_str=''
    flags=[]
    for row in rows:
        flags.append(row)
    return json.dumps(flags)

@route('/%s/updateflagstatus/<id>' % secret_key)
def updateflagstatu(id):
    param=[int(time.time()),'',id]
    con.execute("UPDATE flag_submit set submitted=submitted+1,submit_time=?,comments=? where id=?",param)
    con.commit()
    con.commit()
    return 'update id:%s OK' % id


# subprocess.Popen(os.environ['_'] + ' '+os.path.join(BASE_PATH, "flag_auto_submit.py"),shell=True)
# print("/secret_key/static/givemeflag/showallflag.html")
run(host='0.0.0.0', port=62088, threaded=True)
