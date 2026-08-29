# HelpDesk IT
**Stack:**
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Backend:** Elysia (Bun runtime) + Prisma + MySQL
- **Storage tambahan:** Redis (cache/session), MinIO (object storage untuk lampiran/evidence tiket)

## Struktur Project
```
helpdeskIT/
├── backend/      # API (Elysia + Bun + Prisma)
├── frontend/     # Web app (Next.js)
└── compose.yml   # Orkestrasi seluruh service (mysql, minio, backend, frontend)
```

## Prasyarat

- **Podman:** [Podman](https://podman.io/docs/installation) terinstall dan berjalan, plus [podman-compose](https://github.com/containers/podman-compose) (atau gunakan `podman compose` built-in kalau versi Podman kamu sudah cukup baru)

## Cara Menjalankan
### 1. Clone project & masuk ke folder

```bash
git clone https://github.com/tiwisetiyaningsih/helpdeskIT.git
cd helpdeskIT
```

### 2. Jalankan semua service

```bash
podman compose up --build
```

Tunggu sampai semua container jalan. Yang akan aktif:

| Service   | Akses dari host        | Keterangan                                   |
|-----------|-------------------------|-----------------------------------------------|
| frontend  | `localhost:3000`        | Web app                                       |
| backend   | `localhost:3001`        | API (di dalam container port 3000)            |
| mysql     | tidak dipublikasikan    | Hanya bisa diakses dari dalam network compose |
| minio     | tidak dipublikasikan    | Hanya bisa diakses dari dalam network compose |


### 4. (Opsional) Isi data awal (seed)

Kalau ingin ada data awal seperti role Admin/IT Consultant/Employee:

```bash
podman compose exec backend bun run seed
```

### 5. Buka aplikasi

- Web app: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)


### Menghentikan aplikasi

```bash
podman compose down
```
