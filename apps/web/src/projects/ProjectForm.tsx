import { Save, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberField, SelectField, TextAreaField, TextField } from '../catalog/CatalogFormFields';
import type { Project, ProjectImage, ProjectImagePayload, ProjectImageSourceType, ProjectImageUploadDraft, ProjectImageUploadPayload, ProjectPayload, ProjectStatus } from './project.types';

const statuses: ProjectStatus[] = ['draft', 'active', 'archived'];
const sourceTypes: ProjectImageSourceType[] = ['placeholder', 'external_url', 'uploaded'];
const uploadMaxBytes = 10 * 1024 * 1024;
const uploadExtensions = ['jpg', 'jpeg', 'png', 'webp'];
const uploadMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

// VI: Form dung chung de tao/sua du an va anh; upload chi luu file/metadata, khong co rendering.
export function ProjectForm({
  value,
  selectedProject,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: ProjectPayload;
  selectedProject: Project | null;
  isSaving: boolean;
  onChange: (value: ProjectPayload) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            {t(selectedProject ? 'projects.form.editTitle' : 'projects.form.createTitle')}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{t('projects.form.description')}</p>
        </div>
        {selectedProject ? (
          <button className="rounded-md border border-neutral-300 p-2 text-neutral-700" type="button" onClick={onCancel} aria-label={t('projects.actions.cancel')}>
            <X size={16} />
          </button>
        ) : null}
      </div>
      <TextField label={t('projects.fields.name')} value={value.name} onChange={(name) => onChange({ ...value, name })} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('projects.fields.code')} value={value.code ?? ''} onChange={(code) => onChange({ ...value, code })} />
        <SelectField label={t('projects.fields.status')} value={value.status} onChange={(status) => onChange({ ...value, status: status as ProjectStatus })}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`projects.status.${status}`)}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('projects.fields.customerName')} value={value.customerName ?? ''} onChange={(customerName) => onChange({ ...value, customerName })} />
        <TextField label={t('projects.fields.customerPhone')} value={value.customerPhone ?? ''} onChange={(customerPhone) => onChange({ ...value, customerPhone })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('projects.fields.location')} value={value.location ?? ''} onChange={(location) => onChange({ ...value, location })} />
      </div>
      <TextAreaField label={t('projects.fields.description')} value={value.description ?? ''} onChange={(description) => onChange({ ...value, description })} />
      <TextAreaField label={t('projects.fields.notes')} value={value.notes ?? ''} onChange={(notes) => onChange({ ...value, notes })} />
      <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
        <Save size={16} />
        {t(isSaving ? 'projects.actions.saving' : 'projects.actions.save')}
      </button>
    </form>
  );
}

export function ProjectImageForm({
  value,
  selectedImage,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: ProjectImagePayload;
  selectedImage: ProjectImage | null;
  isSaving: boolean;
  onChange: (value: ProjectImagePayload) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-950">
            {t(selectedImage ? 'projectDetail.imageForm.editTitle' : 'projectDetail.imageForm.createTitle')}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{t('projectDetail.imageForm.description')}</p>
        </div>
        {selectedImage ? (
          <button className="rounded-md border border-neutral-300 p-2 text-neutral-700" type="button" onClick={onCancel} aria-label={t('projects.actions.cancel')}>
            <X size={16} />
          </button>
        ) : null}
      </div>
      <TextField label={t('projectDetail.fields.imageTitle')} value={value.title} onChange={(title) => onChange({ ...value, title })} required />
      <TextAreaField label={t('projectDetail.fields.imageDescription')} value={value.description ?? ''} onChange={(description) => onChange({ ...value, description })} />
      <SelectField label={t('projectDetail.fields.sourceType')} value={value.sourceType} onChange={(sourceType) => onChange({ ...value, sourceType: sourceType as ProjectImageSourceType })}>
        {sourceTypes.map((sourceType) => (
          <option key={sourceType} value={sourceType}>
            {t(`projectDetail.sourceTypes.${sourceType}`)}
          </option>
        ))}
      </SelectField>
      <TextField
        label={t('projectDetail.fields.imageUrl')}
        value={value.imageUrl ?? ''}
        onChange={(imageUrl) => onChange({ ...value, imageUrl })}
      />
      <TextField label={t('projectDetail.fields.thumbnailUrl')} value={value.thumbnailUrl ?? ''} onChange={(thumbnailUrl) => onChange({ ...value, thumbnailUrl })} />
      <TextField label={t('projectDetail.fields.originalFileName')} value={value.originalFileName ?? ''} onChange={(originalFileName) => onChange({ ...value, originalFileName })} />
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label={t('projectDetail.fields.width')} value={value.width ?? 0} onChange={(width) => onChange({ ...value, width: width > 0 ? width : null })} />
        <NumberField label={t('projectDetail.fields.height')} value={value.height ?? 0} onChange={(height) => onChange({ ...value, height: height > 0 ? height : null })} />
        <NumberField label={t('projectDetail.fields.sortOrder')} value={value.sortOrder} onChange={(sortOrder) => onChange({ ...value, sortOrder })} />
      </div>
      <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" type="submit" disabled={isSaving}>
        <Save size={16} />
        {t(isSaving ? 'projects.actions.saving' : 'projectDetail.actions.saveImage')}
      </button>
    </form>
  );
}

export function ProjectImageUploadForm({
  selectedFileName,
  resetKey,
  isUploading,
  onFileChange,
  onSubmit,
}: {
  selectedFileName: string | null;
  resetKey: number;
  isUploading: boolean;
  onFileChange: Dispatch<SetStateAction<ProjectImageUploadDraft>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    // VI: Reset ca state React va native file input sau khi upload thanh cong.
    setTitle('');
    setDescription('');
    setSortOrder(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetKey]);

  const validateClientFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!uploadExtensions.includes(extension) || !uploadMimeTypes.includes(file.type)) {
      return 'projectDetail.uploadForm.invalidType';
    }

    if (file.size > uploadMaxBytes) {
      return 'projectDetail.uploadForm.tooLarge';
    }

    return null;
  };

  const updateCurrentPayload = (patch: Partial<ProjectImageUploadPayload>) => {
    onFileChange((current) => ({
      errorKey: current.errorKey,
      payload: current.payload ? { ...current.payload, ...patch } : null,
    }));
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <h3 className="text-lg font-semibold text-neutral-950">{t('projectDetail.uploadForm.title')}</h3>
        <p className="mt-1 text-sm text-neutral-600">{t('projectDetail.uploadForm.description')}</p>
      </div>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 bg-stone-50 px-4 py-5 text-center">
        <Upload className="text-brand-red" size={22} aria-hidden="true" />
        <span className="mt-2 text-sm font-semibold text-neutral-900">{t('projectDetail.uploadForm.chooseFile')}</span>
        <span className="mt-1 text-xs text-neutral-500">{t('projectDetail.uploadForm.allowedTypes')}</span>
        <input
          className="sr-only"
          type="file"
          ref={fileInputRef}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) {
              onFileChange({ payload: null, errorKey: null });
              return;
            }

            const errorKey = validateClientFile(file);
            onFileChange(errorKey ? { payload: null, errorKey } : { payload: { file, title, description, sortOrder }, errorKey: null });
          }}
        />
      </label>
      <div className="rounded-md bg-white px-3 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200">
        {selectedFileName ?? t('projectDetail.uploadForm.noFileSelected')}
      </div>
      <TextField
        label={t('projectDetail.fields.imageTitle')}
        value={title}
        onChange={(nextTitle) => {
          setTitle(nextTitle);
          updateCurrentPayload({ title: nextTitle });
        }}
      />
      <TextAreaField
        label={t('projectDetail.fields.imageDescription')}
        value={description}
        onChange={(nextDescription) => {
          setDescription(nextDescription);
          updateCurrentPayload({ description: nextDescription });
        }}
      />
      <NumberField
        label={t('projectDetail.fields.sortOrder')}
        value={sortOrder}
        onChange={(nextSortOrder) => {
          setSortOrder(nextSortOrder);
          updateCurrentPayload({ sortOrder: nextSortOrder });
        }}
      />
      <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isUploading || !selectedFileName}>
        <Upload size={16} />
        {t(isUploading ? 'projectDetail.uploadForm.uploading' : 'projectDetail.uploadForm.submit')}
      </button>
    </form>
  );
}
