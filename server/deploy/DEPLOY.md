# 운영 배포 가이드 — 카페24 이지업 서버호스팅(EASY A) + todayloves.com

전제: 카페24 **이지업 서버호스팅**(root 제공) + **OS는 Ubuntu 22.04 선택**, 도메인 `todayloves.com`.
아래 명령은 전부 서버 SSH에서 root(또는 sudo)로 실행.

> ⚠ 이지업은 APM(Apache 등)이 사전 설치된 상태로 나올 수 있음. 우리는 nginx 를 쓰므로
> Apache 가 80포트를 잡고 있으면 먼저 끈다:
> `systemctl disable --now apache2 2>/dev/null; systemctl disable --now httpd 2>/dev/null`

## 0. DNS 연결 (도메인 → 서버)
- 도메인 관리(카페24/가비아)에서 **A 레코드** 추가:
  - `todayloves.com` → 서버 공인 IP
  - `www.todayloves.com` → 서버 공인 IP
- 전파까지 몇 분~몇 시간. `ping todayloves.com` 으로 확인.

## 1. 서버 기본 세팅
```bash
apt update && apt upgrade -y
apt install -y python3-venv python3-pip nginx mariadb-server git
# 운영 계정 + 디렉터리
useradd -m -s /bin/bash todaylove
mkdir -p /srv/todaylove /var/log/todaylove
chown -R todaylove:todaylove /srv/todaylove /var/log/todaylove
# 방화벽 (카페24 콘솔 보안그룹에서도 80/443 오픈 필요)
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

## 2. DB 생성 (MariaDB — 도커 없이 네이티브, 2GB 서버에 가볍게)
```bash
mysql_secure_installation   # root 비번 설정, 익명계정 제거 등 전부 Y
mysql -u root -p
```
```sql
CREATE DATABASE todaylove CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'todaylove'@'localhost' IDENTIFIED BY '강한비밀번호로교체';
GRANT ALL PRIVILEGES ON todaylove.* TO 'todaylove'@'localhost';
FLUSH PRIVILEGES;
```
메모리 상한 (2GB 서버): `/etc/mysql/mariadb.conf.d/99-todaylove.cnf`
```ini
[mysqld]
innodb_buffer_pool_size = 512M
max_connections = 60
```
```bash
systemctl restart mariadb
```

## 3. 앱 배포
```bash
su - todaylove
cd /srv/todaylove
git clone <저장소 URL> app-repo        # 또는 rsync/scp 로 server/ 폴더 업로드
cd app-repo/server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt gunicorn
mkdir -p /srv/todaylove/uploads
```

### 운영 .env 작성 (`/srv/todaylove/app-repo/server/.env`)
```bash
# 시크릿 3종 생성: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
FLASK_ENV=production
SECRET_KEY=<생성값1>
JWT_SECRET=<생성값2>
ADMIN_TOKEN=<생성값3>
DATABASE_URL=mysql+pymysql://todaylove:강한비밀번호로교체@127.0.0.1:3306/todaylove
DEV_LOGIN_ENABLED=false
CORS_ORIGINS=https://todayloves.com,https://www.todayloves.com
KAKAO_REST_API_KEY=<본앱 REST 키>
KAKAO_CLIENT_SECRET=
APPLE_CLIENT_ID=com.hco.todaylove
WEB_BASE_URL=https://todayloves.com
APP_INSTALL_URL=
UPLOAD_DIR=/srv/todaylove/uploads
```

### 스키마 + 시드
```bash
cd /srv/todaylove/app-repo/server
FLASK_APP=wsgi .venv/bin/flask db upgrade
FLASK_APP=wsgi .venv/bin/flask seed          # 심리테스트·질문 등 콘텐츠
```

### systemd + nginx 등록 (root 로)
```bash
cp deploy/todaylove.service /etc/systemd/system/
# ⚠ service 파일의 WorkingDirectory 경로가 실제 경로(/srv/todaylove/app-repo/server)와 다르면 수정
systemctl daemon-reload && systemctl enable --now todaylove
curl -s http://127.0.0.1:8000/health   # {"status":"ok"} 나와야 함

cp deploy/nginx-todayloves.conf /etc/nginx/sites-available/todayloves
# ⚠ conf 의 /uploads/ alias 경로 확인
ln -s /etc/nginx/sites-available/todayloves /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 4. https (Let's Encrypt — 무료, 자동갱신)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d todayloves.com -d www.todayloves.com
# 이메일 입력, 약관 Y, http→https 리다이렉트 = 2(redirect) 선택
```
확인: `https://todayloves.com/health`, `/terms`, `/privacy`, `/t`

## 5. 크론 (배치 3종)
```bash
crontab -u todaylove -e
```
```cron
*/5 * * * *  cd /srv/todaylove/app-repo/server && FLASK_APP=wsgi .venv/bin/flask recompute-hot >> /var/log/todaylove/cron.log 2>&1
0 9 * * *    cd /srv/todaylove/app-repo/server && FLASK_APP=wsgi .venv/bin/flask notify-daily  >> /var/log/todaylove/cron.log 2>&1
5 9 * * *    cd /srv/todaylove/app-repo/server && FLASK_APP=wsgi .venv/bin/flask notify-best   >> /var/log/todaylove/cron.log 2>&1
```

## 6. 배포 후 외부 설정 갱신 체크리스트
- [ ] 카카오 콘솔(본앱): Redirect URI `https://todayloves.com/auth/kakao/callback` 등록,
      플랫폼 Web 도메인 `https://todayloves.com`, REST 키를 서버 .env 에
- [ ] 카카오 비즈앱/간편가입 심사: 약관 `https://todayloves.com/terms`, 방침 `/privacy` URL 제출
- [ ] 앱 `eas.json` 의 preview/production `EXPO_PUBLIC_API_BASE_URL` → `https://todayloves.com`
- [ ] 스토어 등록정보에 개인정보처리방침 URL 기입

## 7. 코드 업데이트 배포 (이후 반복)
```bash
su - todaylove
cd /srv/todaylove/app-repo && git pull
cd server && .venv/bin/pip install -r requirements.txt
FLASK_APP=wsgi .venv/bin/flask db upgrade
exit
systemctl restart todaylove
```
