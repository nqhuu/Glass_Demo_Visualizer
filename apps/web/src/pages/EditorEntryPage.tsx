import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ShellCard } from '../components/ShellCard';

// VI: Entry shell editor Sprint 4 nhan project/image id nhung chua co canvas hay rendering logic.
export function EditorEntryPage() {
  const { t } = useTranslation();
  const { projectId, imageId } = useParams();

  return (
    <div className="space-y-6">
      <PageHeader kicker={t('editorEntry.kicker')} title={t('editorEntry.title')} description={t('editorEntry.description')} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <ShellCard className="min-h-[360px]">
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-md border border-dashed border-neutral-300 bg-stone-100 px-4 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-neutral-950">{t('editorEntry.canvasTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{t('editorEntry.canvasDescription')}</p>
            </div>
          </div>
        </ShellCard>
        <ShellCard>
          <h3 className="text-lg font-semibold text-neutral-950">{t('editorEntry.panelTitle')}</h3>
          <div className="mt-4 space-y-3">
            {projectId && imageId ? <PanelRow text={t('editorEntry.panelStepCurrentImage', { projectId, imageId })} /> : null}
            <PanelRow text={t('editorEntry.panelStepImage')} />
            <PanelRow text={t('editorEntry.panelStepRegion')} />
            <PanelRow text={t('editorEntry.panelStepGlass')} />
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function PanelRow({ text }: { text: string }) {
  return <div className="rounded-md bg-stone-100 px-3 py-3 text-sm text-neutral-700">{text}</div>;
}
