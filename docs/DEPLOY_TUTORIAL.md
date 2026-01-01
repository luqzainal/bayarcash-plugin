# 📚 Tutorial: Deploy BayarCash Plugin ke Dokploy

Tutorial ni untuk orang yang baru pertama kali nak deploy app ke server. Ikut step by step!

---

## 📋 Apa Yang Kita Akan Buat

```
[Komputer Kamu] → [GitHub] → [Dokploy/Proxmox] → [Cloudflare Tunnel] → [Internet]
```

Domain akhir: `https://bayarcash.kodekreatif.com`

---

## 🔧 Keperluan Sebelum Mula

1. **GitHub account** - untuk simpan code
2. **Dokploy** - dah install dalam Proxmox VM
3. **Cloudflare account** - untuk Zero Trust tunnel
4. **GHL credentials** - CLIENT_ID dan CLIENT_SECRET

---

## PART 1: Push Code ke GitHub

### Step 1.1: Buka CMD dan pergi ke folder project

```cmd
cd "f:\PROJEK2\mern toyyibpay"
```

### Step 1.2: Initialize Git (kalau belum ada)

```cmd
git init
```

### Step 1.3: Add semua files

```cmd
git add .
```

### Step 1.4: Commit changes

```cmd
git commit -m "Add Docker deployment files"
```

### Step 1.5: Buat repo baru di GitHub

1. Pergi ke https://github.com/new
2. Nama repo: `bayarcash-plugin` (atau apa-apa nama)
3. Pilih **Private** kalau taknak orang lain nampak
4. Jangan tick apa-apa checkbox
5. Klik **Create repository**

### Step 1.6: Connect local ke GitHub

```cmd
git remote add origin https://github.com/YOUR_USERNAME/bayarcash-plugin.git
git branch -M main
git push -u origin main
```

> ⚠️ Tukar `YOUR_USERNAME` dengan username GitHub kamu

---

## PART 2: Setup Dokploy

### Step 2.1: Login ke Dokploy

1. Buka browser
2. Pergi ke Dokploy kamu (contoh: `http://192.168.1.100:3000`)
3. Login dengan credentials kamu

### Step 2.2: Connect GitHub ke Dokploy

1. Klik **Settings** (gear icon)
2. Klik **Git Providers**
3. Klik **Add Provider** → pilih **GitHub**
4. Ikut arahan untuk authorize Dokploy access ke GitHub kamu

### Step 2.3: Buat Project Baru

1. Klik **Projects** di sidebar
2. Klik **+ Create Project**
3. Nama: `bayarcash-plugin`
4. Klik **Create**

### Step 2.4: Add Compose Service

1. Dalam project tadi, klik **+ Add Service**
2. Pilih **Compose**
3. Klik **Create**

### Step 2.5: Configure Source

1. Tab **General** → Source Type: **Git**
2. Repository: Pilih repo `bayarcash-plugin` yang kamu push tadi
3. Branch: `main`
4. Compose Path: `./docker-compose.yml` (default)

---

## PART 3: Setup Environment Variables

### Step 3.1: Pergi ke tab Environment

Klik tab **Environment** dalam Compose service

### Step 3.2: Add Environment Variables

Copy paste ni satu-satu:

```
CLIENT_ID=your_ghl_client_id_here
CLIENT_SECRET=your_ghl_client_secret_here
REDIRECT_URI=https://bayarcash.kodekreatif.com/api/oauth/callback
FRONTEND_URL=https://bayarcash.kodekreatif.com
BACKEND_URL=https://bayarcash.kodekreatif.com/api
DB_USER=root
DB_PASSWORD=bayarcash123
DB_NAME=ghl_bayarcash
GHL_TOKEN_URL=https://services.leadconnectorhq.com/oauth/token
BAYARCASH_API_URL_PRODUCTION=https://api.bayar.cash
BAYARCASH_API_URL_SANDBOX=https://api.console.bayar.cash
```

> ⚠️ **PENTING**: Tukar `your_ghl_client_id_here` dan `your_ghl_client_secret_here` dengan credentials sebenar dari GHL!

### Step 3.3: Save

Klik **Save** untuk simpan environment variables

---

## PART 4: Deploy!

### Step 4.1: Deploy Compose

1. Klik button **Deploy** (atau **Redeploy**)
2. Tunggu... proses ni ambil masa dalam 2-5 minit
3. Kalau ada error, check **Logs** tab

### Step 4.2: Check Status

1. Tunggu sampai status jadi **Running** (hijau)
2. Kalau **Error** (merah), check logs untuk troubleshoot

---

## PART 5: Setup Domain & Cloudflare Tunnel

### Step 5.1: Dalam Dokploy - Setup Domain

1. Pergi ke Compose service kamu
2. Klik tab **Domains**
3. Klik **+ Add Domain**
4. Domain: `bayarcash.kodekreatif.com`
5. Container Port: `80`
6. HTTPS: **Enabled** (kalau guna Cloudflare, boleh disable sebab CF handle)
7. Klik **Create**

### Step 5.2: Cloudflare Zero Trust - Create Tunnel

1. Login ke https://one.dash.cloudflare.com/
2. Pergi ke **Networks** → **Tunnels**
3. Klik **Create a tunnel**
4. Nama: `dokploy-tunnel` (atau apa-apa)
5. Klik **Save tunnel**

### Step 5.3: Install Connector dalam Dokploy VM

1. Cloudflare akan tunjuk arahan install
2. SSH ke Proxmox VM yang run Dokploy
3. Run command yang Cloudflare bagi (macam ni):

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
sudo cloudflared service install <YOUR_TOKEN>
```

### Step 5.4: Add Public Hostname

1. Dalam Tunnel settings, klik **Public Hostname**
2. Klik **Add a public hostname**
3. Subdomain: `bayarcash`
4. Domain: `kodekreatif.com`
5. Service Type: `HTTP`
6. URL: `localhost:80` (atau IP Dokploy internal + port)
7. Klik **Save hostname**

---

## PART 6: Test & Verify

### Step 6.1: Test Frontend

1. Buka browser
2. Pergi ke `https://bayarcash.kodekreatif.com`
3. Patut nampak app frontend

### Step 6.2: Test Backend API

1. Buka browser baru
2. Pergi ke `https://bayarcash.kodekreatif.com/api/health`
3. Patut dapat response:
```json
{"status":"ok","timestamp":"2026-01-01T..."}
```

### Step 6.3: Test OAuth

1. Pergi ke GHL Marketplace
2. Install app kamu
3. Patut redirect ke Settings page

---

## 🔥 Troubleshooting

### Error: 404 Not Found

**Punca**: Nginx tak route dengan betul

**Solusi**:
1. Check `nginx.conf` ada `/api/` location block
2. Redeploy compose

### Error: 502 Bad Gateway

**Punca**: Backend tak start atau tak connect ke database

**Solusi**:
1. Check logs dalam Dokploy
2. Pastikan MySQL container dah ready
3. Check environment variables betul

### Error: Database connection failed

**Punca**: MySQL belum ready atau password salah

**Solusi**:
1. Check `DB_PASSWORD` sama dengan `MYSQL_ROOT_PASSWORD`
2. Tunggu 30 saat lepas deploy (MySQL ambil masa nak start)

### Error: OAuth redirect failed

**Punca**: REDIRECT_URI tak sama dengan yang register dalam GHL

**Solusi**:
1. Pastikan `REDIRECT_URI` dalam .env sama dengan yang register di GHL App
2. REDIRECT_URI mesti: `https://bayarcash.kodekreatif.com/api/oauth/callback`

---

## ✅ Checklist Final

- [ ] Code dah push ke GitHub
- [ ] Dokploy compose service dah running
- [ ] Environment variables dah set dengan betul
- [ ] Cloudflare Tunnel dah connect
- [ ] Domain `bayarcash.kodekreatif.com` boleh access
- [ ] API `/api/health` respond dengan betul
- [ ] OAuth flow berfungsi

---

## 🎉 Siap!

Tahniah! App kamu dah live di `https://bayarcash.kodekreatif.com`

Kalau ada masalah, check logs dalam Dokploy atau tanya untuk bantuan.
