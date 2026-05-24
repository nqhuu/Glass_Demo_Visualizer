import {
  ArrowLeft,
  BoxSelect,
  ChevronRight,
  Copy,
  Download,
  Gem,
  Grid2X2,
  ImageIcon,
  Info,
  Layers3,
  Maximize2,
  MousePointer2,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, PointerEvent, ReactNode, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';
import { GlassPreview } from '../catalog/GlassPreview';
import { listActiveGlassProducts } from '../catalog/glass-catalog-api';
import type { GlassProduct } from '../catalog/glass-catalog.types';
import { GlassMaterialPreviewLayer } from '../editor/GlassMaterialPreviewLayer';
import { assignGlassToRegion, createGlassRegion, deleteGlassRegion, downloadProjectExport, duplicateGlassRegion, exportProjectImage, getProject, listGlassRegions, listProjectImages, removeGlassFromRegion, resolveProjectImageUrl, updateGlassRegion } from '../projects/project-api';
import type { GlassRegion, GlassRegionBoundaryType, NormalizedPoint, Project, ProjectExport, ProjectImage } from '../projects/project.types';
import { clampPoint, draftOverlapsRegions, generatePreviewPanes, pointsToSvg } from '../projects/region-geometry';

type EditorTool = 'select' | 'region' | 'rectangle' | 'grid' | 'copy' | 'delete' | 'glass' | 'export';
type GlassLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
type RegionLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type DragState =
  | { type: 'draw'; start: NormalizedPoint }
  | { type: 'corner'; index: number }
  | { type: 'edge'; edgeIndex: number; start: NormalizedPoint; originalPoints: NormalizedPoint[] }
  | { type: 'edit-corner'; index: number }
  | { type: 'edit-edge'; edgeIndex: number; start: NormalizedPoint; originalPoints: NormalizedPoint[] }
  | { type: 'edit-move'; start: NormalizedPoint; originalPoints: NormalizedPoint[] };

interface DraftRegion {
  name: string;
  points: NormalizedPoint[] | null;
  rows: number;
  columns: number;
}

interface EditRegionDraft extends DraftRegion {
  id: number;
}

const editorTools: Array<{ id: EditorTool; labelKey: string; icon: LucideIcon; disabled?: boolean }> = [
  { id: 'select', labelKey: 'editorEntry.tools.select', icon: MousePointer2 },
  { id: 'region', labelKey: 'editorEntry.tools.addRegion', icon: Plus },
  { id: 'rectangle', labelKey: 'editorEntry.tools.rectangle', icon: Square },
  { id: 'grid', labelKey: 'editorEntry.tools.grid', icon: Grid2X2 },
  { id: 'copy', labelKey: 'editorEntry.tools.copy', icon: Copy },
  { id: 'delete', labelKey: 'editorEntry.tools.delete', icon: Trash2 },
  { id: 'glass', labelKey: 'editorEntry.tools.glass', icon: Gem },
  { id: 'export', labelKey: 'editorEntry.tools.export', icon: Download },
];

const mobileTools = editorTools.filter((tool) => ['select', 'region', 'rectangle', 'grid', 'glass', 'export'].includes(tool.id));
const zoomOptions = [75, 100, 125];
const defaultDraft: DraftRegion = { name: '', points: null, rows: 2, columns: 2 };

// VI: Trang editor quan ly region/pane, gan mau kinh va export demo co watermark o Sprint 10.
export function EditorEntryPage() {
  const { t } = useTranslation();
  const { projectId, imageId } = useParams();
  const { accessToken } = useAuth();
  const numericProjectId = Number(projectId);
  const numericImageId = Number(imageId);
  const hasEditorContext = Number.isInteger(numericProjectId) && numericProjectId > 0 && Number.isInteger(numericImageId) && numericImageId > 0;
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [regions, setRegions] = useState<GlassRegion[]>([]);
  const [regionLoadStatus, setRegionLoadStatus] = useState<RegionLoadStatus>('idle');
  const [glassProducts, setGlassProducts] = useState<GlassProduct[]>([]);
  const [glassLoadStatus, setGlassLoadStatus] = useState<GlassLoadStatus>('idle');
  const [selectedGlassId, setSelectedGlassId] = useState<number | null>(null);
  const [assigningGlassId, setAssigningGlassId] = useState<number | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState(100);
  const [draft, setDraft] = useState<DraftRegion>(defaultDraft);
  const [editDraft, setEditDraft] = useState<EditRegionDraft | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [regionMessageKey, setRegionMessageKey] = useState<string | null>(null);
  const [glassMessageKey, setGlassMessageKey] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [latestExport, setLatestExport] = useState<ProjectExport | null>(null);
  const [exportMessageKey, setExportMessageKey] = useState<string | null>(null);

  const selectedImage = useMemo(() => images.find((image) => image.id === numericImageId) ?? null, [images, numericImageId]);
  const selectedRegion = useMemo(() => regions.find((region) => region.id === selectedRegionId) ?? null, [regions, selectedRegionId]);
  const imageUrl = resolveProjectImageUrl(selectedImage?.imageUrl ?? null);
  const draftPanes = useMemo(() => (draft.points ? generatePreviewPanes(draft.points, draft.rows, draft.columns) : []), [draft.columns, draft.points, draft.rows]);
  const draftOverlaps = useMemo(() => (draft.points ? draftOverlapsRegions(draft.points, regions) : false), [draft.points, regions]);
  const draftTooSmall = useMemo(() => (draft.points ? getRegionSize(draft.points).width < 0.01 || getRegionSize(draft.points).height < 0.01 : true), [draft.points]);
  const canSaveDraft = Boolean(draft.points && !draftTooSmall && !draftOverlaps && draft.rows >= 1 && draft.rows <= 20 && draft.columns >= 1 && draft.columns <= 20 && saveStatus !== 'saving');
  const editPanes = useMemo(() => (editDraft?.points ? generatePreviewPanes(editDraft.points, editDraft.rows, editDraft.columns) : []), [editDraft]);
  const editOverlaps = useMemo(() => (editDraft?.points ? draftOverlapsRegions(editDraft.points, regions, editDraft.id) : false), [editDraft, regions]);
  const editTooSmall = useMemo(() => (editDraft?.points ? getRegionSize(editDraft.points).width < 0.01 || getRegionSize(editDraft.points).height < 0.01 : true), [editDraft]);
  const editDirty = Boolean(editDraft && selectedRegion && regionDraftChanged(editDraft, selectedRegion));
  const canSaveEdit = Boolean(editDraft?.points && editDirty && !editTooSmall && !editOverlaps && editDraft.rows >= 1 && editDraft.rows <= 20 && editDraft.columns >= 1 && editDraft.columns <= 20 && saveStatus !== 'saving');

  useEffect(() => {
    // VI: Khi chon region da luu, tao ban nhap edit rieng de co the cancel ve state da luu.
    if (!selectedRegion) {
      setEditDraft(null);
      return;
    }

    setEditDraft(regionToEditDraft(selectedRegion));
    setSelectedGlassId(selectedRegion.glassProductId);
    setSaveStatus('idle');
  }, [selectedRegion]);

  const loadGlassProducts = useCallback(async () => {
    try {
      // VI: Catalog kinh chi la phu tro trong editor, loi catalog khong chan canvas/region.
      setGlassLoadStatus('loading');
      setGlassMessageKey(null);
      const productResults = await listActiveGlassProducts();
      setGlassProducts(productResults);
      setSelectedGlassId((current) => (current && productResults.some((product) => product.id === current) ? current : null));
      setGlassLoadStatus('loaded');
    } catch (error) {
      logEditorError('loadGlassProducts', error, { projectId: numericProjectId, imageId: numericImageId });
      setGlassProducts([]);
      setSelectedGlassId(null);
      setGlassLoadStatus('error');
      setGlassMessageKey('editorEntry.glass.loadFailed');
    }
  }, [numericImageId, numericProjectId]);

  const loadRegions = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      // VI: Region load rieng de canvas van dung duoc neu panel region fail tam thoi.
      setRegionLoadStatus('loading');
      setRegionMessageKey(null);
      const regionResults = await listGlassRegions(accessToken, numericProjectId, numericImageId);
      setRegions(regionResults);
      setRegionLoadStatus('loaded');
    } catch (error) {
      logEditorError('loadRegions', error, { projectId: numericProjectId, imageId: numericImageId });
      setRegions([]);
      setRegionLoadStatus('error');
      setRegionMessageKey('editorEntry.regions.loadFailed');
    }
  }, [accessToken, numericImageId, numericProjectId]);

  useEffect(() => {
    const loadEditorContext = async () => {
      if (!hasEditorContext) {
        setIsLoading(false);
        setProject(null);
        setImages([]);
        setMessageKey('editorEntry.messages.invalidContext');
        return;
      }

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        // VI: Project va image la bat buoc de mo editor; backend tiep tuc enforce ownership.
        setIsLoading(true);
        const [projectResult, imageResults] = await Promise.all([
          getProject(accessToken, numericProjectId),
          listProjectImages(accessToken, numericProjectId),
        ]);
        setProject(projectResult);
        setImages(imageResults);
        setMessageKey(imageResults.some((image) => image.id === numericImageId) ? null : 'editorEntry.messages.imageMissing');
      } catch (error) {
        logEditorError('loadEditorContext', error, { projectId: numericProjectId, imageId: numericImageId });
        setProject(null);
        setImages([]);
        setRegions([]);
        setGlassProducts([]);
        setMessageKey('editorEntry.messages.loadFailed');
      } finally {
        setIsLoading(false);
      }
    };

    void loadEditorContext();
  }, [accessToken, hasEditorContext, numericImageId, numericProjectId]);

  useEffect(() => {
    if (!hasEditorContext || !accessToken || !project || !selectedImage) {
      return;
    }

    void loadRegions();
    void loadGlassProducts();
  }, [accessToken, hasEditorContext, loadGlassProducts, loadRegions, project, selectedImage]);

  const startDraft = () => {
    setActiveTool('region');
    setSelectedRegionId(null);
    setEditDraft(null);
    setSaveStatus('idle');
    setRegionMessageKey('editorEntry.regions.drawHint');
    setDraft((current) => ({ ...current, name: current.name || t('editorEntry.regions.defaultName', { count: regions.length + 1 }) }));
  };

  const cancelDraft = () => {
    setDraft(defaultDraft);
    setDragState(null);
    setSaveStatus('idle');
    setRegionMessageKey(null);
    setActiveTool('select');
  };

  const saveDraft = async () => {
    if (!accessToken || !draft.points || !canSaveDraft) {
      return;
    }

    try {
      setSaveStatus('saving');
      const savedRegion = await createGlassRegion(accessToken, numericProjectId, numericImageId, {
        name: draft.name.trim() || t('editorEntry.regions.defaultName', { count: regions.length + 1 }),
        boundaryType: getBoundaryType(draft.points),
        boundaryPoints: draft.points,
        rows: draft.rows,
        columns: draft.columns,
        sortOrder: regions.length,
      });
      setRegions((current) => [...current, savedRegion]);
      setSelectedRegionId(savedRegion.id);
      setDraft(defaultDraft);
      setSaveStatus('saved');
      setRegionMessageKey('editorEntry.regions.saved');
      setActiveTool('select');
    } catch (error) {
      logEditorError('saveRegion', error, { projectId: numericProjectId, imageId: numericImageId });
      setSaveStatus('error');
      setRegionMessageKey('editorEntry.regions.saveFailed');
    }
  };

  const handleToolSelect = (tool: EditorTool) => {
    setActiveTool(tool);
    if (tool === 'export') {
      setIsExportDialogOpen(true);
      return;
    }

    if (tool === 'region' || tool === 'rectangle') {
      startDraft();
      return;
    }

    if (tool === 'copy') {
      void duplicateSelectedRegion();
      return;
    }

    if (tool === 'delete') {
      void deleteSelectedRegion();
    }
  };

  const runExport = async () => {
    if (!accessToken) {
      return;
    }

    try {
      // VI: Frontend chi kich hoat export; backend moi render va dong watermark bat buoc.
      setIsExporting(true);
      setExportMessageKey(null);
      const exportRecord = await exportProjectImage(accessToken, numericProjectId, numericImageId);
      setLatestExport(exportRecord);
      setExportMessageKey('editorEntry.export.success');
    } catch (error) {
      logEditorError('exportDemoImage', error, { projectId: numericProjectId, imageId: numericImageId });
      setExportMessageKey('editorEntry.export.failed');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadLatestExport = async () => {
    if (!accessToken || !latestExport) {
      return;
    }

    try {
      const blob = await downloadProjectExport(accessToken, numericProjectId, latestExport.id);
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = latestExport.fileName;
      anchor.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logEditorError('downloadExport', error, { projectId: numericProjectId, imageId: numericImageId });
      setExportMessageKey('editorEntry.export.downloadFailed');
    }
  };

  const saveEdit = async () => {
    if (!accessToken || !editDraft?.points || !selectedRegion || !canSaveEdit) {
      return;
    }

    try {
      setSaveStatus('saving');
      const updatedRegion = await updateGlassRegion(accessToken, numericProjectId, numericImageId, editDraft.id, {
        name: editDraft.name.trim() || selectedRegion.name,
        boundaryType: getBoundaryType(editDraft.points),
        boundaryPoints: editDraft.points,
        gridMode: 'rows_columns',
        rows: editDraft.rows,
        columns: editDraft.columns,
      });
      setRegions((current) => current.map((region) => (region.id === updatedRegion.id ? updatedRegion : region)));
      setSelectedRegionId(updatedRegion.id);
      setEditDraft(regionToEditDraft(updatedRegion));
      setSaveStatus('saved');
      setRegionMessageKey('editorEntry.regions.updated');
    } catch (error) {
      logEditorError('updateRegion', error, { projectId: numericProjectId, imageId: numericImageId });
      setSaveStatus('error');
      setRegionMessageKey('editorEntry.regions.updateFailed');
    }
  };

  const cancelEdit = () => {
    if (selectedRegion) {
      setEditDraft(regionToEditDraft(selectedRegion));
    }
    setDragState(null);
    setSaveStatus('idle');
    setRegionMessageKey(null);
  };

  const duplicateSelectedRegion = async () => {
    if (!accessToken || !selectedRegion) {
      return;
    }

    try {
      setSaveStatus('saving');
      const duplicatedRegion = await duplicateGlassRegion(accessToken, numericProjectId, numericImageId, selectedRegion.id);
      setRegions((current) => [...current, duplicatedRegion]);
      setSelectedRegionId(duplicatedRegion.id);
      setEditDraft(regionToEditDraft(duplicatedRegion));
      setSaveStatus('saved');
      setRegionMessageKey('editorEntry.regions.duplicated');
    } catch (error) {
      logEditorError('duplicateRegion', error, { projectId: numericProjectId, imageId: numericImageId });
      setSaveStatus('error');
      setRegionMessageKey('editorEntry.regions.duplicateFailed');
    }
  };

  const deleteSelectedRegion = async () => {
    if (!accessToken || !selectedRegion) {
      return;
    }

    const confirmed = window.confirm(t('editorEntry.regions.confirmDelete', { name: selectedRegion.name }));
    if (!confirmed) {
      return;
    }

    try {
      setSaveStatus('saving');
      await deleteGlassRegion(accessToken, numericProjectId, numericImageId, selectedRegion.id);
      setRegions((current) => current.filter((region) => region.id !== selectedRegion.id));
      setSelectedRegionId(null);
      setEditDraft(null);
      setSaveStatus('saved');
      setRegionMessageKey('editorEntry.regions.deleted');
    } catch (error) {
      logEditorError('deleteRegion', error, { projectId: numericProjectId, imageId: numericImageId });
      setSaveStatus('error');
      setRegionMessageKey('editorEntry.regions.deleteFailed');
    }
  };

  const assignSelectedGlass = async (productId: number) => {
    if (!accessToken || !selectedRegion) {
      setGlassMessageKey('editorEntry.glass.selectRegionFirst');
      return;
    }

    try {
      setAssigningGlassId(productId);
      setGlassMessageKey(null);
      const updatedRegion = await assignGlassToRegion(accessToken, numericProjectId, numericImageId, selectedRegion.id, productId);
      setRegions((current) => current.map((region) => (region.id === updatedRegion.id ? updatedRegion : region)));
      setSelectedRegionId(updatedRegion.id);
      setSelectedGlassId(productId);
      setGlassMessageKey('editorEntry.glass.assigned');
    } catch (error) {
      logEditorError('assignGlass', error, { projectId: numericProjectId, imageId: numericImageId });
      setGlassMessageKey('editorEntry.glass.assignFailed');
    } finally {
      setAssigningGlassId(null);
    }
  };

  const removeSelectedGlass = async () => {
    if (!accessToken || !selectedRegion) {
      return;
    }

    try {
      setAssigningGlassId(selectedRegion.glassProductId ?? -1);
      setGlassMessageKey(null);
      const updatedRegion = await removeGlassFromRegion(accessToken, numericProjectId, numericImageId, selectedRegion.id);
      setRegions((current) => current.map((region) => (region.id === updatedRegion.id ? updatedRegion : region)));
      setSelectedRegionId(updatedRegion.id);
      setSelectedGlassId(null);
      setGlassMessageKey('editorEntry.glass.removed');
    } catch (error) {
      logEditorError('removeGlass', error, { projectId: numericProjectId, imageId: numericImageId });
      setGlassMessageKey('editorEntry.glass.removeFailed');
    } finally {
      setAssigningGlassId(null);
    }
  };

  if (isLoading) {
    return <EditorStateCard message={t('editorEntry.messages.loading')} />;
  }

  if (!project || !selectedImage) {
    return (
      <EditorStateCard
        message={t(messageKey ?? 'editorEntry.messages.loadFailed')}
        action={
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white" to="/app/projects">
            <ArrowLeft size={16} />
            {t('editorEntry.backToProjects')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa] text-neutral-950">
      <EditorTopBar project={project} image={selectedImage} saveStatus={saveStatus} />
      {messageKey ? <div className="mx-3 mt-3 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 lg:mx-5">{t(messageKey)}</div> : null}

      <div className="grid flex-1 grid-rows-[auto_1fr_auto] gap-3 p-3 pb-28 lg:grid-cols-[18rem_minmax(0,1fr)_22rem] lg:grid-rows-1 lg:gap-4 lg:p-5">
        <RegionPanel
          regions={regions}
          status={regionLoadStatus}
          messageKey={regionMessageKey}
          selectedRegionId={selectedRegionId}
          onAddRegion={startDraft}
          onRetry={loadRegions}
          onSelectRegion={setSelectedRegionId}
          onDuplicateRegion={duplicateSelectedRegion}
          onDeleteRegion={deleteSelectedRegion}
        />
        <main className="min-w-0">
          <FloatingToolBar activeTool={activeTool} onSelectTool={handleToolSelect} />
          <EditorCanvas
            image={selectedImage}
            imageUrl={imageUrl}
            zoom={zoom}
            regions={regions}
            selectedRegionId={selectedRegionId}
            editDraft={editDraft}
            editPanes={editPanes}
            draft={draft}
            draftPanes={draftPanes}
            dragState={dragState}
            activeTool={activeTool}
            onZoomChange={setZoom}
            onDraftChange={setDraft}
            onEditDraftChange={setEditDraft}
            onDragStateChange={setDragState}
            onSelectRegion={setSelectedRegionId}
          />
          <MobileInspector
            editDraft={editDraft}
            canSaveEdit={canSaveEdit}
            editOverlaps={editOverlaps}
            editTooSmall={editTooSmall}
            draft={draft}
            canSaveDraft={canSaveDraft}
            draftOverlaps={draftOverlaps}
            draftTooSmall={draftTooSmall}
            products={glassProducts}
            selectedGlassId={selectedGlassId}
            selectedRegion={selectedRegion}
            status={glassLoadStatus}
            glassMessageKey={glassMessageKey}
            assigningGlassId={assigningGlassId}
            saveStatus={saveStatus}
            onDraftChange={setDraft}
            onRetry={loadGlassProducts}
            onSelectGlass={setSelectedGlassId}
            onAssignGlass={assignSelectedGlass}
            onRemoveGlass={removeSelectedGlass}
            onSaveDraft={saveDraft}
            onCancelDraft={cancelDraft}
            onEditDraftChange={setEditDraft}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDuplicateRegion={duplicateSelectedRegion}
            onDeleteRegion={deleteSelectedRegion}
            onOpenExport={() => setIsExportDialogOpen(true)}
            latestExport={latestExport}
            isExporting={isExporting}
          />
        </main>
        <InspectorPanel
          editDraft={editDraft}
          canSaveEdit={canSaveEdit}
          editOverlaps={editOverlaps}
          editTooSmall={editTooSmall}
          draft={draft}
          canSaveDraft={canSaveDraft}
          draftOverlaps={draftOverlaps}
          draftTooSmall={draftTooSmall}
          products={glassProducts}
          selectedGlassId={selectedGlassId}
          selectedRegion={selectedRegion}
          status={glassLoadStatus}
          glassMessageKey={glassMessageKey}
          assigningGlassId={assigningGlassId}
          saveStatus={saveStatus}
          onDraftChange={setDraft}
          onRetry={loadGlassProducts}
          onSelectGlass={setSelectedGlassId}
          onAssignGlass={assignSelectedGlass}
          onRemoveGlass={removeSelectedGlass}
          onSaveDraft={saveDraft}
          onCancelDraft={cancelDraft}
          onEditDraftChange={setEditDraft}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onDuplicateRegion={duplicateSelectedRegion}
          onDeleteRegion={deleteSelectedRegion}
          onOpenExport={() => setIsExportDialogOpen(true)}
          latestExport={latestExport}
          isExporting={isExporting}
        />
      </div>

      {isExportDialogOpen ? (
        <ExportDialog
          image={selectedImage}
          imageUrl={imageUrl}
          latestExport={latestExport}
          isExporting={isExporting}
          messageKey={exportMessageKey}
          onClose={() => setIsExportDialogOpen(false)}
          onExport={runExport}
          onDownload={downloadLatestExport}
        />
      ) : null}
      <MobileToolbar activeTool={activeTool} onSelectTool={handleToolSelect} />
    </div>
  );
}

function EditorTopBar({ project, image, saveStatus }: { project: Project; image: ProjectImage; saveStatus: SaveStatus }) {
  const { t } = useTranslation();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700" to={`/app/projects/${project.id}`} aria-label={t('editorEntry.backToProject')}>
            <ArrowLeft size={20} />
          </Link>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-neutral-500 md:flex">
            <span className="font-semibold text-neutral-900">{t('brand.name')}</span>
            <ChevronRight size={16} />
            <Link className="hover:text-brand-red" to="/app/projects">
              {t('navigation.projects')}
            </Link>
            <ChevronRight size={16} />
            <Link className="max-w-40 truncate hover:text-brand-red" to={`/app/projects/${project.id}`}>
              {project.name}
            </Link>
            <ChevronRight size={16} />
            <span className="font-semibold text-neutral-900">{t('editorEntry.topBar.editor')}</span>
          </div>
          <div className="min-w-0 md:hidden">
            <p className="truncate text-base font-semibold">{t('editorEntry.topBar.mobileTitle')}</p>
            <p className="truncate text-xs text-neutral-500">{project.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-sm text-neutral-500 md:flex">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 disabled:opacity-60" type="button" disabled aria-label={t('editorEntry.topBar.undo')}>
              <Undo2 size={17} />
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 disabled:opacity-60" type="button" disabled aria-label={t('editorEntry.topBar.redo')}>
              <Redo2 size={17} />
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t(`editorEntry.topBar.saveStatus.${saveStatus}`)}</span>
          </div>
          <button className="hidden min-h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-500 disabled:cursor-not-allowed md:inline-flex" type="button" disabled>
            <Save size={16} />
            {t('editorEntry.topBar.save')}
          </button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" type="button" disabled>
            <Download size={16} />
            <span className="hidden sm:inline">{t('editorEntry.exportButton')}</span>
          </button>
        </div>
      </div>
      <div className="hidden border-t border-neutral-100 px-5 py-3 text-sm md:flex md:items-center md:gap-4">
        <p className="max-w-64 truncate font-semibold text-neutral-950">{project.name}</p>
        <span className="h-5 w-px bg-neutral-200" />
        <p className="max-w-72 truncate text-neutral-600">{image.title}</p>
        <Info size={16} className="text-neutral-400" />
      </div>
    </header>
  );
}

function FloatingToolBar({ activeTool, onSelectTool }: { activeTool: EditorTool; onSelectTool: (tool: EditorTool) => void }) {
  const { t } = useTranslation();

  return (
    <div className="mb-3 hidden justify-center lg:flex">
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-sm">
        {editorTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                isActive ? 'bg-brand-red text-white' : 'text-neutral-700 hover:bg-stone-100 disabled:text-neutral-400'
              }`}
              type="button"
              disabled={tool.disabled}
              title={tool.disabled ? t('editorEntry.placeholders.sprint8') : t(tool.labelKey)}
              onClick={() => onSelectTool(tool.id)}
            >
              <Icon size={18} />
              {t(tool.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditorCanvas({
  image,
  imageUrl,
  zoom,
  regions,
  selectedRegionId,
  editDraft,
  editPanes,
  draft,
  draftPanes,
  dragState,
  activeTool,
  onZoomChange,
  onDraftChange,
  onEditDraftChange,
  onDragStateChange,
  onSelectRegion,
}: {
  image: ProjectImage;
  imageUrl: string | null;
  zoom: number;
  regions: GlassRegion[];
  selectedRegionId: number | null;
  editDraft: EditRegionDraft | null;
  editPanes: Array<{ paneCode: string; points: NormalizedPoint[] }>;
  draft: DraftRegion;
  draftPanes: Array<{ paneCode: string; points: NormalizedPoint[] }>;
  dragState: DragState | null;
  activeTool: EditorTool;
  onZoomChange: (zoom: number) => void;
  onDraftChange: (draft: DraftRegion | ((current: DraftRegion) => DraftRegion)) => void;
  onEditDraftChange: Dispatch<SetStateAction<EditRegionDraft | null>>;
  onDragStateChange: (state: DragState | null) => void;
  onSelectRegion: (regionId: number | null) => void;
}) {
  const { t } = useTranslation();

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (activeTool !== 'region' && activeTool !== 'rectangle') {
      return;
    }

    const point = getPointerPoint(event);
    onDragStateChange({ type: 'draw', start: point });
    onDraftChange((current) => ({ ...current, points: makeRectangle(point, point) }));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragState) {
      return;
    }

    const point = getPointerPoint(event);
    if (dragState.type === 'draw') {
      onDraftChange((current) => ({ ...current, points: makeRectangle(dragState.start, point) }));
      return;
    }

    if (dragState.type === 'corner') {
      onDraftChange((current) => {
        if (!current.points) {
          return current;
        }
        return { ...current, points: current.points.map((existing, index) => (index === dragState.index ? point : existing)) };
      });
      return;
    }

    if (dragState.type === 'edit-corner') {
      onEditDraftChange((current) => {
        if (!current?.points) {
          return current;
        }
        return { ...current, points: current.points.map((existing, index) => (index === dragState.index ? point : existing)) };
      });
      return;
    }

    if (dragState.type === 'edit-move') {
      onEditDraftChange((current) => {
        if (!current?.points) {
          return current;
        }
        const delta = { x: point.x - dragState.start.x, y: point.y - dragState.start.y };
        const moved = dragState.originalPoints.map((existing) => ({ x: existing.x + delta.x, y: existing.y + delta.y }));
        return pointsInsideUnitSquare(moved) ? { ...current, points: moved } : current;
      });
      return;
    }

    if (dragState.type === 'edit-edge') {
      onEditDraftChange((current) => {
        if (!current?.points) {
          return current;
        }
        const delta = { x: point.x - dragState.start.x, y: point.y - dragState.start.y };
        const firstIndex = dragState.edgeIndex;
        const secondIndex = (dragState.edgeIndex + 1) % dragState.originalPoints.length;
        return {
          ...current,
          points: dragState.originalPoints.map((existing, index) =>
            index === firstIndex || index === secondIndex ? clampPoint({ x: existing.x + delta.x, y: existing.y + delta.y }) : existing,
          ),
        };
      });
      return;
    }

    onDraftChange((current) => {
      if (!current.points) {
        return current;
      }
      const delta = { x: point.x - dragState.start.x, y: point.y - dragState.start.y };
      const firstIndex = dragState.edgeIndex;
      const secondIndex = (dragState.edgeIndex + 1) % dragState.originalPoints.length;
      return {
        ...current,
        points: dragState.originalPoints.map((existing, index) =>
          index === firstIndex || index === secondIndex ? clampPoint({ x: existing.x + delta.x, y: existing.y + delta.y }) : existing,
        ),
      };
    });
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (dragState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onDragStateChange(null);
  };

  return (
    <section className="relative overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur">
        <Maximize2 size={16} />
        {t('editorEntry.canvas.zoomValue', { zoom })}
      </div>
      <div className="absolute right-3 top-3 z-10 hidden items-center gap-2 sm:flex">
        <span className="rounded-md bg-white/95 px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm backdrop-blur">{t('editorEntry.canvas.labelsToggle')}</span>
        <span className="rounded-md bg-white/95 px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm backdrop-blur">{t('editorEntry.canvas.layers')}</span>
      </div>

      <div className="flex min-h-[56vh] items-center justify-center bg-neutral-100 p-2 sm:min-h-[62vh] lg:min-h-[calc(100vh-15rem)]">
        {imageUrl ? (
          <div className="relative max-h-[72vh] max-w-full touch-none select-none" style={{ width: `${zoom}%` }}>
            <img className="max-h-[72vh] w-full rounded-sm object-contain shadow-lg ring-1 ring-neutral-300" src={imageUrl} alt={image.title} draggable={false} />
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              role="img"
              aria-label={t('editorEntry.canvas.overlayLabel')}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <GlassMaterialPreviewLayer regions={regions} />
              {regions.map((region, index) => (
                <RegionShape
                  key={region.id}
                  region={region}
                  index={index}
                  isSelected={selectedRegionId === region.id}
                  editPoints={editDraft?.id === region.id ? editDraft.points : null}
                  editPanes={editDraft?.id === region.id ? editPanes : []}
                  onSelect={() => onSelectRegion(region.id)}
                  onMovePointerDown={(event) => {
                    if (editDraft?.id !== region.id || !editDraft.points) {
                      return;
                    }
                    event.stopPropagation();
                    onSelectRegion(region.id);
                    onDragStateChange({ type: 'edit-move', start: getPointerPoint(event), originalPoints: editDraft.points });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                  onCornerPointerDown={(event, cornerIndex) => {
                    if (editDraft?.id !== region.id) {
                      return;
                    }
                    event.stopPropagation();
                    onDragStateChange({ type: 'edit-corner', index: cornerIndex });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                  onEdgePointerDown={(event, edgeIndex) => {
                    if (editDraft?.id !== region.id || !editDraft.points) {
                      return;
                    }
                    event.stopPropagation();
                    onDragStateChange({ type: 'edit-edge', edgeIndex, start: getPointerPoint(event), originalPoints: editDraft.points });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                />
              ))}
              {draft.points ? (
                <DraftShape
                  points={draft.points}
                  panes={draftPanes}
                  onCornerPointerDown={(event, index) => {
                    event.stopPropagation();
                    onDragStateChange({ type: 'corner', index });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                  onEdgePointerDown={(event, edgeIndex) => {
                    event.stopPropagation();
                    onDragStateChange({ type: 'edge', edgeIndex, start: getPointerPoint(event), originalPoints: draft.points ?? [] });
                    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                  }}
                />
              ) : null}
            </svg>
            {!draft.points ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md border border-neutral-200 bg-white/92 px-4 py-3 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur">
                {t('editorEntry.canvas.regionToolsLater')}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="max-w-md rounded-md border border-dashed border-neutral-300 bg-white px-5 py-8 text-center">
            <p className="font-semibold text-neutral-950">{t('editorEntry.canvas.emptyTitle')}</p>
            <p className="mt-2 text-sm text-neutral-600">{t('editorEntry.canvas.emptyDescription')}</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-md bg-white/95 p-1 shadow-sm backdrop-blur">
        {zoomOptions.map((option) => (
          <button
            key={option}
            className={`min-h-9 rounded px-3 text-sm font-semibold ${zoom === option ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-stone-100'}`}
            type="button"
            onClick={() => onZoomChange(option)}
          >
            {t('editorEntry.canvas.zoomValue', { zoom: option })}
          </button>
        ))}
        <ZoomIn size={16} className="mx-2 text-neutral-500" />
      </div>
    </section>
  );
}

function RegionShape({
  region,
  index,
  isSelected,
  editPoints,
  editPanes,
  onSelect,
  onMovePointerDown,
  onCornerPointerDown,
  onEdgePointerDown,
}: {
  region: GlassRegion;
  index: number;
  isSelected: boolean;
  editPoints: NormalizedPoint[] | null;
  editPanes: Array<{ paneCode: string; points: NormalizedPoint[] }>;
  onSelect: () => void;
  onMovePointerDown: (event: PointerEvent<SVGPolygonElement>) => void;
  onCornerPointerDown: (event: PointerEvent<SVGCircleElement>, index: number) => void;
  onEdgePointerDown: (event: PointerEvent<SVGCircleElement>, edgeIndex: number) => void;
}) {
  const regionColor = ['#2563eb', '#16a34a', '#9333ea', '#f97316', '#0891b2'][index % 5];
  const points = editPoints ?? region.boundaryPointsJson;
  const panes = editPoints ? editPanes : region.panes.map((pane) => ({ paneCode: String(pane.id), points: pane.panePointsJson }));

  return (
    <g
      className="cursor-pointer"
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {panes.map((pane) => (
        <polygon key={pane.paneCode} points={pointsToSvg(pane.points)} fill="none" stroke={regionColor} strokeDasharray="0.8 0.8" strokeOpacity="0.55" strokeWidth="0.18" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={pointsToSvg(points)} fill="rgba(255,255,255,0.02)" stroke={regionColor} strokeWidth={isSelected ? '0.7' : '0.45'} vectorEffect="non-scaling-stroke" onPointerDown={onMovePointerDown} />
      {isSelected ? <SavedRegionHandles points={points} color={regionColor} onCornerPointerDown={onCornerPointerDown} onEdgePointerDown={onEdgePointerDown} /> : null}
      <text x={getCenter(points).x * 100} y={getCenter(points).y * 100} textAnchor="middle" className="pointer-events-none fill-white text-[3px] font-bold" paintOrder="stroke" stroke={regionColor} strokeWidth="0.6">
        {index + 1}
      </text>
    </g>
  );
}

function SavedRegionHandles({
  points,
  color,
  onCornerPointerDown,
  onEdgePointerDown,
}: {
  points: NormalizedPoint[];
  color: string;
  onCornerPointerDown: (event: PointerEvent<SVGCircleElement>, index: number) => void;
  onEdgePointerDown: (event: PointerEvent<SVGCircleElement>, edgeIndex: number) => void;
}) {
  // VI: Handle Sprint 8 cho phep reshape region da luu, backend van validate lai overlap khi save.
  return (
    <g>
      {points.map((point, index) => (
        <circle key={`saved-corner-${index}`} cx={point.x * 100} cy={point.y * 100} r="1.1" className="cursor-grab" fill="white" stroke={color} strokeWidth="0.32" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onCornerPointerDown(event, index)} />
      ))}
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
        return <circle key={`saved-edge-${index}`} cx={midpoint.x * 100} cy={midpoint.y * 100} r="0.85" className="cursor-move" fill={color} stroke="white" strokeWidth="0.25" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onEdgePointerDown(event, index)} />;
      })}
    </g>
  );
}

function DraftShape({
  points,
  panes,
  onCornerPointerDown,
  onEdgePointerDown,
}: {
  points: NormalizedPoint[];
  panes: Array<{ paneCode: string; points: NormalizedPoint[] }>;
  onCornerPointerDown: (event: PointerEvent<SVGCircleElement>, index: number) => void;
  onEdgePointerDown: (event: PointerEvent<SVGCircleElement>, edgeIndex: number) => void;
}) {
  return (
    <g>
      {panes.map((pane) => (
        <polygon key={pane.paneCode} points={pointsToSvg(pane.points)} fill="rgba(37,99,235,0.05)" stroke="#ffffff" strokeDasharray="0.8 0.8" strokeWidth="0.22" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={pointsToSvg(points)} fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth="0.55" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => (
        <circle key={`${point.x}-${point.y}-${index}`} cx={point.x * 100} cy={point.y * 100} r="1.2" className="cursor-grab fill-white stroke-blue-600" strokeWidth="0.35" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onCornerPointerDown(event, index)} />
      ))}
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
        return (
          <circle key={`edge-${index}`} cx={midpoint.x * 100} cy={midpoint.y * 100} r="0.9" className="cursor-move fill-blue-600 stroke-white" strokeWidth="0.3" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onEdgePointerDown(event, index)} />
        );
      })}
    </g>
  );
}

function RegionPanel({
  regions,
  status,
  messageKey,
  selectedRegionId,
  onAddRegion,
  onRetry,
  onSelectRegion,
  onDuplicateRegion,
  onDeleteRegion,
}: {
  regions: GlassRegion[];
  status: RegionLoadStatus;
  messageKey: string | null;
  selectedRegionId: number | null;
  onAddRegion: () => void;
  onRetry: () => void;
  onSelectRegion: (regionId: number) => void;
  onDuplicateRegion: () => void;
  onDeleteRegion: () => void;
}) {
  const { t } = useTranslation();

  return (
    <aside className="hidden rounded-md border border-neutral-200 bg-white p-4 shadow-sm lg:block">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{t('editorEntry.regions.title')}</h2>
          <p className="mt-1 text-xs text-neutral-500">{t('editorEntry.regions.count', { count: regions.length })}</p>
        </div>
        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-brand-red" type="button" onClick={onAddRegion} aria-label={t('editorEntry.tools.addRegion')}>
          <Plus size={17} />
        </button>
      </div>

      {status === 'loading' ? <div className="mt-4 rounded-md bg-stone-100 px-4 py-5 text-sm text-neutral-700">{t('editorEntry.regions.loading')}</div> : null}
      {messageKey ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-800">
          <p className="font-semibold">{t(messageKey)}</p>
          {status === 'error' ? (
            <button className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200" type="button" onClick={onRetry}>
              {t('editorEntry.glass.retry')}
            </button>
          ) : null}
        </div>
      ) : null}

      {status === 'loaded' && regions.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-neutral-300 bg-stone-50 px-4 py-5 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">{t('editorEntry.regions.emptyTitle')}</p>
          <p className="mt-2 leading-6">{t('editorEntry.regions.emptyDescription')}</p>
        </div>
      ) : null}

      {regions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {regions.map((region, index) => (
            <div key={region.id} className={`rounded-md border px-3 py-3 ${selectedRegionId === region.id ? 'border-brand-red bg-red-50' : 'border-neutral-200 bg-white'}`}>
              <button className="w-full text-left" type="button" onClick={() => onSelectRegion(region.id)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-950">{region.name}</p>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">{t('editorEntry.regions.paneCount', { count: region.panes.length })}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('editorEntry.regions.gridValue', { rows: region.rows ?? 1, columns: region.columns ?? 1 })}</p>
                <p className="mt-1 text-xs font-semibold text-neutral-600">
                  {region.glassProduct ? t('editorEntry.glass.assignedProduct', { name: region.glassProduct.name, code: region.glassProduct.code }) : t('editorEntry.regions.unassignedGlass')}
                </p>
                {selectedRegionId === region.id ? <p className="mt-2 rounded bg-white/80 px-2 py-1 text-xs font-semibold text-red-700">{t('editorEntry.regions.editSelected')}</p> : null}
              </button>
              {selectedRegionId === region.id ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-2 text-xs font-semibold text-neutral-700" type="button" onClick={onDuplicateRegion}>
                    <Copy size={14} />
                    {t('editorEntry.regions.duplicate')}
                  </button>
                  <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-100 bg-white px-2 text-xs font-semibold text-red-700" type="button" onClick={onDeleteRegion}>
                    <Trash2 size={14} />
                    {t('editorEntry.regions.delete')}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-semibold">{t('editorEntry.regions.warningTitle')}</p>
        <p className="mt-2 leading-6">{t('editorEntry.regions.warningDescription')}</p>
      </div>
    </aside>
  );
}

type InspectorProps = GlassSelectorProps & {
  selectedRegion: GlassRegion | null;
  editDraft: EditRegionDraft | null;
  canSaveEdit: boolean;
  editOverlaps: boolean;
  editTooSmall: boolean;
  draft: DraftRegion;
  canSaveDraft: boolean;
  draftOverlaps: boolean;
  draftTooSmall: boolean;
  saveStatus: SaveStatus;
  onDraftChange: (draft: DraftRegion | ((current: DraftRegion) => DraftRegion)) => void;
  onSaveDraft: () => void;
  onCancelDraft: () => void;
  onEditDraftChange: Dispatch<SetStateAction<EditRegionDraft | null>>;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDuplicateRegion: () => void;
  onDeleteRegion: () => void;
  onOpenExport: () => void;
  latestExport: ProjectExport | null;
  isExporting: boolean;
};

function InspectorPanel(props: InspectorProps) {
  return (
    <aside className="hidden space-y-3 lg:block">
      {props.editDraft ? <SelectedRegionPanel {...props} /> : <RegionSettingsPanel {...props} />}
      <GlassSelectorPanel {...props} />
      <ExportPanel latestExport={props.latestExport} isExporting={props.isExporting} onOpenExport={props.onOpenExport} />
    </aside>
  );
}

type GlassSelectorProps = {
  products: GlassProduct[];
  selectedGlassId: number | null;
  selectedRegion: GlassRegion | null;
  status: GlassLoadStatus;
  glassMessageKey: string | null;
  assigningGlassId: number | null;
  onRetry: () => void;
  onSelectGlass: (productId: number | null) => void;
  onAssignGlass: (productId: number) => void;
  onRemoveGlass: () => void;
};

function MobileInspector(props: InspectorProps) {
  const { t } = useTranslation();

  return (
    <section className="mt-3 space-y-3 rounded-t-3xl border border-neutral-200 bg-white p-4 shadow-sm lg:hidden">
      <div className="mx-auto h-1 w-14 rounded-full bg-neutral-200" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{props.editDraft ? t('editorEntry.mobileSheet.editCode') : t('editorEntry.mobileSheet.regionCode')}</p>
          <h2 className="mt-3 text-lg font-semibold text-neutral-950">{props.editDraft ? t('editorEntry.regions.editTitle') : t('editorEntry.mobileSheet.title')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{props.editDraft ? t('editorEntry.regions.editDescription') : t('editorEntry.mobileSheet.description')}</p>
        </div>
        <span className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{props.editDraft ? t('editorEntry.regions.unsavedChanges') : t('editorEntry.mobileSheet.placeholderStatus')}</span>
      </div>
      {props.editDraft ? <SelectedRegionPanel compact {...props} /> : <RegionSettingsPanel compact {...props} />}
      <GlassSelectorPanel compact {...props} />
      <ExportPanel compact latestExport={props.latestExport} isExporting={props.isExporting} onOpenExport={props.onOpenExport} />
    </section>
  );
}

function SelectedRegionPanel({
  selectedRegion,
  editDraft,
  canSaveEdit,
  editOverlaps,
  editTooSmall,
  saveStatus,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onDuplicateRegion,
  onDeleteRegion,
  onRemoveGlass,
  assigningGlassId,
  compact = false,
}: InspectorProps & { compact?: boolean }) {
  const { t } = useTranslation();

  if (!selectedRegion || !editDraft) {
    return (
      <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-sm ${compact ? 'border-neutral-100 shadow-none' : ''}`}>
        <h2 className="text-base font-semibold text-neutral-950">{t('editorEntry.regions.editTitle')}</h2>
        <p className="mt-2 text-sm text-neutral-600">{t('editorEntry.regions.noSelectionHelp')}</p>
      </section>
    );
  }

  const paneCount = editDraft.rows * editDraft.columns;
  const assignedProduct = selectedRegion.glassProduct;

  return (
    <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-sm ${compact ? 'border-neutral-100 shadow-none' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{t('editorEntry.regions.editTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t('editorEntry.regions.editDescription')}</p>
        </div>
        <span className={`rounded-md px-3 py-2 text-xs font-semibold ${assignedProduct ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-neutral-700'}`}>
          {assignedProduct ? t('editorEntry.glass.assignedBadge') : t('editorEntry.regions.unassignedGlass')}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-semibold text-neutral-800">
          {t('editorEntry.regions.nameLabel')}
          <input
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
            value={editDraft.name}
            onChange={(event) => onEditDraftChange((current) => (current ? { ...current, name: event.target.value } : current))}
            placeholder={t('editorEntry.regions.namePlaceholder')}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('editorEntry.regions.rows')} value={editDraft.rows} onChange={(value) => onEditDraftChange((current) => (current ? { ...current, rows: value } : current))} />
          <NumberField label={t('editorEntry.regions.columns')} value={editDraft.columns} onChange={(value) => onEditDraftChange((current) => (current ? { ...current, columns: value } : current))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricBox labelKey="editorEntry.inspector.geometry" value={editDraft.points ? t(`editorEntry.boundaryTypes.${getBoundaryType(editDraft.points)}`) : t('editorEntry.inspector.noSelection')} />
          <MetricBox labelKey="editorEntry.inspector.grid" value={t('editorEntry.regions.gridValue', { rows: editDraft.rows, columns: editDraft.columns })} />
          <MetricBox labelKey="editorEntry.inspector.area" value={t('editorEntry.regions.paneCount', { count: paneCount })} />
        </div>
        <div className="rounded-md border border-neutral-200 bg-stone-50 px-3 py-3 text-sm">
          <p className="font-semibold text-neutral-900">{t('editorEntry.glass.currentProduct')}</p>
          {assignedProduct ? (
            <div className="mt-2 space-y-2">
              <p className="font-semibold text-neutral-950">{assignedProduct.name}</p>
              <p className="text-xs text-neutral-600">
                {t('editorEntry.glass.productMeta', {
                  code: assignedProduct.code,
                  material: t(`catalog.materialTypes.${assignedProduct.materialType}`, { defaultValue: t('editorEntry.glass.unknownMaterial') }),
                })}
              </p>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={onRemoveGlass}
                disabled={assigningGlassId !== null}
              >
                {assigningGlassId !== null ? t('editorEntry.glass.saving') : t('editorEntry.glass.remove')}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-600">{t('editorEntry.glass.unassignedHelp')}</p>
          )}
        </div>
        {editOverlaps ? <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{t('editorEntry.regions.overlapWarning')}</p> : null}
        {editTooSmall ? <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('editorEntry.regions.tooSmall')}</p> : null}
        <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-neutral-700">{t('editorEntry.regions.editHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onCancelEdit}>
            {t('editorEntry.regions.cancelEdit')}
          </button>
          <button className="min-h-11 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={!canSaveEdit} onClick={onSaveEdit}>
            {saveStatus === 'saving' ? t('editorEntry.regions.saving') : t('editorEntry.regions.saveEdit')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onDuplicateRegion}>
            <Copy size={16} />
            {t('editorEntry.regions.duplicate')}
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" type="button" onClick={onDeleteRegion}>
            <Trash2 size={16} />
            {t('editorEntry.regions.delete')}
          </button>
        </div>
      </div>
    </section>
  );
}

function RegionSettingsPanel({
  draft,
  canSaveDraft,
  draftOverlaps,
  draftTooSmall,
  saveStatus,
  onDraftChange,
  onSaveDraft,
  onCancelDraft,
  compact = false,
}: InspectorProps & { compact?: boolean }) {
  const { t } = useTranslation();

  return (
    <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-sm ${compact ? 'border-neutral-100 shadow-none' : ''}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-950">{t('editorEntry.inspector.title')}</h2>
        <Layers3 size={18} className="text-neutral-500" />
      </div>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-semibold text-neutral-800">
          {t('editorEntry.regions.nameLabel')}
          <input
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
            value={draft.name}
            onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
            placeholder={t('editorEntry.regions.namePlaceholder')}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('editorEntry.regions.rows')} value={draft.rows} onChange={(value) => onDraftChange((current) => ({ ...current, rows: value }))} />
          <NumberField label={t('editorEntry.regions.columns')} value={draft.columns} onChange={(value) => onDraftChange((current) => ({ ...current, columns: value }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricBox labelKey="editorEntry.inspector.geometry" value={draft.points ? t(`editorEntry.boundaryTypes.${getBoundaryType(draft.points)}`) : t('editorEntry.inspector.noSelection')} />
          <MetricBox labelKey="editorEntry.inspector.grid" value={t('editorEntry.regions.gridValue', { rows: draft.rows, columns: draft.columns })} />
          <MetricBox labelKey="editorEntry.inspector.area" value={draft.points ? t('editorEntry.regions.paneCount', { count: draft.rows * draft.columns }) : t('editorEntry.inspector.sprint7Value')} />
        </div>
        {draftOverlaps ? <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{t('editorEntry.regions.overlapWarning')}</p> : null}
        {draftTooSmall && draft.points ? <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('editorEntry.regions.tooSmall')}</p> : null}
        {!draft.points ? <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-neutral-700">{t('editorEntry.regions.drawHint')}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onCancelDraft}>
            {t('editorEntry.regions.cancel')}
          </button>
          <button className="min-h-11 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={!canSaveDraft} onClick={onSaveDraft}>
            {saveStatus === 'saving' ? t('editorEntry.regions.saving') : t('editorEntry.regions.save')}
          </button>
        </div>
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-semibold text-neutral-800">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-red"
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MetricBox({ labelKey, value }: { labelKey: string; value: string }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-neutral-200 px-3 py-3">
      <p className="text-xs text-neutral-500">{t(labelKey)}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function GlassSelectorPanel({
  products,
  selectedGlassId,
  selectedRegion,
  status,
  glassMessageKey,
  assigningGlassId,
  onRetry,
  onSelectGlass,
  onAssignGlass,
  onRemoveGlass,
  compact = false,
}: GlassSelectorProps & { compact?: boolean }) {
  const { t } = useTranslation();
  const visibleProducts = products;
  const assignedProductId = selectedRegion?.glassProductId ?? null;

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Gem className="text-brand-red" size={18} />
        <h3 className="text-base font-semibold text-neutral-950">{t('editorEntry.glass.title')}</h3>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{t('editorEntry.glass.description')}</p>
      {selectedRegion ? (
        <p className="mt-2 rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold text-neutral-700">
          {selectedRegion.glassProduct ? t('editorEntry.glass.assignedProduct', { name: selectedRegion.glassProduct.name, code: selectedRegion.glassProduct.code }) : t('editorEntry.glass.selectProductHelp')}
        </p>
      ) : (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('editorEntry.glass.selectRegionFirst')}</p>
      )}
      {glassMessageKey ? <p className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-neutral-700">{t(glassMessageKey)}</p> : null}

      {status === 'loading' ? <div className="mt-4 rounded-md bg-stone-100 px-4 py-5 text-sm text-neutral-700">{t('editorEntry.glass.loading')}</div> : null}

      {status === 'error' ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-800">
          <p className="font-semibold">{t('editorEntry.glass.loadFailed')}</p>
          <button className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200" type="button" onClick={onRetry}>
            {t('editorEntry.glass.retry')}
          </button>
        </div>
      ) : null}

      {status === 'loaded' && products.length === 0 ? <div className="mt-4 rounded-md bg-stone-100 px-4 py-5 text-sm text-neutral-700">{t('editorEntry.glass.empty')}</div> : null}

      {status === 'loaded' && visibleProducts.length > 0 ? (
        <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
          {visibleProducts.map((product) => {
            const isSelected = selectedGlassId === product.id;
            const isAssigned = assignedProductId === product.id;
            const isSaving = assigningGlassId === product.id;
            return (
              <div key={product.id} className={`rounded-md border p-2 text-left transition ${isSelected || isAssigned ? 'border-brand-red bg-red-50' : 'border-neutral-200 bg-white'}`}>
                <button className="block w-full text-left" type="button" onClick={() => onSelectGlass(isSelected ? null : product.id)}>
                <GlassPreview product={product} />
                <p className="mt-2 line-clamp-1 text-sm font-semibold text-neutral-950">{product.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{product.code}</p>
                  {isAssigned ? <span className="mt-2 inline-flex rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">{t('editorEntry.glass.assignedBadge')}</span> : null}
                  {!isAssigned && isSelected ? <span className="mt-2 inline-flex rounded bg-brand-red px-2 py-1 text-xs font-semibold text-white">{t('editorEntry.glass.selected')}</span> : null}
              </button>
                <button
                  className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-md bg-brand-red px-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={!selectedRegion || assigningGlassId !== null}
                  onClick={() => (isAssigned ? onRemoveGlass() : onAssignGlass(product.id))}
                >
                  {isSaving ? t('editorEntry.glass.saving') : isAssigned ? t('editorEntry.glass.remove') : selectedRegion?.glassProductId ? t('editorEntry.glass.change') : t('editorEntry.glass.assign')}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ExportPanel({
  compact = false,
  latestExport,
  isExporting,
  onOpenExport,
}: {
  compact?: boolean;
  latestExport: ProjectExport | null;
  isExporting: boolean;
  onOpenExport: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className={`rounded-md border border-neutral-200 bg-white p-4 shadow-sm ${compact ? 'border-neutral-100 shadow-none' : ''}`}>
      <div className="flex items-center gap-2">
        <BoxSelect className="text-brand-red" size={18} />
        <h3 className="text-base font-semibold text-neutral-950">{t('editorEntry.export.title')}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t('editorEntry.export.description')}</p>
      {latestExport ? (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {t('editorEntry.export.latestReady')}
        </p>
      ) : null}
      <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500" type="button" onClick={onOpenExport} disabled={isExporting}>
        <Download size={16} />
        {isExporting ? t('editorEntry.export.exporting') : t('editorEntry.export.openAction')}
      </button>
    </section>
  );
}

function ExportDialog({
  image,
  imageUrl,
  latestExport,
  isExporting,
  messageKey,
  onClose,
  onExport,
  onDownload,
}: {
  image: ProjectImage;
  imageUrl: string | null;
  latestExport: ProjectExport | null;
  isExporting: boolean;
  messageKey: string | null;
  onClose: () => void;
  onExport: () => void;
  onDownload: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 lg:items-center lg:justify-center lg:p-6" role="dialog" aria-modal="true" aria-labelledby="editor-export-title">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl lg:max-w-4xl lg:rounded-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="editor-export-title" className="text-xl font-semibold text-neutral-950">{t('editorEntry.export.modalTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{t('editorEntry.export.modalDescription')}</p>
          </div>
          <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-3 text-sm font-semibold text-neutral-800">{t('editorEntry.export.previewTitle')}</p>
            {imageUrl ? <img className="aspect-video w-full rounded-md object-cover" src={imageUrl} alt={image.title} /> : <div className="flex aspect-video items-center justify-center rounded-md bg-white text-sm text-neutral-500">{t('editorEntry.canvas.noImage')}</div>}
            <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">{t('editorEntry.export.previewNotice')}</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-neutral-200 p-4">
              <p className="text-sm font-semibold text-neutral-950">{t('editorEntry.export.optionsTitle')}</p>
              <dl className="mt-3 space-y-2 text-sm text-neutral-700">
                <div className="flex justify-between gap-3">
                  <dt>{t('editorEntry.export.formatLabel')}</dt>
                  <dd className="font-semibold">{t('editorEntry.export.svgFormat')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{t('editorEntry.export.watermarkLabel')}</dt>
                  <dd className="font-semibold text-brand-red">{t('editorEntry.export.watermarkRequired')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{t('editorEntry.export.imageLabel')}</dt>
                  <dd className="max-w-40 truncate font-semibold">{image.title}</dd>
                </div>
              </dl>
            </div>

            {messageKey ? <p className="rounded-md border border-neutral-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-neutral-700">{t(messageKey)}</p> : null}
            {latestExport ? (
              <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">{t('editorEntry.export.readyTitle')}</p>
                <p className="mt-1">{t('editorEntry.export.readyDescription', { fileName: latestExport.fileName })}</p>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700" type="button" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300" type="button" onClick={onExport} disabled={isExporting}>
                <Download size={16} />
                {isExporting ? t('editorEntry.export.exporting') : t('editorEntry.export.confirmAction')}
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 sm:col-span-2" type="button" onClick={onDownload} disabled={!latestExport || isExporting}>
                <Download size={16} />
                {t('editorEntry.export.downloadAction')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MobileToolbar({ activeTool, onSelectTool }: { activeTool: EditorTool; onSelectTool: (tool: EditorTool) => void }) {
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-2 pb-4 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:hidden" aria-label={t('editorEntry.mobileToolbarLabel')}>
      <div className="grid grid-cols-6 gap-1">
        {mobileTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`flex min-h-16 flex-col items-center justify-center rounded-md px-1 py-1 text-xs font-semibold ${
                isActive ? 'bg-red-50 text-brand-red' : 'text-neutral-600 disabled:text-neutral-400'
              }`}
              type="button"
              disabled={tool.disabled}
              onClick={() => onSelectTool(tool.id)}
            >
              <Icon size={20} />
              <span className="mt-1 truncate">{t(tool.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function EditorStateCard({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md rounded-md border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <ImageIcon className="mx-auto text-brand-red" size={32} />
        <p className="mt-4 text-sm font-semibold text-neutral-800">{message}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

function getPointerPoint(event: PointerEvent<SVGElement>): NormalizedPoint {
  const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
  const rect = svg?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 };
  }

  return clampPoint({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  });
}

function makeRectangle(start: NormalizedPoint, end: NormalizedPoint): NormalizedPoint[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function getBoundaryType(points: NormalizedPoint[]): GlassRegionBoundaryType {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const isRectangle = Math.abs(topLeft.y - topRight.y) < 0.001 && Math.abs(bottomLeft.y - bottomRight.y) < 0.001 && Math.abs(topLeft.x - bottomLeft.x) < 0.001 && Math.abs(topRight.x - bottomRight.x) < 0.001;
  return isRectangle ? 'rectangle' : 'quadrilateral';
}

function getCenter(points: NormalizedPoint[]): NormalizedPoint {
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function getRegionSize(points: NormalizedPoint[]): { width: number; height: number } {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

function regionToEditDraft(region: GlassRegion): EditRegionDraft {
  // VI: Tach ban nhap edit khoi region da luu de cancel co the phuc hoi dung state backend.
  return {
    id: region.id,
    name: region.name,
    points: region.boundaryPointsJson.map((point) => ({ ...point })),
    rows: region.rows ?? 1,
    columns: region.columns ?? 1,
  };
}

function regionDraftChanged(draft: EditRegionDraft, region: GlassRegion): boolean {
  // VI: Chi gui PATCH khi name/grid/geometry that su thay doi de tranh regenerate pane khong can thiet.
  return draft.name !== region.name || draft.rows !== (region.rows ?? 1) || draft.columns !== (region.columns ?? 1) || !pointsEqual(draft.points ?? [], region.boundaryPointsJson);
}

function pointsEqual(left: NormalizedPoint[], right: NormalizedPoint[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((point, index) => Math.abs(point.x - right[index].x) < 0.0005 && Math.abs(point.y - right[index].y) < 0.0005);
}

function pointsInsideUnitSquare(points: NormalizedPoint[]): boolean {
  // VI: Move region da luu chi duoc chap nhan neu toan bo diem van nam trong anh normalized 0..1.
  return points.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
}

function logEditorError(action: string, error: unknown, context: { projectId?: number; imageId?: number } = {}) {
  // VI: Log loi editor voi context an toan, khong dump token/request/raw response.
  console.error({
    module: 'EditorEntryPage',
    action,
    ...context,
    message: 'Editor request failed',
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
}
