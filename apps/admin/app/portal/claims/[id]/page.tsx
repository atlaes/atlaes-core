'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Upload,
  Pencil,
  Send,
  Inbox,
  Clock,
  FileText,
} from 'lucide-react';
import {
  CASE_STAGES,
  CHANNEL_LABELS,
  getFirmCase,
  getFirmCorrespondenceDownload,
  getFirmDownload,
  LawFirmCaseEvent,
  LawFirmSubmissionChannel,
  recordFirmEvent,
  setFirmReference,
  uploadFirmCorrespondence,
} from '@/lib/law-firm-api';
import {
  Button,
  ErrorText,
  Fact,
  FactGroup,
  Field,
  PageHeader,
  Spinner,
  Stepper,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatBytes,
  formatDate,
  inputClass,
} from '@/components/ui';

const EVENT_LABELS: Record<string, string> = {
  downloaded: 'Paket heruntergeladen',
  submitted: 'Beim Versorgungsträger eingereicht',
  response_received: 'Antwort erhalten',
  closed: 'Akte abgeschlossen',
  reference_set: 'Aktenzeichen eingetragen',
  correspondence_uploaded: 'Schreiben hochgeladen',
};

const todayIso = () => new Date().toISOString().slice(0, 10);

type EventForm = {
  event: LawFirmCaseEvent;
  date: string;
  channel: LawFirmSubmissionChannel;
  note: string;
};

export default function PortalCasePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const uploadRef = useRef<HTMLDivElement>(null);

  const [refEditing, setRefEditing] = useState(false);
  const [refValue, setRefValue] = useState('');
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadDate, setUploadDate] = useState(todayIso());
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const caseQuery = useQuery({
    queryKey: ['firm-case', id],
    queryFn: () => getFirmCase(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['firm-case', id] });
    queryClient.invalidateQueries({ queryKey: ['firm-claims'] });
    queryClient.invalidateQueries({ queryKey: ['firm-summary'] });
  };

  const refMutation = useMutation({
    mutationFn: (v: string) => setFirmReference(id, v),
    onSuccess: () => {
      setRefEditing(false);
      invalidate();
    },
  });
  const eventMutation = useMutation({
    mutationFn: (f: EventForm) =>
      recordFirmEvent(id, {
        event: f.event,
        date: f.date || null,
        channel: f.event === 'submitted' ? f.channel : null,
        note: f.note.trim() || null,
      }),
    onSuccess: () => {
      setEventForm(null);
      invalidate();
    },
  });
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFirmCorrespondence(id, file, {
        note: uploadNote.trim() || undefined,
        receivedDate: uploadDate || undefined,
      }),
    onSuccess: () => {
      setUploadFile(null);
      setUploadNote('');
      setUploadDate(todayIso());
      invalidate();
    },
  });

  const open = async (fn: () => Promise<{ downloadUrl: string | null }>) => {
    setDownloadError(null);
    try {
      const r = await fn();
      if (r.downloadUrl) {
        window.open(r.downloadUrl, '_blank', 'noopener');
        invalidate();
      } else
        setDownloadError('In dieser Umgebung ist kein Download verfügbar.');
    } catch (e) {
      setDownloadError((e as Error).message || 'Download fehlgeschlagen');
    }
  };

  const activity = useMemo(() => {
    if (!caseQuery.data) return [];
    const { events, correspondence } = caseQuery.data;
    const items = [
      ...events.map((e) => ({
        id: e.id,
        at: e.createdAt ?? '',
        title: `${EVENT_LABELS[e.event] ?? e.event}${
          e.channel
            ? ` (${CHANNEL_LABELS[e.channel as LawFirmSubmissionChannel] ?? e.channel})`
            : ''
        }${e.date ? ` am ${formatDate(e.date)}` : ''}`,
        body: e.note,
        icon:
          e.event === 'correspondence_uploaded'
            ? Inbox
            : e.event === 'submitted'
              ? Send
              : Clock,
      })),
      ...correspondence
        .filter((c) => c.direction !== 'provider_in')
        .map((c) => ({
          id: `c-${c.id}`,
          at: c.createdAt ?? '',
          title:
            c.direction === 'package_out'
              ? 'Anschreiben-Paket von CompanyPension erstellt'
              : c.direction === 'copy_out'
                ? 'Kopie für die Gegenseite erstellt'
                : 'Notiz',
          body: c.note,
          icon: FileText,
        })),
    ];
    return items.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [caseQuery.data]);

  if (caseQuery.isLoading) return <Spinner full />;
  if (caseQuery.error || !caseQuery.data) {
    return (
      <PageHeader
        title="Akte nicht verfügbar"
        back={{ href: '/portal', label: 'Akten' }}
      />
    );
  }

  const { claim, correspondence } = caseQuery.data;
  const { claimant, bav } = claim;
  const state = claim.caseState;
  const isClosed = state === 'closed';
  const incoming = correspondence.filter((c) => c.direction === 'provider_in');

  const startEvent = (event: LawFirmCaseEvent) =>
    setEventForm({ event, date: todayIso(), channel: 'post', note: '' });
  const scrollToUpload = () =>
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // The one thing to do next, by stage.
  let next: { text: string; action: React.ReactNode } | null = null;
  if (isClosed) {
    next = null;
  } else if (!claim.lawFirmRef) {
    next = {
      text: 'Tragen Sie Ihr Aktenzeichen ein. Das Anschreiben wird damit neu erstellt („Unser Zeichen“).',
      action: (
        <Button
          variant="primary"
          onClick={() => {
            setRefValue('');
            setRefEditing(true);
          }}
        >
          <Pencil className="h-4 w-4" />
          Aktenzeichen eintragen
        </Button>
      ),
    };
  } else if (state === 'new') {
    next = {
      text: claim.packageReady
        ? 'Laden Sie das Paket herunter: unterschriftsreifes Anschreiben, Vollmacht und Anlagen.'
        : 'Das Paket wird von CompanyPension noch erstellt.',
      action: claim.packageReady ? (
        <Button
          variant="primary"
          onClick={() => open(() => getFirmDownload(id, 'package'))}
        >
          <Download className="h-4 w-4" />
          Paket herunterladen
        </Button>
      ) : null,
    };
  } else if (state === 'downloaded') {
    next = {
      text: 'Sobald das Schreiben beim Versorgungsträger ist, erfassen Sie Datum und Versandweg.',
      action: (
        <Button variant="primary" onClick={() => startEvent('submitted')}>
          <Send className="h-4 w-4" />
          Einreichung erfassen
        </Button>
      ),
    };
  } else if (state === 'submitted') {
    next = {
      text: 'Wenn die Antwort des Versorgungsträgers eingeht, laden Sie den Scan hoch und erfassen den Eingang.',
      action: (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={scrollToUpload}>
            <Upload className="h-4 w-4" />
            Antwort hochladen
          </Button>
          <Button onClick={() => startEvent('response_received')}>
            Eingang erfassen
          </Button>
        </div>
      ),
    };
  } else if (state === 'response_received') {
    next = {
      text: 'Weitere Antworten können Sie hochladen. Ist die Sache erledigt, schließen Sie die Akte.',
      action: (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={scrollToUpload}>
            <Upload className="h-4 w-4" />
            Weitere Antwort hochladen
          </Button>
          <Button onClick={() => startEvent('closed')}>Akte schließen</Button>
        </div>
      ),
    };
  }

  return (
    <div>
      <PageHeader
        back={{ href: '/portal', label: 'Akten' }}
        title={claimant.name ?? 'Mandant'}
        subtitle={
          <>
            {bav.route ? `Weg ${bav.route} · ` : ''}
            {claim.lawFirmRef ? `Unser Zeichen ${claim.lawFirmRef} · ` : ''}
            übergeben {formatDate(claim.assignedAt)}
            {claim.payoutTarget === 'law_firm'
              ? ' · Auszahlung auf Anderkonto'
              : ''}
          </>
        }
        actions={
          !isClosed && !refEditing && claim.lawFirmRef ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRefValue(claim.lawFirmRef ?? '');
                setRefEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Aktenzeichen ändern
            </Button>
          ) : null
        }
      />

      <div className="mb-4">
        <Stepper steps={CASE_STAGES} current={state} />
      </div>

      {refEditing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (refValue.trim()) refMutation.mutate(refValue.trim());
          }}
          className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="min-w-[220px] flex-1">
            <Field label="Unser Zeichen" htmlFor="ref-input">
              <input
                id="ref-input"
                value={refValue}
                onChange={(e) => setRefValue(e.target.value)}
                maxLength={100}
                placeholder="z. B. 2026/0815-KC"
                className={inputClass}
                autoFocus
              />
            </Field>
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={refMutation.isPending || !refValue.trim()}
          >
            {refMutation.isPending
              ? 'Speichern…'
              : 'Speichern und Anschreiben neu erstellen'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRefEditing(false)}
          >
            Abbrechen
          </Button>
          {refMutation.isError && (
            <div className="w-full">
              <ErrorText
                error={refMutation.error}
                fallback="Konnte nicht gespeichert werden"
              />
            </div>
          )}
        </form>
      )}

      {next && !refEditing && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-brand-accent bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-800">
            <span className="font-medium text-brand-dark">
              Nächster Schritt:
            </span>{' '}
            {next.text}
          </p>
          {next.action}
        </div>
      )}
      {isClosed && (
        <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600">
          Diese Akte ist abgeschlossen
          {claim.closedAt ? ` (${formatDate(claim.closedAt)})` : ''}. Änderungen
          sind nicht mehr möglich.
        </div>
      )}

      {eventForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            eventMutation.mutate(eventForm);
          }}
          className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-brand-dark">
            {EVENT_LABELS[eventForm.event]}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Datum" htmlFor="event-date">
              <input
                id="event-date"
                type="date"
                value={eventForm.date}
                max={todayIso()}
                onChange={(e) =>
                  setEventForm({ ...eventForm, date: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            {eventForm.event === 'submitted' && (
              <Field label="Versandweg" htmlFor="event-channel">
                <select
                  id="event-channel"
                  value={eventForm.channel}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      channel: e.target.value as LawFirmSubmissionChannel,
                    })
                  }
                  className={inputClass}
                >
                  {(
                    Object.keys(CHANNEL_LABELS) as LawFirmSubmissionChannel[]
                  ).map((k) => (
                    <option key={k} value={k}>
                      {CHANNEL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <Field
            label="Hinweis an CompanyPension (optional)"
            htmlFor="event-note"
          >
            <textarea
              id="event-note"
              value={eventForm.note}
              onChange={(e) =>
                setEventForm({ ...eventForm, note: e.target.value })
              }
              rows={2}
              maxLength={1000}
              className={inputClass}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={eventMutation.isPending}
            >
              {eventMutation.isPending ? 'Speichern…' : 'Erfassen'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEventForm(null)}
            >
              Abbrechen
            </Button>
          </div>
          {eventMutation.isError && (
            <ErrorText
              error={eventMutation.error}
              fallback="Konnte nicht erfasst werden"
            />
          )}
        </form>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <Fact label="Mandant" value={claimant.name} />
              <Fact
                label="Geburtsdatum"
                value={formatDate(claimant.dateOfBirth)}
              />
              <Fact
                label="Weg"
                value={
                  bav.route === 'A'
                    ? 'A · DRV-Erstattung liegt vor (§ 3 Abs. 3 BetrAVG)'
                    : bav.route === 'B'
                      ? 'B · Kleinstanwartschaft (§ 3 Abs. 2 BetrAVG)'
                      : null
                }
              />
              <Fact label="Arbeitgeber" value={bav.employerName} />
              <Fact label="Versorgungsträger" value={bav.providerName} />
              <Fact label="Durchführungsweg" value={bav.durchfuehrungsweg} />
              <Fact
                label={bav.contractReferenceLabel || 'Vertragsnummer'}
                value={bav.contractReference}
              />
              <Fact
                label="Auszahlung"
                value={
                  claim.payoutTarget === 'law_firm'
                    ? 'Anderkonto der Kanzlei'
                    : 'Konto des Mandanten'
                }
              />
              <Fact
                label="Unser Zeichen"
                value={claim.lawFirmRef ?? 'noch nicht eingetragen'}
              />
            </dl>
          </div>

          <section ref={uploadRef}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Schreiben des Versorgungsträgers
            </h2>
            {!isClosed && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (uploadFile) uploadMutation.mutate(uploadFile);
                }}
                className="mb-3 rounded-lg border border-dashed border-gray-300 bg-white p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setUploadFile(f);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                  <Field
                    label="Scan oder weitergeleitete E-Mail (PDF, JPG, PNG, max. 10 MB)"
                    htmlFor="upload-file"
                  >
                    <input
                      id="upload-file"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        setUploadFile(e.target.files?.[0] ?? null)
                      }
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
                    />
                    {uploadFile && (
                      <span className="mt-1 block text-xs text-gray-500">
                        {uploadFile.name} · {formatBytes(uploadFile.size)}
                      </span>
                    )}
                  </Field>
                  <Field label="Eingang am" htmlFor="upload-date">
                    <input
                      id="upload-date"
                      type="date"
                      value={uploadDate}
                      max={todayIso()}
                      onChange={(e) => setUploadDate(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field
                    label="Kurze Notiz: Was teilt der Versorgungsträger mit?"
                    htmlFor="upload-note"
                  >
                    <textarea
                      id="upload-note"
                      value={uploadNote}
                      onChange={(e) => setUploadNote(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!uploadFile || uploadMutation.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadMutation.isPending
                      ? 'Wird hochgeladen…'
                      : 'Hochladen'}
                  </Button>
                  <span className="text-xs text-gray-400">
                    CompanyPension wird per E-Mail informiert.
                  </span>
                </div>
                {uploadMutation.isError && (
                  <div className="mt-2">
                    <ErrorText
                      error={uploadMutation.error}
                      fallback="Upload fehlgeschlagen"
                    />
                  </div>
                )}
              </form>
            )}
            {incoming.length === 0 ? (
              <p className="text-sm text-gray-400">
                Noch kein Schreiben hochgeladen.
              </p>
            ) : (
              <Table minWidth={560}>
                <TableHead>
                  <Th>Datei</Th>
                  <Th>Eingang</Th>
                  <Th>Hochgeladen</Th>
                  <Th align="right"></Th>
                </TableHead>
                <TableBody>
                  {incoming.map((c) => (
                    <tr key={c.id}>
                      <Td nowrap={false}>
                        <div className="text-gray-900">
                          {c.document?.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.document ? formatBytes(c.document.fileSize) : ''}
                          {c.note ? ` · ${c.note}` : ''}
                        </div>
                      </Td>
                      <Td className="tabular-nums text-gray-600">
                        {formatDate(c.receivedDate)}
                      </Td>
                      <Td className="tabular-nums text-gray-600">
                        {formatDate(c.createdAt, true)}
                      </Td>
                      <Td align="right">
                        {c.document && (
                          <button
                            className="text-gray-500 hover:text-brand-dark"
                            onClick={() =>
                              open(() =>
                                getFirmCorrespondenceDownload(id, c.id)
                              )
                            }
                            aria-label="Herunterladen"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Verlauf
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-gray-400">Noch keine Einträge.</p>
            ) : (
              <ol className="relative border-l border-gray-200 pl-5">
                {activity.map((item) => (
                  <li key={item.id} className="relative mb-4">
                    <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
                      <item.icon className="h-2.5 w-2.5" />
                    </span>
                    <p className="text-sm text-gray-900">{item.title}</p>
                    {item.body && (
                      <p className="mt-0.5 text-sm text-gray-600">
                        {item.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDate(item.at, true)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Downloads
            </h3>
            {claim.packageReady ? (
              <div className="mt-2 space-y-2">
                <Button
                  className="w-full justify-center"
                  variant={
                    state === 'new' && claim.lawFirmRef
                      ? 'primary'
                      : 'secondary'
                  }
                  onClick={() => open(() => getFirmDownload(id, 'package'))}
                >
                  <Download className="h-4 w-4" />
                  Anschreiben-Paket (PDF)
                </Button>
                {claim.copyReady && (
                  <Button
                    className="w-full justify-center"
                    onClick={() => open(() => getFirmDownload(id, 'copy'))}
                  >
                    <Download className="h-4 w-4" />
                    Kopie für die Gegenseite
                  </Button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Das Paket wird von CompanyPension noch erstellt.
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Links sind 15 Minuten gültig. Das Paket enthält das Anschreiben,
              die Vollmacht des Mandanten und die Anlagen; Ihre Kanzlei druckt,
              unterschreibt und versendet.
              {claim.downloadedAt
                ? ` Erstmals heruntergeladen ${formatDate(claim.downloadedAt, true)}.`
                : ''}
            </p>
            {downloadError && (
              <p className="mt-2 text-xs text-red-700">{downloadError}</p>
            )}
          </div>

          {bav.recipient.name && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Empfänger des Schreibens
              </h3>
              <p className="mt-2 text-sm text-gray-900">{bav.recipient.name}</p>
              {bav.recipient.department && (
                <p className="text-sm text-gray-700">
                  {bav.recipient.department}
                </p>
              )}
              <p className="text-sm text-gray-700">{bav.recipient.street}</p>
              <p className="text-sm text-gray-700">
                {[bav.recipient.postalCode, bav.recipient.city]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              {bav.recipient.ref && (
                <p className="mt-1 text-xs text-gray-500">
                  Ihr Zeichen: {bav.recipient.ref}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {bav.addresseeType === 'employer'
                  ? 'Arbeitgeber'
                  : 'Versorgungsträger'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <FactGroup title="Mandant">
              <Fact
                label="Anrede"
                value={
                  claimant.salutation === 'herr'
                    ? 'Herr'
                    : claimant.salutation === 'frau'
                      ? 'Frau'
                      : null
                }
              />
              <Fact label="Staatsangehörigkeit" value={claimant.nationality} />
              <Fact label="E-Mail" value={claimant.email} wide />
              <Fact
                label="Anschrift"
                value={
                  [
                    claimant.address.line1,
                    claimant.address.line2,
                    [claimant.address.postalCode, claimant.address.city]
                      .filter(Boolean)
                      .join(' '),
                    claimant.address.country,
                  ]
                    .filter(Boolean)
                    .join(', ') || null
                }
                wide
              />
              <Fact
                label="Letzte Anschrift in Deutschland"
                value={
                  [
                    claimant.germanAddress.street,
                    [
                      claimant.germanAddress.postalCode,
                      claimant.germanAddress.city,
                    ]
                      .filter(Boolean)
                      .join(' '),
                  ]
                    .filter(Boolean)
                    .join(', ') || null
                }
                wide
              />
              <Fact
                label="Wegzug"
                value={formatDate(claimant.germanAddress.moveOutDate)}
              />
              <Fact label="Steuer-ID" value={claimant.taxId} />
              <Fact
                label="Kontoinhaber"
                value={claimant.accountHolderName}
                wide
              />
              <Fact label="IBAN" value={claimant.ibanMasked} />
            </FactGroup>
            {(bav.route === 'A' || bav.route === 'B') && (
              <FactGroup
                title={bav.route === 'A' ? 'DRV-Erstattung' : 'Standmitteilung'}
              >
                {bav.route === 'A' ? (
                  <>
                    <Fact
                      label="Rentenversicherungsträger"
                      value={bav.drvOffice}
                      wide
                    />
                    <Fact
                      label="Bescheid vom"
                      value={formatDate(bav.drvDecisionDate)}
                    />
                  </>
                ) : (
                  <>
                    <Fact label="Dokument" value={bav.statementType} />
                    <Fact label="Stand" value={formatDate(bav.statementDate)} />
                    <Fact
                      label="Leistung"
                      value={
                        bav.benefitAmount
                          ? `€${bav.benefitAmount} (${bav.benefitForm === 'pension' ? 'Rente' : bav.benefitForm === 'capital' ? 'Kapital' : 'unbekannt'})`
                          : null
                      }
                    />
                  </>
                )}
                <Fact
                  label="Beschäftigungsende"
                  value={formatDate(bav.employmentEndDate)}
                />
              </FactGroup>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
