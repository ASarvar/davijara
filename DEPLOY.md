# Deploy va yangilash

Bu sayt `davijara.uz/site` manzilida ishlaydi — domenning ildizida (`/`)
boshqa bir loyiha turibdi, shuning uchun hech qachon standart Next.js
deploy'i emas, **sub-path** ostida ishlaydigan deploy kerak.

## Server topologiyasi — uchta bosqich

```
brauzer ──https──> markazsrv   (tashqi server, TLS shu yerda tugaydi)
                       │  http    davijara.uz → 84.54.82.173
                       ▼
                   markaz (192.168.1.248, nginx/1.14.2)
                       │  http
                       ▼
                   [::1]:3001   (Next.js, basePath "/site")
```

Ikkita alohida server bor, va bu tez-tez unutiladi:

- **markazsrv** — tashqi (ommaviy) server, `davijara.uz` shu yerga
  ko'rsatadi, TLS sertifikat shu yerda
- **markaz** (192.168.1.248) — Next.js ilovasi haqiqatda shu yerda ishlaydi

Har ikkalasida ham prompt bir xilga o'xshaydi (`root@markaz` /
`root@markazsrv`), lekin nginx konfiguratsiyasi ikkalasida **tamoman
boshqacha**. Adashtirish oson — avval har doim tekshiring:

```bash
hostname
```

Javobni javob sarlavhasidan ham bilsa bo'ladi: `Server: nginx/1.14.2` —
markaz, `Server: nginx/1.14.0 (Ubuntu)` — markazsrv.

## Birinchi marta o'rnatish (faqat bir marta)

Bularning barchasi **markaz**da (192.168.1.248) bajariladi — Next.js shu
yerda ishlaydi:

```bash
useradd --system --home /var/www/davijara davijara
mkdir -p /var/www/davijara/{releases,shared}
chown -R davijara:davijara /var/www/davijara
```

Repo'ni klonlang (masalan `/opt/davijara` ga), so'ng maxfiy ma'lumotlar
faylini qo'lda yarating — bu fayl gitignore qilingan va hech qachon
avtomatik tahrirlanmaydi:

```bash
nano /var/www/davijara/shared/.env
```

[.env.example](.env.example) dagi qiymatlarni to'ldiring — eng muhimlari:

| O'zgaruvchi | Izoh |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://davijara.uz/site` — sub-path bilan birga |
| `NEXT_PUBLIC_BASE_PATH` | `/site` |
| `LISTINGS_API_URL`, `API_USER`, `API_PASSWORD` | Auksion lotlari API'si |

```bash
chmod 600 /var/www/davijara/shared/.env
```

systemd va nginx'ni bir martalik o'rnating:

```bash
cp deploy/davijara.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable davijara
```

[nginx-site-location.conf](deploy/nginx-site-location.conf) dagi
`location /site { … }` blokini **markaz**dagi mavjud `davijara.uz` vhost
ichiga qo'ying (bu vhost boshqa loyihalar bilan bo'lishilgan — domen ildizi,
`/kadastr`, `/new`, `/api/search` boshqa narsaga tegishli), so'ng:

```bash
nginx -t && systemctl reload nginx
```

Keyin **markazsrv**da (tashqi server) TLS sertifikatli `davijara.uz` server
blokiga [nginx-edge-site-location.conf](deploy/nginx-edge-site-location.conf)
dagi blokni qo'shing, xuddi shunday `nginx -t && systemctl reload nginx`.

**Bu ikkala nginx bloki [deploy.sh](deploy/deploy.sh) tomonidan hech qachon
avtomatik qayta nusxalanmaydi.** Ularni repo'da o'zgartirsangiz, serverlarga
qo'lda ko'chirishingiz kerak. Shu sababli ikkala fayl serverdagi jonli
konfiguratsiyaning **aynan nusxasi** bo'lib turishi kerak — nima ishlab
turganini bilish uchun o'sha ikkitasini o'qing.

Ixtiyoriy yaxshilashlar (keepalive, HTTP/2, timeout'lar) alohida —
[nginx-performance.conf.example](deploy/nginx-performance.conf.example) da.
U **o'rnatilmagan** va hech narsa uni talab qilmaydi; nima uchun kerakligi va
nima uchun shoshilinch emasligi o'sha faylning boshida yozilgan.

## Har safar yangilash

Repo klonlangan joydan (masalan `/opt/davijara`), **markaz**da:

```bash
bash deploy/deploy.sh
```

Skript quyidagilarni ketma-ket bajaradi:

1. `git pull --ff-only`
2. `npm install` (`npm ci` emas — pastga qarang)
3. `.env` faylida CRLF borligini tekshiradi, bo'lsa **to'xtaydi** (qo'lda
   tuzatish talab qilinadi — bu maxfiy ma'lumotlar fayli)
4. `npm run build` — Turbopack bilan, standart bo'yicha
5. Yangi build'ni `releases/<timestamp>/` ga yig'adi (`standalone` +
   `.next/static` + `public`)
6. `current` symlink'ni yangi release'ga ko'rsatadi
7. `systemctl restart davijara`
8. Servis ishga tushganini tekshiradi, aks holda xato bilan to'xtaydi
9. Eski release'lardan faqat oxirgi 5 tasini qoldiradi

Muvaffaqiyatli tugagach:

```bash
curl -I https://davijara.uz/site/uz
```

**200 OK** kelishi kerak.

## Tez tekshiruv — zanjirning qaysi bosqichi ishlamayapti

Uch bosqich alohida-alohida sinaladi, orqadan oldinga:

```bash
# 1. Next.js o'zi (markaz, ichkaridan)
curl -I http://localhost:3001/site/uz

# 2. markaz'ning nginx'i (markaz, 80-port orqali)
curl -I -H "Host: davijara.uz" http://127.0.0.1/site/uz

# 3. markazsrv'dan markaz'ga yo'l (markazsrv)
curl -I -H "Host: davijara.uz" http://192.168.1.248/site/uz

# 4. Butun zanjir (istalgan joydan)
curl -I https://davijara.uz/site/uz
```

Qaysi bosqichda javob yomonlashsa, muammo o'sha yerda.

## Bilinadigan tuzoqlar

| Belgi | Sabab | Yechim |
|---|---|---|
| Har bir sahifada 500, "socket hang up" | `HOSTNAME` `127.0.0.1` ga o'rnatilgan | `HOSTNAME=localhost` bo'lishi shart — [davijara.service:59](deploy/davijara.service:59) dagi izohni o'qing |
| markaz'dan `curl 127.0.0.1:3001` → refused | Next `[::1]` (IPv6) da tinglaydi, `127.0.0.1` da emas | `ss -ltnp \| grep 3001` bilan tasdiqlang; nginx bloki `[::1]:3001` ga qarashi kerak |
| markazsrv'dan 502, log'da `:3001` bilan `connection refused` | Edge to'g'ridan-to'g'ri Next portiga urinmoqda | Portsiz yozing: `proxy_pass http://192.168.1.248;` — bu port faqat markaz'ning o'z loopback'ida ochiq |
| `226/NAMESPACE` bilan servis ishga tushmayapti | `.next/cache` mavjud emas, `ProtectSystem=strict` bind-mount qila olmadi | deploy.sh buni avtomatik yaratadi; qo'lda deploy qilsangiz `mkdir -p` qiling |
| "Start request repeated too quickly" | `StartLimitBurst=5` eski xatodan qulflab qo'ygan | `systemctl reset-failed davijara` (deploy.sh buni har safar avtomatik qiladi) |
| Build paytida bare "Bus error" | Node versiyasi yangilangandan keyin qolgan eski native binary'lar | `rm -rf node_modules && npm install` |
| `.env` da noaniq runtime xatolar | Windows'da tahrirlangan fayl CRLF olib kelgan | deploy.sh buni build bosqichida ushlaydi va to'xtaydi; `sed -i 's/\r$//' .env` bilan tuzating |
| `npm ci` — EUSAGE | Lockfile npm 10.9.0 bilan yaratilgan, serverda 10.8.2 | Shuning uchun deploy.sh `npm install` ishlatadi, `npm ci` emas |

## Nima uchun Docker emas

Loyihaning bir qismi Docker Compose'da qurilmagan — sabab: bitta CPU, kam
RAM'li serverda image qurish sekin bo'lardi, va ichki API'ga
(`192.168.1.254`) tarmoq orqali ulanish qo'shimcha sozlash talab qilardi.
`output: "standalone"` allaqachon yoqilgan, shuning uchun kelajakda kerak
bo'lsa Dockerfile deyarli faqat `.next/standalone` ni ko'chirishdan iborat
bo'ladi.

## Boshqaruv paneli (admin) — birinchi o'rnatish

Panel `davijara.uz/site/admin` manzilida ishlaydi. Uning ma'lumotlari
SQLite faylida saqlanadi va **release papkasida emas** — `deploy.sh` faqat
oxirgi 5 ta release'ni saqlaydi, shuning uchun release ichiga yozilgan
har qanday narsa 5 ta deploy'dan keyin jimgina o'chib ketadi.

`shared/` — bu deploy'lardan omon qoladigan yagona joy, `.env` ham aynan
shu sababdan o'sha yerda turadi.

```bash
mkdir -p /var/www/davijara/shared/data
chown davijara:davijara /var/www/davijara/shared/data
chmod 700 /var/www/davijara/shared/data
```

`shared/.env` ga qo'shing:

```
DATA_DIR=/var/www/davijara/shared/data
ADMIN_SETUP_TOKEN=<openssl rand -base64 32 natijasi>
```

⚠ **`systemd` unit'iga `ReadWritePaths` qo'shish shart.** Servis
`ProtectSystem=strict` bilan ishlaydi — bu butun fayl tizimini faqat
o'qish rejimiga qo'yadi, shuning uchun bu qator bo'lmasa baza fayli
ochilmaydi va panel `SQLITE_CANTOPEN` bilan ishga tushmaydi:

```
ReadWritePaths=/var/www/davijara/shared/data
```

So'ng `systemctl daemon-reload && systemctl restart davijara`.

Deploy'dan keyin `https://davijara.uz/site/admin/setup` ni oching, `.env`
dagi kalitni kiriting va birinchi administratorni yarating. **Shundan
so'ng bu sahifa butunlay yopiladi (404)** va `ADMIN_SETUP_TOKEN` ni
`.env` dan o'chirib tashlash mumkin.

### Zaxira nusxa

Baza ishlab turgan paytda faylni oddiy `cp` bilan nusxalash **xavfli** —
yozuv o'rtasida uzilgan nusxa olinishi mumkin. SQLite'ning o'z buyrug'i
esa xavfsiz:

```bash
sqlite3 /var/www/davijara/shared/data/davijara.db ".backup '/backup/davijara-$(date +%F).db'"
```

`uploads/` papkasini ham birga zaxiralang — bazada fayl **nomlari**
saqlanadi, fayllarning o'zi emas, shuning uchun biri boshqasisiz tiklansa
rasmlar buzilgan holda chiqadi.

### Rasm yuklash — uchta chegara

Panel orqali yuklangan rasmlar `DATA_DIR/uploads/` ga tushadi, bazaga emas.
Uchta chegara bor va ular **shu tartibda** o'sib borishi kerak, aks holda
xato muharrir tushunmaydigan joyda chiqadi:

| Chegara | Qiymat | Qayerda |
|---|---|---|
| Bitta fayl | 5 MB | `src/lib/media/types.ts` |
| Server Action tanasi | 6 MB | `next.config.ts` |
| nginx (ikkala hop) | 8 MB | `deploy/nginx-*.conf` |

⚠ **nginx eng ko'p adashtiradi.** Uning o'z standarti — 1 MB, va u katta
so'rovni Next'ga yetkazmasdan quruq `413` bilan rad etadi. Ya'ni ilovadagi
chegarani oshirish yolg'iz o'zi hech narsani o'zgartirmaydi. Ikkala nginx
konfiguratsiyasiga ham `client_max_body_size 8m;` qo'shilgan — bu fayllar
avtomatik ko'chirilmaydi, serverga qo'lda o'tkazish kerak.

Fayl turi **kengaytma yoki brauzer aytgan tur bo'yicha emas, baytlar bo'yicha**
aniqlanadi. SVG ataylab qabul qilinmaydi: u hujjat, ichida `<script>` bo'lishi
mumkin va o'z domenimizdan uzatilsa saqlangan XSS bo'lardi.

### Parolni unutgan bo'lsa

Panelning o'zida administrator boshqa foydalanuvchining parolini
yangilay oladi. Yagona administrator o'zi kira olmay qolgan holat uchun —
serverda:

```bash
cd /opt/davijara
node scripts/admin-user.mjs passwd admin
```

Hech narsa stdin'ga berilmasa, kuchli parol yaratib bir marta ko'rsatadi.
Buyruq eski sessiyalarni ham yopadi. To'liq ro'yxat: `node
scripts/admin-user.mjs` (argumentsiz).
