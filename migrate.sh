#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

apt update
apt install -y openjdk-17-jdk
systemctl stop tomcat9
systemctl disable tomcat9

# We do not create user because on Ubuntu 22.04 with Tomcat9 it already exists
TOMCAT_USER=tomcat
TOMCAT_BASE_URL="https://downloads.apache.org/tomcat/tomcat-11"
# Magic: read the directory contents
TOMCAT_VERSION=$(curl -fsSL "$TOMCAT_BASE_URL/" | grep -oE 'v11\.[0-9]+\.[0-9]+/' | sed 's|^v||; s|/$||' | sort -V | tail -n 1)
if [[ -z "$TOMCAT_VERSION" ]]; then
    echo "Failed to determine the latest Tomcat version" >&2
    exit 1
fi
TOMCAT_DIR_OLD=/var/lib/tomcat9
TOMCAT_DIR_NEW=/var/lib/tomcat11
cd /tmp
wget $TOMCAT_BASE_URL/v$TOMCAT_VERSION/bin/apache-tomcat-$TOMCAT_VERSION.tar.gz
mkdir -p $TOMCAT_DIR_NEW
tar xzf apache-tomcat-$TOMCAT_VERSION.tar.gz -C $TOMCAT_DIR_NEW --strip-components=1
rm -f apache-tomcat-$TOMCAT_VERSION.tar.gz
chmod +x $TOMCAT_DIR_NEW/bin/*.sh
rm -rf $TOMCAT_DIR_NEW/webapps/*

# Copy old contents
cp -rL $TOMCAT_DIR_OLD/work $TOMCAT_DIR_NEW
cp -r $TOMCAT_DIR_OLD/ssl $TOMCAT_DIR_NEW
cp $TOMCAT_DIR_OLD/conf/server.xml $TOMCAT_DIR_NEW/conf
mkdir -p $TOMCAT_DIR_NEW/conf/Catalina/localhost 
cp $TOMCAT_DIR_OLD/conf/Catalina/localhost/ROOT.xml $TOMCAT_DIR_NEW/conf/Catalina/localhost

cd $SCRIPT_DIR

# Deploy the new version
cp lib/* $TOMCAT_DIR_NEW/lib
SERVER_WAR=$(ls hmdm*.war | tail -1)
cp $SERVER_WAR $TOMCAT_DIR_NEW/webapps/ROOT.war

chown -R $TOMCAT_USER:$TOMCAT_USER $TOMCAT_DIR_NEW/*

cp tomcat11.service /etc/systemd/system
systemctl daemon-reload
systemctl enable tomcat11
systemctl start tomcat11

# Update Headwind MDM scripts
sed -i 's/tail -n1/head -n1/g' /opt/hmdm/letsencrypt-ssl.sh
sed -i 's/tail -n1/head -n1/g' /opt/hmdm/update-web-app.sh
sed -i 's/tomcat9/tomcat11/g' /opt/hmdm/cpu_monitor.sh


