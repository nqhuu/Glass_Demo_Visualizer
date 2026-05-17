// VI: Kieu toi thieu cho file multer trong Sprint 5, tranh phu thuoc type ngoai chi de doc buffer metadata.
export interface UploadedProjectFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}
