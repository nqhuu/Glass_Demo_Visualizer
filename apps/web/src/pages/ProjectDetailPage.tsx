import { ArrowLeft, Edit3, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';
import { ProjectImageForm, ProjectImageUploadForm } from '../projects/ProjectForm';
import { createProjectImage, deleteProjectImage, getProject, listProjectImages, resolveProjectImageUrl, updateProjectImage, uploadProjectImage } from '../projects/project-api';
import type { Project, ProjectImage, ProjectImagePayload, ProjectImageUploadDraft } from '../projects/project.types';

const emptyImageForm: ProjectImagePayload = {
  title: '',
  description: '',
  sourceType: 'placeholder',
  imageUrl: '',
  thumbnailUrl: '',
  originalFileName: '',
  width: null,
  height: null,
  sortOrder: 0,
};

// VI: Trang chi tiet du an Sprint 4 hien nhieu anh metadata va entry vao editor shell.
export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const { accessToken } = useAuth();
  const numericProjectId = Number(projectId);
  const isProjectIdValid = Number.isInteger(numericProjectId) && numericProjectId > 0;
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [form, setForm] = useState<ProjectImagePayload>(emptyImageForm);
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null);
  const [uploadDraft, setUploadDraft] = useState<ProjectImageUploadDraft>({ payload: null, errorKey: null });
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadProjectDetail = async () => {
    if (!isProjectIdValid) {
      // VI: Route id khong hop le thi dung loading va hien thong bao an toan.
      setIsLoading(false);
      setProject(null);
      setMessage(t('projectDetail.messages.invalidProjectId'));
      return;
    }

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [projectResult, imageResult] = await Promise.all([
        getProject(accessToken, numericProjectId),
        listProjectImages(accessToken, numericProjectId),
      ]);
      setProject(projectResult);
      setImages(imageResult);
      setMessage(null);
    } catch (error) {
      // VI: Loi access/detail co the la 404/403; UI chi hien message an toan.
      logSafeFrontendError('loadProjectDetail', error, { projectId: numericProjectId });
      setMessage(t('projectDetail.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjectDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, numericProjectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !project) {
      return;
    }

    try {
      setIsSaving(true);
      if (selectedImage) {
        await updateProjectImage(accessToken, project.id, selectedImage.id, form);
        setMessage(t('projectDetail.messages.imageUpdated'));
      } else {
        await createProjectImage(accessToken, project.id, form);
        setMessage(t('projectDetail.messages.imageCreated'));
      }
      setForm(emptyImageForm);
      setSelectedImage(null);
      await loadProjectDetail();
    } catch (error) {
      logSafeFrontendError('handleSubmit', error, { projectId: project.id, imageId: selectedImage?.id });
      setMessage(t('projectDetail.messages.imageSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditImage = (image: ProjectImage) => {
    setSelectedImage(image);
    setForm({
      title: image.title,
      description: image.description ?? '',
      sourceType: image.sourceType,
      imageUrl: image.imageUrl ?? '',
      thumbnailUrl: image.thumbnailUrl ?? '',
      originalFileName: image.originalFileName ?? '',
      width: image.width,
      height: image.height,
      sortOrder: image.sortOrder,
    });
  };

  const handleDeleteImage = async (image: ProjectImage) => {
    if (!accessToken || !project || !window.confirm(t('projectDetail.messages.confirmDeleteImage', { title: image.title }))) {
      return;
    }

    try {
      await deleteProjectImage(accessToken, project.id, image.id);
      setMessage(t('projectDetail.messages.imageDeleted'));
      await loadProjectDetail();
    } catch (error) {
      logSafeFrontendError('handleDeleteImage', error, { projectId: project.id, imageId: image.id });
      setMessage(t('projectDetail.messages.imageDeleteFailed'));
    }
  };

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !project || !uploadDraft.payload) {
      if (uploadDraft.errorKey) {
        setMessage(t(uploadDraft.errorKey));
      }
      return;
    }

    try {
      setIsUploading(true);
      await uploadProjectImage(accessToken, project.id, uploadDraft.payload);
      setUploadDraft({ payload: null, errorKey: null });
      setUploadResetKey((current) => current + 1);
      setMessage(t('projectDetail.messages.uploaded'));
      await loadProjectDetail();
    } catch (error) {
      console.error({
        module: 'ProjectDetailPage',
        action: 'handleUploadSubmit',
        projectId: project.id,
        message: 'Failed to upload project image',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      setMessage(t('projectDetail.messages.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <ShellCard>{t('projectDetail.messages.loading')}</ShellCard>;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700" to="/app/projects">
          <ArrowLeft size={16} />
          {t('projectDetail.backToProjects')}
        </Link>
        <ShellCard>{message ?? t('projectDetail.messages.loadFailed')}</ShellCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700" to="/app/projects">
        <ArrowLeft size={16} />
        {t('projectDetail.backToProjects')}
      </Link>
      <PageHeader kicker={t('projectDetail.kicker')} title={project.name} description={project.description || t('projectDetail.description')} />

      {message ? <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <ShellCard>
            <h3 className="text-lg font-semibold text-neutral-950">{t('projectDetail.infoTitle')}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label={t('projects.fields.customerName')} value={project.customerName || t('projects.emptyValue')} />
              <InfoRow label={t('projects.fields.customerPhone')} value={project.customerPhone || t('projects.emptyValue')} />
              <InfoRow label={t('projects.fields.location')} value={project.location || t('projects.emptyValue')} />
              <InfoRow label={t('projects.fields.code')} value={project.code || t('projects.emptyValue')} />
              <InfoRow label={t('projects.fields.status')} value={t(`projects.status.${project.status}`)} />
              <InfoRow label={t('projects.fields.imageCount')} value={t('projects.imageCount', { count: images.length })} />
              <InfoRow label={t('projects.fields.notes')} value={project.notes || t('projects.emptyValue')} />
            </dl>
          </ShellCard>

          <ShellCard className="xl:sticky xl:top-24">
            <div id="image-upload" className="mb-6 border-b border-neutral-200 pb-6">
              <ProjectImageUploadForm
                selectedFileName={uploadDraft.payload?.file.name ?? null}
                resetKey={uploadResetKey}
                isUploading={isUploading}
                onFileChange={setUploadDraft}
                onSubmit={handleUploadSubmit}
              />
              {uploadDraft.errorKey ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{t(uploadDraft.errorKey)}</p> : null}
            </div>
            <div id="image-form">
              <ProjectImageForm
                value={form}
                selectedImage={selectedImage}
                isSaving={isSaving}
                onChange={setForm}
                onCancel={() => {
                  setSelectedImage(null);
                  setForm(emptyImageForm);
                }}
                onSubmit={handleSubmit}
              />
            </div>
          </ShellCard>
        </div>

        <ShellCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-950">{t('projectDetail.imagesTitle')}</h3>
              <p className="text-sm text-neutral-600">{t('projectDetail.imagesDescription')}</p>
            </div>
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" href="#image-upload">
              <ImagePlus size={16} />
              {t('projectDetail.addImagePlaceholder')}
            </a>
          </div>
          {images.length === 0 ? <div className="mt-5 rounded-md bg-stone-100 p-4 text-sm text-neutral-700">{t('projectDetail.messages.emptyImages')}</div> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} projectId={project.id} onEdit={handleEditImage} onDelete={handleDeleteImage} />
            ))}
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-neutral-800">{label}</dt>
      <dd className="mt-1 text-neutral-600">{value}</dd>
    </div>
  );
}

function logSafeFrontendError(action: string, error: unknown, context: { projectId?: number; imageId?: number } = {}) {
  // VI: Log frontend chi gom context an toan, khong dump raw response/request/token.
  console.error({
    module: 'ProjectDetailPage',
    action,
    ...context,
    message: 'Project detail request failed',
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : undefined,
  });
}

function ImageCard({
  image,
  projectId,
  onEdit,
  onDelete,
}: {
  image: ProjectImage;
  projectId: number;
  onEdit: (image: ProjectImage) => void;
  onDelete: (image: ProjectImage) => void;
}) {
  const { t } = useTranslation();
  const thumbnail = resolveProjectImageUrl(image.thumbnailUrl || image.imageUrl);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-stone-100">
        {thumbnail ? <img className="h-full w-full object-cover" src={thumbnail} alt={image.title} /> : <span className="text-sm font-semibold text-neutral-500">{t('projectDetail.noThumbnail')}</span>}
      </div>
      <p className="mt-3 font-semibold text-neutral-950">{image.title}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {image.width && image.height ? t('projectDetail.imageSize', { width: image.width, height: image.height }) : t('projectDetail.imageSizeUnknown')}
      </p>
      {image.description ? <p className="mt-2 text-sm text-neutral-600">{image.description}</p> : null}
      <p className="mt-2 text-xs font-semibold uppercase text-neutral-500">{t(`projectDetail.sourceTypes.${image.sourceType}`)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white" to={`/app/editor/projects/${projectId}/images/${image.id}`}>
          <ExternalLink size={16} />
          {t('projectDetail.openEditorShell')}
        </Link>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" type="button" onClick={() => onEdit(image)}>
          <Edit3 size={16} />
          {t('projects.actions.edit')}
        </button>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" type="button" onClick={() => onDelete(image)}>
          <Trash2 size={16} />
          {t('projects.actions.delete')}
        </button>
      </div>
    </div>
  );
}
