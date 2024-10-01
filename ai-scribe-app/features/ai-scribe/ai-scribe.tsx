"use client";

import { useEffect, useRef, useState } from "react";

import shortUUID from "short-uuid";

import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import { Tab, Tabs } from "@nextui-org/tabs";

import { WaitMessageSpinner } from "@/core-ui/wait-message-spinner";
import { DraftNote } from "@/services/note-generation/draft-note";
import { useNoteGenerator } from "@/services/note-generation/use-note-generator";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { useTranscriber } from "@/services/transcription/use-transcriber";
import { httpAction } from "@/services/web-api/base-queries";
import { ApplicationError } from "@/utility/errors";
import { sortNotesByDate } from "@/utility/sorters";

import { Encounter } from "@/features/encounters/encounter";
import { useActiveEncounter } from "@/features/encounters/use-active-encounter";
import { useEncounters } from "@/features/encounters/use-encounters";
import { useDefaultNoteType } from "@/features/note-types/use-default-note-type";

import { AIScribeControls } from "./ai-scribe-controls";
import { AudioPlayerRecorder } from "./audio-player-recorder";

export const AIScribe = () => {
  const { accessToken } = useAccessToken();
  const currentId = useRef<string>();

  const defaultNoteType = useDefaultNoteType();
  const encounters = useEncounters();
  const activeEncounter = useActiveEncounter();

  useEffect(() => {
    if (!selectedNoteType) {
      setSelectedNoteType(defaultNoteType.state);
    }
  }, [defaultNoteType.state]);

  const [selectedNoteType, setSelectedNoteType] = useState(
    defaultNoteType.state,
  );
  const [audio, setAudio] = useState<string | File>();
  const [transcript, setTranscript] = useState<string>();
  const [notes, setNotes] = useState<DraftNote[]>([]);
  const [activeTab, setActiveTab] = useState<string>("transcript");

  type AIScribeError = {
    name: string;
    content: ApplicationError;
    canDismiss: boolean;
    retry: () => void;
  };
  const [error, setError] = useState<AIScribeError>();
  const suppressNextError = useRef(false);

  const transcriber = useTranscriber({
    onTranscribing: () => setError(undefined),
    onTranscript: (transcript) => handleTranscription(transcript),
    onError: (error, retry) =>
      handleError("Error: Transcription", error, false, retry),
  });

  const noteGenerator = useNoteGenerator({
    onGenerating: () => setError(undefined),
    onGenerated: (draftNote) => handleNoteGenerated(draftNote),
    onError: (error, retry) =>
      handleError("Error: Note Generation", error, true, retry),
  });

  const handleTranscription = (transcript: string) => {
    activeEncounter.state!.recording.transcript = transcript;
    setTranscript(transcript);
    setActiveTab("transcript");

    saveTranscriptToDb(activeEncounter.state!, transcript);
  };

  const handleNoteGenerated = (draftNote: DraftNote) => {
    const newNotes = [
      draftNote,
      ...notes.filter(
        (n) => n.noteDefinitionUuid !== draftNote.noteDefinitionUuid,
      ),
    ];

    activeEncounter.state!.draftNotes = newNotes;
    setNotes(newNotes);
    setActiveTab(draftNote.tag!);

    saveDraftNoteToDb(activeEncounter.state!, draftNote);
  };

  const handleError = (
    name: string,
    error: ApplicationError,
    canDismiss: boolean,
    retry: () => void,
  ) => {
    if (!suppressNextError.current) {
      setError({
        name: name,
        content: error,
        canDismiss: canDismiss,
        retry: retry,
      });
      setActiveTab("error");
    } else {
      suppressNextError.current = false;
    }
  };

  const reset = () => {
    setError(undefined);

    if (transcriber.isTranscribing || noteGenerator.generatingNoteType) {
      suppressNextError.current = true;
      transcriber.abort();
      noteGenerator.abort();
    }

    setAudio(undefined);
    setTranscript(undefined);
    setNotes([]);

    setSelectedNoteType(defaultNoteType.state);
    setActiveTab("transcript");

    currentId.current = undefined;
    activeEncounter.set(null);
  };

  useEffect(() => {
    const id =
      activeEncounter.state?.newId ?? activeEncounter.state?.uuid ?? undefined;

    if (!activeEncounter.state) {
      reset();
    } else if (!currentId.current || currentId.current !== id) {
      currentId.current = id;

      setError(undefined);

      if (transcriber.isTranscribing || noteGenerator.generatingNoteType) {
        suppressNextError.current = true;
        transcriber.abort();
        noteGenerator.abort();
      }

      setAudio(
        activeEncounter.state.recording.audio ??
          `/api/encounters/recording-files/${activeEncounter.state.recording.filename}`,
      );
      setTranscript(activeEncounter.state.recording.transcript);
      setNotes([...activeEncounter.state.draftNotes].sort(sortNotesByDate));

      if (activeEncounter.state.draftNotes.length > 0) {
        const selected =
          activeEncounter.state.draftNotes.sort(sortNotesByDate)[0];

        setActiveTab(selected.tag ?? selected.uuid ?? "transcript");
      } else {
        setActiveTab("transcript");
      }
    }
  }, [activeEncounter.state]);

  useEffect(() => {
    if (audio && !transcript) {
      transcriber.transcribe(audio);
    }
  }, [audio]);

  useEffect(() => {
    if (transcript && selectedNoteType && notes.length === 0) {
      noteGenerator.generateNote(selectedNoteType, transcript);
    }
  }, [transcript]);

  const createEncounter = (audio: File): Encounter => {
    const encounter: Encounter = {
      newId: shortUUID.generate(),
      createdAt: new Date(),
      recording: {
        audio: audio,
        filename: audio.name,
        mediaType: audio.type,
      },
      draftNotes: [],
      isUnsaved: true,
    };

    return encounter;
  };

  const handleAudioFileGenerated = (audio: File) => {
    const encounter = createEncounter(audio);

    encounters.set([encounter, ...encounters.state]);
    saveEncounterToDb(encounter, audio);

    currentId.current = encounter.newId;
    activeEncounter.set(encounter);
    setAudio(audio);
  };

  const handleAudioFileRecovered = (audio: File) => {
    const encounter = createEncounter(audio);

    encounters.set([encounter, ...encounters.state]);
    saveEncounterToDb(encounter, audio);
  };

  const saveEncounterToDb = async (encounter: Encounter, audio: File) => {
    if (encounter.isUnsaved) {
      const formData = new FormData();

      formData.append("audio", audio, audio.name);
      formData.append("createdAt", new Date(encounter.createdAt).toISOString());

      try {
        const savedEncounter = await httpAction<Encounter>(
          "POST",
          "/api/encounters",
          {
            accessToken: accessToken,
            data: formData,
          },
        );

        savedEncounter.newId = encounter.newId;
        encounter.uuid = savedEncounter.uuid;
        encounter.recording.audio = undefined;
        encounters.set([
          savedEncounter,
          ...encounters.state.filter((e) => e.newId !== encounter.newId),
        ]);
      } catch (e: unknown) {
        setTimeout(() => saveEncounterToDb(encounter, audio), 3000);

        return;
      }
    }
  };

  const saveTranscriptToDb = async (
    encounter: Encounter,
    transcript: string,
    retry: number = 0,
  ) => {
    if (encounter.uuid) {
      try {
        void (await httpAction<Encounter>(
          "PATCH",
          `/api/encounters/${encounter.uuid}`,
          {
            accessToken: accessToken,
            data: { transcript: transcript },
          },
        ));
      } catch {
        setTimeout(
          () => saveTranscriptToDb(encounter, transcript, retry + 1),
          (retry + 1) * 3000,
        );
      }
    } else {
      // Wait for encounter to be saved.
      setTimeout(() => saveTranscriptToDb(encounter, transcript), 1000);
    }
  };

  const saveDraftNoteToDb = async (
    encounter: Encounter,
    note: DraftNote,
    retry: number = 0,
  ) => {
    if (encounter.uuid) {
      try {
        const savedNote = await httpAction<Encounter>(
          "POST",
          `/api/encounters/${encounter.uuid}/draft-notes`,
          {
            accessToken: accessToken,
            data: {
              noteDefinitionUuid: note.noteDefinitionUuid,
              noteText: note.text,
              noteTag: note.tag,
            },
          },
        );

        if (notes.find((n) => n.tag == note.tag)) {
          const updatedNotes = [...notes];

          updatedNotes.find((n) => n.tag == note.tag)!.uuid = savedNote.uuid;
          setNotes(updatedNotes);
        }
      } catch {
        setTimeout(
          () => saveDraftNoteToDb(encounter, note, retry + 1),
          (retry + 1) * 3000,
        );
      }
    } else {
      // Wait for encounter to be saved.
      setTimeout(() => saveDraftNoteToDb(encounter, note), 1000);
    }
  };

  const copyOutput = async (output: string) => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AudioPlayerRecorder
        audio={audio ?? null}
        onAudioFile={handleAudioFileGenerated}
        onRecoverRecording={handleAudioFileRecovered}
        onReset={reset}
      />
      <div className="flex flex-col gap-6">
        <Divider className="bg-zinc-100 dark:bg-zinc-900" />
        <AIScribeControls
          isDisabled={
            !!transcript &&
            !!selectedNoteType &&
            !transcriber.isTranscribing &&
            !noteGenerator.generatingNoteType
          }
          selectedNoteType={selectedNoteType ?? undefined}
          onNoteTypeChanged={(noteType) =>
            setSelectedNoteType(noteType ?? null)
          }
          onSubmit={() =>
            noteGenerator.generateNote(selectedNoteType!, transcript!)
          }
        />
        {transcriber.isTranscribing && (
          <WaitMessageSpinner onCancel={transcriber.abort}>
            Transcribing Audio
          </WaitMessageSpinner>
        )}
        {noteGenerator.generatingNoteType && (
          <WaitMessageSpinner onCancel={noteGenerator.abort}>
            Generating Note: {noteGenerator.generatingNoteType.title}
          </WaitMessageSpinner>
        )}
        {(transcript || error || notes.length > 0) && (
          <div className="flex w-full max-w-2xl flex-col">
            <Tabs
              aria-label="AI Scribe Output"
              selectedKey={activeTab}
              variant="solid"
              onSelectionChange={(key) => setActiveTab(key.toString())}
            >
              {error && (
                <Tab
                  key="error"
                  className="text-red-500"
                  title={`${error.name}`}
                >
                  <Card radius="sm" shadow="sm">
                    <CardHeader className="flex flex-row gap-2 items-center">
                      <p className="text-lg font-semibold text-red-500 grow">
                        {error.content.name}
                      </p>
                      <Button color="default" size="sm" onClick={error.retry}>
                        Retry
                      </Button>
                      {error.canDismiss && (
                        <Button
                          color="default"
                          size="sm"
                          onClick={() => setError(undefined)}
                        >
                          Dismiss
                        </Button>
                      )}
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <p className="text-left max-w-2xl whitespace-pre-wrap">
                        {error.content.message}
                      </p>
                    </CardBody>
                  </Card>
                </Tab>
              )}
              {notes.toSorted(sortNotesByDate).map((note) => (
                <Tab key={note.tag} title={note.title}>
                  <Card radius="sm" shadow="sm">
                    <CardHeader className="flex flex-row gap-2 justify-between items-end">
                      <Button
                        className="ms-auto"
                        color="default"
                        size="sm"
                        onClick={() => copyOutput(note.text)}
                      >
                        Copy
                      </Button>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <ScrollShadow className="max-h-[500px]">
                        <p className="text-left max-w-2xl whitespace-pre-wrap">
                          {note.text}
                        </p>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                </Tab>
              ))}
              {transcript && (
                <Tab key="transcript" title="Transcript">
                  <Card radius="sm" shadow="sm">
                    <CardHeader className="flex flex-row gap-2 justify-between items-center">
                      <Button
                        className="ms-auto"
                        color="default"
                        size="sm"
                        onClick={() => copyOutput(transcript!)}
                      >
                        Copy
                      </Button>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <ScrollShadow className="max-h-[600px]">
                        <p className="text-left max-w-2xl whitespace-pre-wrap">
                          {transcript}
                        </p>
                      </ScrollShadow>
                    </CardBody>
                  </Card>
                </Tab>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};
