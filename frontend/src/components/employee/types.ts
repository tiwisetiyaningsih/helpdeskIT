export interface Employee {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle?: string;
  isActive: boolean;
}