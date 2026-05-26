import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const LOCAL_CATALOG_PREFIXES = ['/catalog-assets/', '/uploads/catalog/'];
const SAFE_CATALOG_FILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(jpe?g|png|webp)$/i;

// VI: Catalog chi nhan asset local trong route duoc duyet; tuyet doi khong nhan path anh project hoac traversal.
export function isAllowedCatalogMediaUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // VI: Chuoi trong la thao tac xoa URL; chuoi con lai duoc trim roi kiem tra allowlist an toan.
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return true;
  }

  // VI: Chan backslash truoc khi parse vi URL parser co the chuan hoa input kieu Windows thanh HTTP(S) hop le.
  if (normalizedValue.includes('\\')) {
    return false;
  }

  if (normalizedValue.startsWith('//')) {
    return false;
  }

  const localPrefix = LOCAL_CATALOG_PREFIXES.find((prefix) => normalizedValue.startsWith(prefix));
  if (localPrefix) {
    const fileName = normalizedValue.slice(localPrefix.length);
    return SAFE_CATALOG_FILE_NAME.test(fileName);
  }

  try {
    const url = new URL(normalizedValue);
    // VI: Tai nguyen ngoai chi chap nhan HTTP(S); chan javascript/data/file/ftp va Windows path.
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// VI: Decorator dung chung cho anh preview/texture trong DTO tao va cap nhat san pham kinh.
export function IsCatalogMediaUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isCatalogMediaUrl',
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isAllowedCatalogMediaUrl(value),
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be an HTTP(S) URL or a safe local catalog JPG, PNG, or WEBP asset path.`,
      },
    });
  };
}
