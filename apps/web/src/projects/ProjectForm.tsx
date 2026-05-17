import { Save, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberField, SelectField, TextAreaField, TextField } from '../catalog/CatalogFormFields';
import type { Project, ProjectImage, ProjectImagePayload, ProjectImageSourceType, ProjectPayload, ProjectStatus } from './project.types';

const statuses: ProjectStatus[] = ['draft', 'active', 'archived'];
const sourceTypes: ProjectImageSourceType[] = ['placeholder', 'external_url', 'uploaded'];

// VI: Form dung chung de tao/sua du an va metadata anh, khong co upload/rendering trong Sprint 4.
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
