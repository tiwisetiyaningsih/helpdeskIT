# HelpDesk IT
**Stack:**
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend:** Elysia (Bun runtime) + Prisma + MySQL
- **Storage tambahan:** Redis (cache/session), MinIO (object storage untuk lampiran/evidence tiket)

## Struktur Project
help-desk-it/
├── backend/      # API (Elysia + Bun + Prisma)
├── frontend/     # Web app (Next.js)
└── compose.yml   # Orkestrasi seluruh service (mysql, redis, minio, backend, frontend)

## Prasyarat

- **Podman:** [Podman](https://podman.io/docs/installation) terinstall dan berjalan, plus [podman-compose](https://github.com/containers/podman-compose) (atau gunakan `podman compose` built-in kalau versi Podman kamu sudah cukup baru)

## Cara Menjalankan
### 1. Clone project & masuk ke folder

```bash
git clone https://github.com/tiwisetiyaningsih/helpdeskIT.git
cd help-desk-it
```

### 2. Jalankan semua service

```bash
podman compose up --build
```

Tunggu sampai semua container jalan. Yang akan aktif:

| Service   | Port lokal | Keterangan                     |
|-----------|-----------|---------------------------------|
| frontend  | 3000      | Web app                         |
| backend   | 3001      | API (di dalam container port 3000) |
| mysql     | 3307      | Database                        |
| redis     | 6380      | Cache                           |
| minio     | 9100      | Object storage (API)            |
| minio     | 9101      | MinIO Console (web UI)          |

### 3. Jalankan migrasi database

Buka terminal baru (biarkan `podman compose up` tetap jalan), lalu:

```bash
podman compose exec backend bunx prisma migrate deploy
```

### 4. (Opsional) Isi data awal (seed)

Kalau ingin ada data awal seperti role Admin/IT Consultant/Employee:

```bash
podman compose exec backend bun run seed
```

### 5. Buka aplikasi

- Web app: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)
- MinIO Console: [http://localhost:9101](http://localhost:9101) (login sesuai `compose.yml`)

### Menghentikan aplikasi

```bash
podman compose down
```
