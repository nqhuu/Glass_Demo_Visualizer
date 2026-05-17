import { Archive, Edit3, FolderOpen, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { SelectField, TextField } from '../catalog/CatalogFormFields';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';
import { ProjectForm } from '../projects/ProjectForm';
import { archiveProject, createProject, listProjects, updateProject } from '../projects/project-api';
import type { Project, ProjectPayload, ProjectQuery, ProjectStatus } from '../projects/project.types';

const emptyProjectForm: ProjectPayload = {
  name: '',
  code: '',
  description: '',
  customerName: '',
  customerPhone: '',
  location: '',
  notes: '',
  status: 'draft',
};

// VI: Trang danh sach du an Sprint 4, lay API that va chi cho user thao tac du an duoc phep.
export function ProjectsPage() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState<ProjectQuery>({ search: '', status: 'all' });
  const [form, setForm] = useState<ProjectPayload>(emptyProjectForm);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeProjects = useMemo(() => projects.filter((project) => project.status !== 'archived'), [projects]);

  const loadProjects = async () => {
    if (!accessToken) {
      return;
    }

    try {
      setIsLoading(true);
      setProjects(await listProjects(accessToken, query));
      setMessage(null);
    } catch (error) {
      // VI: Loi load du an duoc hien bang message ngan, khong dump raw object.
      console.error({ module: 'ProjectsPage', action: 'loadProjects', message: 'Failed to load projects', error });
      setMessage(t('projects.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, query.search, query.status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    try {
      setIsSaving(true);
      if (selectedProject) {
        await updateProject(accessToken, selectedProject.id, form);
        setMessage(t('projects.messages.updated'));
      } else {
        await createProject(accessToken, form);
        setMessage(t('projects.messages.created'));
      }
      setForm(emptyProjectForm);
      setSelectedProject(null);
      await loadProjects();
    } catch (error) {
      console.error({ module: 'ProjectsPage', action: 'handleSubmit', projectId: selectedProject?.id, message: 'Failed to save project', error });
      setMessage(t('projects.messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setForm({
      name: project.name,
      code: project.code ?? '',
      description: project.description ?? '',
      customerName: project.customerName ?? '',
      customerPhone: project.customerPhone ?? '',
      location: project.location ?? '',
      notes: project.notes ?? '',
      status: project.status,
    });
  };

  const handleArchive = async (project: Project) => {
    if (!accessToken || !window.confirm(t('projects.messages.confirmArchive', { name: project.name }))) {
      return;
    }

    try {
      await archiveProject(accessToken, project.id);
      setMessage(t('projects.messages.archived'));
      await loadProjects();
    } catch (error) {
      console.error({ module: 'ProjectsPage', action: 'handleArchive', projectId: project.id, message: 'Failed to archive project', error });
      setMessage(t('projects.messages.archiveFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t('projects.kicker')}
        title={t('projects.title')}
        description={t('projects.description')}
        action={
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" href="#project-form">
            <Plus size={16} />
            {t('projects.createPlaceholder')}
          </a>
        }
      />

      {message ? <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <ShellCard className="xl:sticky xl:top-24 xl:self-start">
          <div id="project-form">
            <ProjectForm
              value={form}
              selectedProject={selectedProject}
              isSaving={isSaving}
              onChange={setForm}
              onCancel={() => {
                setSelectedProject(null);
                setForm(emptyProjectForm);
              }}
              onSubmit={handleSubmit}
            />
          </div>
        </ShellCard>

        <div className="space-y-4">
          <ShellCard>
            <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-end">
              <TextField label={t('projects.searchLabel')} value={query.search ?? ''} onChange={(search) => setQuery((current) => ({ ...current, search }))} />
              <SelectField label={t('projects.fields.statusFilter')} value={query.status ?? 'all'} onChange={(status) => setQuery((current) => ({ ...current, status: status as ProjectStatus | 'all' }))}>
                <option value="all">{t('projects.status.all')}</option>
                <option value="draft">{t('projects.status.draft')}</option>
                <option value="active">{t('projects.status.active')}</option>
                <option value="archived">{t('projects.status.archived')}</option>
              </SelectField>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <Search size={16} />
              <span>{t('projects.summary', { count: projects.length, active: activeProjects.length })}</span>
            </div>
          </ShellCard>

          {isLoading ? <ShellCard>{t('projects.messages.loading')}</ShellCard> : null}
          {!isLoading && projects.length === 0 ? <ShellCard>{t('projects.messages.empty')}</ShellCard> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onEdit={handleEdit} onArchive={handleArchive} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onEdit, onArchive }: { project: Project; onEdit: (project: Project) => void; onArchive: (project: Project) => void }) {
  const { t } = useTranslation();
  const imageCount = project.images?.length ?? 0;

  return (
    <ShellCard>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-neutral-950">{project.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{project.customerName || t('projects.noCustomer')}</p>
          </div>
          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-neutral-700">{t(`projects.status.${project.status}`)}</span>
        </div>
        <dl className="grid gap-2 text-sm text-neutral-700">
          <InfoRow label={t('projects.fields.code')} value={project.code || t('projects.emptyValue')} />
          <InfoRow label={t('projects.fields.customerPhone')} value={project.customerPhone || t('projects.emptyValue')} />
          <InfoRow label={t('projects.fields.location')} value={project.location || t('projects.emptyValue')} />
          <InfoRow label={t('projects.fields.imageCount')} value={t('projects.imageCount', { count: imageCount })} />
        </dl>
        <div className="mt-auto flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white" to={`/app/projects/${project.id}`}>
            <FolderOpen size={16} />
            {t('projects.openShell')}
          </Link>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800" type="button" onClick={() => onEdit(project)}>
            <Edit3 size={16} />
            {t('projects.actions.edit')}
          </button>
          {project.status !== 'archived' ? (
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" type="button" onClick={() => onArchive(project)}>
              <Archive size={16} />
              {t('projects.actions.archive')}
            </button>
          ) : null}
        </div>
      </div>
    </ShellCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-semibold text-neutral-800">{label}</dt>
      <dd className="text-right text-neutral-600">{value}</dd>
    </div>
  );
}
